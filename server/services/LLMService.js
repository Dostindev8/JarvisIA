const OpenAI = require('openai');
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

/** Convierte tools estilo Anthropic → OpenAI function tools */
function toOpenAITools() {
  return JARVIS_TOOLS.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema || { type: 'object', properties: {} }
    }
  }));
}

function activeProvider() {
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY) return 'gemini';
  return 'local';
}

/**
 * Motor local sin cloud LLM: entiende intenciones en español y ejecuta tools.
 * JARVISIA sigue útil (CRM, WhatsApp, web, música) sin Claude ni OpenAI.
 */
async function chatLocal({ messages, userId, conversationId }) {
  const last = [...messages].reverse().find((m) => m.role === 'user');
  const text = String(last?.content || '').trim();
  const lower = text.toLowerCase();
  const toolsUsed = [];
  const ctx = { userId, conversationId };

  const run = async (name, input = {}) => {
    toolsUsed.push({ name, input });
    return executeJarvisTool(name, input, ctx);
  };

  // Saludos
  if (/^(hola|buenas|hey|hello|qué tal|que tal|jarvis)/i.test(lower) && lower.length < 40) {
    return {
      text:
        'En línea, jefe. Soy JARVISIA — DostinX8 Supreme. Puedo gestionar CRM, cobros, cotizaciones, WhatsApp (con tu confirmación), buscar en internet y poner música. ¿En qué te ayudo?',
      toolsUsed,
      degraded: false,
      provider: 'local'
    };
  }

  if (/clientes|crm|leads|vencidos|activos/.test(lower)) {
    let status;
    if (/vencid/.test(lower)) status = 'VENCIDO';
    else if (/lead/.test(lower)) status = 'LEAD';
    else if (/riesgo/.test(lower)) status = 'EN_RIESGO';
    else if (/activ/.test(lower)) status = 'ACTIVO';
    const result = await run('get_clients', status ? { status } : {});
    const list = Array.isArray(result) ? result : result?.clients || result?.data || [];
    const lines = list.slice(0, 12).map(
      (c) => `• ${c.nombre || c.name || 'Cliente'} — ${c.status || c.estado || 'N/D'}`
    );
    return {
      text:
        lines.length > 0
          ? `Clientes${status ? ` (${status})` : ''}:\n${lines.join('\n')}`
          : `No encontré clientes${status ? ` en estado ${status}` : ''} en el CRM.`,
      toolsUsed,
      degraded: false,
      provider: 'local'
    };
  }

  if (/pagos|cobros|factur/.test(lower)) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const result = await run('get_payments', { month, year });
    return {
      text: `Pagos ${month}/${year}: ${JSON.stringify(result).slice(0, 800)}`,
      toolsUsed,
      degraded: false,
      provider: 'local'
    };
  }

  if (/busca(r)? (en )?(la )?(web|internet|google)|qué es |que es |noticias/.test(lower)) {
    const q = text
      .replace(/busca(r)? (en )?(la )?(web|internet|google)/i, '')
      .replace(/noticias (sobre|de)?/i, '')
      .trim() || text;
    const result = await run('web_search', { query: q });
    const hits = result?.results || result?.data || [];
    const lines = (Array.isArray(hits) ? hits : []).slice(0, 5).map(
      (h) => `• ${h.title || h.name || 'Resultado'}: ${(h.snippet || h.url || '').slice(0, 120)}`
    );
    return {
      text: lines.length
        ? `Resultados para «${q}»:\n${lines.join('\n')}`
        : `Busqué «${q}» pero no obtuve resultados útiles ahora.`,
      toolsUsed,
      degraded: false,
      provider: 'local'
    };
  }

  if (/whatsapp|env[ií]a(le|me)?|responde(le)?|cont[eé]sta(le)?/.test(lower)) {
    return {
      text:
        'Para WhatsApp dime: número o cliente + el mensaje. Ejemplo: «Prepárale un WhatsApp a Juan al 8095551234 diciendo que la reunión es mañana a las 10». Quedará como borrador para que tú confirmes antes de enviar.',
      toolsUsed,
      degraded: false,
      provider: 'local'
    };
  }

  if (/m[uú]sica|pon(er)? (una )?canci[oó]n|playlist|reproduce/.test(lower)) {
    const result = await run('music_search', { query: text.replace(/m[uú]sica|pon(er)?|reproduce|playlist/gi, '').trim() || 'a' });
    return {
      text: `Música: ${JSON.stringify(result).slice(0, 600)}. Di «reproduce [nombre]» para poner una pista.`,
      toolsUsed,
      degraded: false,
      provider: 'local'
    };
  }

  if (/ayuda|qu[eé] puedes|capacidades|comandos/.test(lower)) {
    return {
      text:
        'Puedo: listar/filtrar clientes, consultar pagos, crear cotizaciones, preparar WhatsApp (con tu OK), buscar en internet, gestionar memorias y música. Habla natural o escribe — estoy listo.',
      toolsUsed,
      degraded: false,
      provider: 'local'
    };
  }

  return {
    text:
      `Entendido: «${text.slice(0, 200)}». Estoy en motor local DostinX8 (sin Claude). ` +
      'Prueba: «lista clientes activos», «pagos de este mes», «busca en internet precios hosting RD», «ayuda». ' +
      'Para razonamiento avanzado configura OPENAI_API_KEY en el servidor.',
    toolsUsed,
    degraded: false,
    provider: 'local'
  };
}

async function chatOpenAI({ messages, userId, conversationId }) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const memories = await loadMemories(userId);
  const systemWithMemory = buildJarvisSystemPrompt(memories);
  const tools = toOpenAITools();
  let currentMessages = [
    { role: 'system', content: systemWithMemory },
    ...sanitizeMessages(messages)
  ];
  const toolsUsed = [];
  let rounds = 0;

  while (rounds < MAX_TOOL_ROUNDS) {
    rounds += 1;
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: currentMessages,
      tools,
      tool_choice: 'auto',
      temperature: 0.4
    });

    const choice = response.choices?.[0];
    const msg = choice?.message;
    if (!msg) break;

    if (msg.tool_calls?.length) {
      currentMessages.push({
        role: 'assistant',
        content: msg.content || null,
        tool_calls: msg.tool_calls
      });

      for (const call of msg.tool_calls) {
        let args = {};
        try {
          args = JSON.parse(call.function.arguments || '{}');
        } catch {
          args = {};
        }
        toolsUsed.push({ name: call.function.name, input: args });
        const result = await executeJarvisTool(call.function.name, args, {
          userId,
          conversationId
        });
        currentMessages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result)
        });
      }
      continue;
    }

    return {
      text: msg.content?.trim() || 'Listo, jefe. ¿En qué más te asisto?',
      toolsUsed,
      degraded: false,
      provider: 'openai'
    };
  }

  return {
    text: 'Ejecuté varias acciones. ¿Continuamos con algo más?',
    toolsUsed,
    degraded: false,
    provider: 'openai'
  };
}

/** Gemini (opcional) — sin tool loop completo; respuesta de texto + pista de tools locales */
async function chatGemini({ messages }) {
  const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const last = [...messages].reverse().find((m) => m.role === 'user');
  const prompt = String(last?.content || '');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `${buildJarvisSystemPrompt([])}\n\nUsuario: ${prompt}` }] }],
      generationConfig: { maxOutputTokens: 1024, temperature: 0.4 }
    })
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ||
    'Listo, jefe.';
  return { text: text.trim(), toolsUsed: [], degraded: false, provider: 'gemini' };
}

async function chat({ messages, userId, conversationId }) {
  const provider = activeProvider();

  try {
    if (provider === 'openai') {
      return await chatOpenAI({ messages, userId, conversationId });
    }
    if (provider === 'gemini') {
      // Intenta Gemini; si falla, motor local
      try {
        return await chatGemini({ messages });
      } catch (err) {
        console.warn('[LLMService] Gemini falló, usando local:', err.message);
        return chatLocal({ messages, userId, conversationId });
      }
    }
    return chatLocal({ messages, userId, conversationId });
  } catch (err) {
    console.error('[LLMService]', err.message);
    // Nunca mostrar mensaje de Claude
    try {
      return await chatLocal({ messages, userId, conversationId });
    } catch {
      return {
        text: 'JARVISIA tuvo un fallo temporal. Intenta de nuevo en un momento.',
        toolsUsed: [],
        degraded: true,
        error: err.message,
        provider: 'error'
      };
    }
  }
}

async function completeText(prompt, { maxTokens = 600 } = {}) {
  if (process.env.OPENAI_API_KEY) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    });
    return response.choices?.[0]?.message?.content?.trim() || '';
  }
  return '';
}

module.exports = {
  chat,
  completeText,
  activeProvider,
  buildJarvisSystemPrompt
};
