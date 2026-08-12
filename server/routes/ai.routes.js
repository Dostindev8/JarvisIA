const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const JarvisConversation = require('../models/JarvisConversation');
const JarvisMemory = require('../models/JarvisMemory');
const { requireAuth } = require('../middleware/auth');
const { sanitizeUserMessage } = require('../middleware/jarvisGuard.middleware');
const { chat } = require('../services/ClaudeService');
const { textToSpeech } = require('../services/ElevenLabsService');
const { transcribe } = require('../services/WhisperService');
const { getRedis } = require('../config/redis');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

let emitJarvisResponse = null;
let emitJarvisState = null;

function setJarvisEmitters({ response, state }) {
  emitJarvisResponse = response;
  emitJarvisState = state;
}

function createLimiter(max, windowMs = 60 * 1000) {
  const redis = getRedis();
  const config = {
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?._id?.toString() || req.ip
  };

  if (redis) {
    config.store = new RedisStore({
      sendCommand: (...args) => redis.call(...args)
    });
  }

  return rateLimit(config);
}

const chatLimiter = createLimiter(30);
const ttsLimiter = createLimiter(20);

/** Capacidades activas — el cerebro ya no depende de Claude */
router.get('/capabilities', requireAuth, (_req, res) => {
  const { activeProvider, providerChain } = require('../services/LLMService');
  const { getConnectivityStatus } = require('../services/connectivity');
  const provider = activeProvider();
  res.json({
    success: true,
    data: {
      provider,
      chain: providerChain(),
      connectivity: getConnectivityStatus(),
      claude: Boolean(process.env.ANTHROPIC_API_KEY),
      openai: Boolean(process.env.OPENAI_API_KEY),
      gemini: Boolean(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY),
      groq: Boolean(process.env.GROQ_API_KEY),
      elevenLabs: Boolean(process.env.ELEVENLABS_API_KEY),
      whisper: Boolean(process.env.OPENAI_API_KEY),
      localAgent: true,
      tasks: true,
      postResponseMenu: true,
      defaultVoiceId: process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB'
    }
  });
});

async function getOrCreateConversation(userId, conversationId) {
  if (conversationId) {
    const existing = await JarvisConversation.findOne({ _id: conversationId, userId });
    if (existing) return existing;
  }
  return JarvisConversation.create({ userId, messages: [] });
}

router.post('/chat', requireAuth, chatLimiter, async (req, res) => {
  try {
    const { chatBodySchema, parseOrThrow } = require('../validators/task.validators');
    let body;
    try {
      body = parseOrThrow(chatBodySchema, req.body);
    } catch (valErr) {
      return res.status(400).json({ success: false, message: valErr.message });
    }

    let cleanMessage;
    try {
      cleanMessage = sanitizeUserMessage(body.message);
    } catch (guardErr) {
      return res.status(400).json({ success: false, message: guardErr.message });
    }

    const userId = req.user._id;
    const conversation = await getOrCreateConversation(userId, body.conversationId);

    conversation.messages.push({ role: 'user', content: cleanMessage });
    emitJarvisState?.(userId.toString(), { state: 'thinking' });

    const history = conversation.messages.map((m) => ({
      role: m.role === 'tool' ? 'user' : m.role,
      content: m.content
    }));

    const result = await chat({
      messages: history,
      userId,
      conversationId: conversation._id
    });

    conversation.messages.push({
      role: 'assistant',
      content: result.text,
      toolCalls: result.toolsUsed
    });
    await conversation.save();

    emitJarvisState?.(userId.toString(), { state: 'speaking' });
    emitJarvisResponse?.(userId.toString(), {
      text: result.text,
      speak: Boolean(body.audioMode),
      toolsUsed: result.toolsUsed,
      provider: result.provider,
      menu: true
    });

    res.json({
      success: true,
      data: {
        reply: result.text,
        conversationId: conversation._id,
        speak: Boolean(body.audioMode),
        toolsUsed: result.toolsUsed,
        degraded: result.degraded || false,
        provider: result.provider || null,
        menu: true
      }
    });
  } catch (err) {
    console.error('[AI Chat]', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/tts', requireAuth, ttsLimiter, async (req, res) => {
  try {
    const { text, voiceId } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({ success: false, message: 'Texto requerido' });
    }

    const stream = await textToSpeech(text, voiceId);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');

    const reader = stream.body.getReader();
    const pump = async () => {
      const { done, value } = await reader.read();
      if (done) {
        res.end();
        return;
      }
      res.write(Buffer.from(value));
      await pump();
    };
    await pump();
  } catch (err) {
    res.status(503).json({ success: false, message: err.message });
  }
});

router.post('/stt', requireAuth, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Archivo de audio requerido' });
    }
    const transcript = await transcribe(req.file.buffer, req.file.originalname);
    res.json({ success: true, data: { transcript } });
  } catch (err) {
    res.status(503).json({ success: false, message: err.message });
  }
});

router.get('/memories', requireAuth, async (req, res) => {
  try {
    const memories = await JarvisMemory.find({
      $or: [{ userId: req.user._id }, { userId: { $exists: false } }]
    })
      .sort({ importance: -1, lastUsedAt: -1 })
      .limit(50);
    res.json({ success: true, data: memories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/memories', requireAuth, async (req, res) => {
  try {
    const memory = await JarvisMemory.create({ ...req.body, userId: req.user._id });
    res.status(201).json({ success: true, data: memory });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/memories/:id', requireAuth, async (req, res) => {
  try {
    const memory = await JarvisMemory.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true }
    );
    if (!memory) return res.status(404).json({ success: false, message: 'Memoria no encontrada' });
    res.json({ success: true, data: memory });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/memories/:id', requireAuth, async (req, res) => {
  try {
    await JarvisMemory.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true, message: 'Memoria eliminada' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/memories', requireAuth, async (req, res) => {
  try {
    await JarvisMemory.deleteMany({ userId: req.user._id });
    res.json({ success: true, message: 'Todas las memorias eliminadas' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
module.exports.setJarvisEmitters = setJarvisEmitters;
