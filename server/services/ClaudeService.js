const Anthropic = require('@anthropic-ai/sdk');
const JarvisMemory = require('../models/JarvisMemory');
const { JARVIS_TOOLS, executeJarvisTool } = require('../tools/jarvisTools');
const { buildJarvisSystemPrompt } = require('../prompts/jarvisSystemPrompt');

const MAX_TOOL_ROUNDS = 12;

function sanitizeMessages(messages) {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role,
      content: String(m.content || '').slice(0, 8000)
    }));
}

async function loadMemories(userId) {
  const filter = userId ? { $or: [{ userId }, { userId: { $exists: false } }] } : {};
  return JarvisMemory.find(filter)
    .sort({ importance: -1, lastUsedAt: -1 })
    .limit(10)
    .lean();
}

async function chat({ messages, userId, conversationId }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      text: 'JARVIS está en modo básico. Configura ANTHROPIC_API_KEY en server/.env para activar DostinX8 Supreme con razonamiento completo, internet y tools.',
      toolsUsed: [],
      degraded: true
    };
  }

  const client = new Anthropic({ apiKey });
  const memories = await loadMemories(userId);
  const systemWithMemory = buildJarvisSystemPrompt(memories);
  let currentMessages = sanitizeMessages(messages);
  const toolsUsed = [];
  let rounds = 0;

  try {
    while (rounds < MAX_TOOL_ROUNDS) {
      rounds += 1;

      const response = await client.messages.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemWithMemory,
        messages: currentMessages,
        tools: JARVIS_TOOLS
      });

      if (response.stop_reason === 'tool_use') {
        const toolBlocks = response.content.filter((b) => b.type === 'tool_use');
        const assistantContent = response.content;

        currentMessages.push({ role: 'assistant', content: assistantContent });

        const toolResults = [];
        for (const block of toolBlocks) {
          toolsUsed.push({ name: block.name, input: block.input });
          const result = await executeJarvisTool(block.name, block.input, {
            userId,
            conversationId
          });
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result)
          });
        }

        currentMessages.push({ role: 'user', content: toolResults });
        continue;
      }

      const textBlock = response.content.find((b) => b.type === 'text');
      const text = textBlock?.text || 'Listo, jefe. ¿En qué más te asisto?';

      return { text, toolsUsed, degraded: false };
    }

    return {
      text: 'Ejecuté varias acciones. ¿Continuamos con algo más?',
      toolsUsed,
      degraded: false
    };
  } catch (err) {
    console.error('[ClaudeService]', err.message);
    return {
      text: 'JARVIS tuvo un fallo temporal. Intenta de nuevo en un momento.',
      toolsUsed,
      degraded: true,
      error: err.message
    };
  }
}

module.exports = { chat, buildJarvisSystemPrompt };
