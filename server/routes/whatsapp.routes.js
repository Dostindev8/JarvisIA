const express = require('express');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const WhatsAppInbound = require('../models/WhatsAppInbound');
const WhatsAppService = require('../services/WhatsAppService');
const AuditLog = require('../models/AuditLog');
const { buildJarvisSystemPrompt } = require('../prompts/jarvisSystemPrompt');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

let broadcast = null;
function setWhatsAppEmitter(fn) {
  broadcast = fn;
}

function emit(userId, event, data) {
  if (broadcast && userId) broadcast(userId.toString(), event, data);
}

function serialize(doc) {
  return {
    id: doc._id,
    phone: doc.phone,
    phoneNormalized: doc.phoneNormalized,
    recipientName: doc.recipientName || null,
    inboundMessage: doc.inboundMessage || null,
    message: doc.message,
    status: doc.status,
    error: doc.error || null,
    createdAt: doc.createdAt,
    sentAt: doc.sentAt || null
  };
}

// Lista borradores pendientes (y opcionalmente historial reciente)
router.get('/outbox', requireAuth, async (req, res) => {
  try {
    const status = req.query.status || 'pending_confirmation';
    const filter = { userId: req.user._id };
    if (status !== 'all') filter.status = status;

    const items = await WhatsAppMessage.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({ success: true, data: items.map((i) => serialize({ ...i, _id: i._id })) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Editar el texto de un borrador antes de enviarlo
router.patch('/outbox/:id', requireAuth, async (req, res) => {
  try {
    const { message } = req.body;
    const clean = String(message || '').trim().slice(0, 4096);
    if (!clean) return res.status(400).json({ success: false, message: 'Mensaje requerido' });

    const draft = await WhatsAppMessage.findOne({
      _id: req.params.id,
      userId: req.user._id,
      status: 'pending_confirmation'
    });
    if (!draft) return res.status(404).json({ success: false, message: 'Borrador no encontrado' });

    draft.message = clean;
    await draft.save();
    res.json({ success: true, data: serialize(draft) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Confirmar y enviar
router.post('/outbox/:id/confirm', requireAuth, async (req, res) => {
  try {
    const draft = await WhatsAppMessage.findOne({
      _id: req.params.id,
      userId: req.user._id,
      status: 'pending_confirmation'
    });
    if (!draft) return res.status(404).json({ success: false, message: 'Borrador no encontrado o ya procesado' });

    // Permitir edición de último minuto en la confirmación
    if (req.body?.message) {
      const clean = String(req.body.message).trim().slice(0, 4096);
      if (clean) draft.message = clean;
    }

    try {
      const result = await WhatsAppService.send(draft.phoneNormalized, draft.message);
      draft.status = 'sent';
      draft.providerId = result.providerId || null;
      draft.sentAt = new Date();
      await draft.save();

      AuditLog.create({
        type: 'WHATSAPP_SENT',
        userId: req.user._id,
        requestId: req.requestId,
        toolName: 'send_whatsapp',
        toolInput: { phone: draft.phoneNormalized },
        success: true
      }).catch(() => {});

      emit(req.user._id, 'whatsapp:sent', serialize(draft));
      res.json({ success: true, data: serialize(draft), mock: result.mock || false });
    } catch (sendErr) {
      draft.status = 'failed';
      draft.error = sendErr.message;
      await draft.save();
      emit(req.user._id, 'whatsapp:failed', serialize(draft));
      res.status(502).json({ success: false, message: sendErr.message, data: serialize(draft) });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Cancelar un borrador
router.post('/outbox/:id/cancel', requireAuth, async (req, res) => {
  try {
    const draft = await WhatsAppMessage.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id, status: 'pending_confirmation' },
      { status: 'cancelled' },
      { new: true }
    );
    if (!draft) return res.status(404).json({ success: false, message: 'Borrador no encontrado' });
    emit(req.user._id, 'whatsapp:cancelled', serialize(draft));
    res.json({ success: true, data: serialize(draft) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Crear un borrador manualmente (sin pasar por JARVIS)
router.post('/outbox', requireAuth, async (req, res) => {
  try {
    const { phone, message, recipientName, clientId } = req.body;
    const phoneNormalized = WhatsAppService.normalizePhone(phone);
    if (!phoneNormalized) return res.status(400).json({ success: false, message: 'Número inválido' });
    const clean = String(message || '').trim().slice(0, 4096);
    if (!clean) return res.status(400).json({ success: false, message: 'Mensaje requerido' });

    const draft = await WhatsAppMessage.create({
      userId: req.user._id,
      clientId: clientId || undefined,
      phone,
      phoneNormalized,
      recipientName,
      message: clean,
      status: 'pending_confirmation',
      origin: 'manual'
    });
    emit(req.user._id, 'whatsapp:draft', serialize(draft));
    res.status(201).json({ success: true, data: serialize(draft) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── BANDEJA DE ENTRADA ──────────────────────────────────────────────────────

function serializeInbound(doc) {
  return {
    id: doc._id,
    from: doc.from,
    fromNormalized: WhatsAppService.normalizePhone(doc.from) || doc.from,
    name: doc.profileName || null,
    clientId: doc.clientId || null,
    text: doc.text || '',
    handled: !!doc.handled,
    receivedAt: doc.receivedAt
  };
}

// Genera una respuesta profesional con JARVIS (sin herramientas, solo texto).
// Degrada a plantilla editable si no hay API key.
async function generateReplyText(inbound) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const from = inbound.profileName || 'el cliente';
  if (!apiKey) {
    return `Hola${inbound.profileName ? ` ${inbound.profileName}` : ''}, gracias por tu mensaje. `
      + 'En breve te doy más detalles. — LCS';
  }
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
    max_tokens: 600,
    system: buildJarvisSystemPrompt([]),
    messages: [
      {
        role: 'user',
        content:
          `Redacta SOLO el texto de una respuesta profesional y cordial de WhatsApp para ${from}. `
          + 'Responde en español dominicano neutro, tono cercano y profesional, sin emojis excesivos, '
          + 'sin prefijos como "Respuesta:" ni comillas. Mensaje recibido del cliente:\n\n'
          + `"${String(inbound.text || '').slice(0, 1500)}"`
      }
    ]
  });
  const text = response.content.find((b) => b.type === 'text')?.text?.trim();
  return text || 'Gracias por tu mensaje, en breve te respondo con más detalle.';
}

// Lista mensajes entrantes (por defecto los no atendidos)
router.get('/inbound', requireAuth, async (req, res) => {
  try {
    const scope = req.query.scope || 'pending';
    const filter = {};
    if (scope === 'pending') filter.handled = false;

    const items = await WhatsAppInbound.find(filter)
      .sort({ receivedAt: -1 })
      .limit(50)
      .lean();

    res.json({ success: true, data: items.map(serializeInbound) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// JARVIS redacta una respuesta a un entrante → crea borrador pendiente de confirmación
router.post('/inbound/:id/draft', requireAuth, async (req, res) => {
  try {
    const inbound = await WhatsAppInbound.findById(req.params.id);
    if (!inbound) return res.status(404).json({ success: false, message: 'Mensaje no encontrado' });

    const phoneNormalized = WhatsAppService.normalizePhone(inbound.from);
    if (!phoneNormalized) {
      return res.status(400).json({ success: false, message: 'Número entrante inválido' });
    }

    const replyText = await generateReplyText(inbound);

    const draft = await WhatsAppMessage.create({
      userId: req.user._id,
      clientId: inbound.clientId || undefined,
      phone: inbound.from,
      phoneNormalized,
      recipientName: inbound.profileName || undefined,
      inboundMessage: inbound.text,
      message: replyText,
      status: 'pending_confirmation',
      origin: 'jarvis'
    });

    inbound.handled = true;
    await inbound.save();

    emit(req.user._id, 'whatsapp:draft', serialize(draft));
    res.status(201).json({ success: true, data: serialize(draft), inboundId: inbound._id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Marcar un entrante como atendido (sin responder)
router.post('/inbound/:id/dismiss', requireAuth, async (req, res) => {
  try {
    const inbound = await WhatsAppInbound.findByIdAndUpdate(
      req.params.id,
      { handled: true },
      { new: true }
    );
    if (!inbound) return res.status(404).json({ success: false, message: 'Mensaje no encontrado' });
    res.json({ success: true, data: serializeInbound(inbound) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
module.exports.setWhatsAppEmitter = setWhatsAppEmitter;
