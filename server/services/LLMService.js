const OpenAI = require('openai');
const JarvisMemory = require('../models/JarvisMemory');
const { JARVIS_TOOLS, executeJarvisTool } = require('../tools/jarvisTools');
const { buildJarvisSystemPrompt } = require('../prompts/jarvisSystemPrompt');
const { appendPostResponseMenu } = require('./menuService');
const { isOnline } = require('./connectivity');

const MAX_TOOL_ROUNDS = 12;

function withMenu(result, { offline = false } = {}) {
  return {
    ...result,
    text: appendPostResponseMenu(result.text, { offline: offline || result.provider === 'local' })
  };
}

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

function providerChain() {
  const chain = [];
  if (process.env.ANTHROPIC_API_KEY) chain.push('claude');
  if (process.env.OPENAI_API_KEY) chain.push('openai');
  if (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY) chain.push('gemini');
  if (process.env.GROQ_API_KEY) chain.push('groq');
  chain.push('local');
  return chain;
}

function activeProvider() {
  return providerChain()[0] || 'local';
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
        'Aquí estoy, jefe. Te escucho y estoy listo para ayudar: CRM, cobros, cotizaciones, WhatsApp (con tu confirmación), tareas, internet y música. ¿Qué hacemos?',
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
        'Puedo: tareas personales, listar/filtrar clientes, consultar pagos, crear cotizaciones, preparar WhatsApp (con tu OK), buscar en internet, gestionar memorias y música. Habla natural o escribe — estoy listo.',
      toolsUsed,
      degraded: false,
      provider: 'local'
    };
  }

  // Tareas personales
  if (/tarea|todo|pendiente|recordatorio/.test(lower)) {
    if (/lista|ver|muestra|mis tareas|pendientes/.test(lower)) {
      const result = await run('list_tasks', { filter: 'pending' });
      const list = result?.tasks || [];
      const lines = list.slice(0, 15).map(
        (t) => `• [${t.priority}] ${t.title} — ${t.status}`
      );
      return {
        text: lines.length ? `Tareas pendientes:\n${lines.join('\n')}` : 'No tienes tareas pendientes.',
        toolsUsed,
        degraded: false,
        provider: 'local'
      };
    }
    const createMatch = text.match(/(?:crea|nueva|agrega|añade)\s+(?:una\s+)?tarea\s*[:\-]?\s*(.+)/i);
    if (createMatch?.[1]) {
      let priority = 'media';
      if (/urgente/.test(lower)) priority = 'urgente';
      else if (/alta/.test(lower)) priority = 'alta';
      else if (/baja/.test(lower)) priority = 'baja';
      const title = createMatch[1].replace(/\s*(urgente|alta|baja|media)\s*$/i, '').trim();
      const result = await run('create_task', { title, priority });
      return {
        text: result?.error
          ? `No pude crear la tarea: ${result.error}`
          : `Tarea creada: «${result.title}» (${result.priority}).`,
        toolsUsed,
        degraded: false,
        provider: 'local'
      };
    }
    if (/completa|marcar|hecho|termin[eé]/.test(lower)) {
      const list = await run('list_tasks', { filter: 'pending' });
      const tasks = list?.tasks || [];
      const hit = tasks.find((t) => lower.includes(String(t.title || '').toLowerCase().slice(0, 20)));
      if (hit) {
        await run('complete_task', { id: String(hit.id || hit._id) });
        return {
          text: `Marqué como completada: «${hit.title}».`,
          toolsUsed,
          degraded: false,
          provider: 'local'
        };
      }
      return {
        text: 'Dime el título exacto de la tarea a completar, o usa el panel de tareas.',
        toolsUsed,
        degraded: false,
        provider: 'local'
      };
    }
  }

  if (/estado|conexi[oó]n|online|offline|status/.test(lower) && lower.length < 60) {
    return {
      text: 'Estoy en motor local DostinX8. Si hay keys cloud (Claude/OpenAI/Gemini/Groq) se usan con fallback automático.',
      toolsUsed,
      degraded: false,
      provider: 'local'
    };
  }

  return {
    text:
      `Entendido: «${text.slice(0, 200)}». Estoy en motor local DostinX8. ` +
      'Prueba: «crea tarea Revisar cotización urgente», «lista tareas», «lista clientes activos», «busca en internet…», «ayuda». ' +
      'Para razonamiento cloud configura OPENAI_API_KEY / ANTHROPIC_API_KEY en el servidor.',
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
async function chatGemini({ messages, userId }) {
  const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const memories = await loadMemories(userId);
  const last = [...messages].reverse().find((m) => m.role === 'user');
  const prompt = String(last?.content || '');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `${buildJarvisSystemPrompt(memories)}\n\nUsuario: ${prompt}` }] }],
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

async function chatClaude({ messages, userId }) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const memories = await loadMemories(userId);
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
  const response = await client.messages.create({
    model,
    max_tokens: 1200,
    system: buildJarvisSystemPrompt(memories),
    messages: sanitizeMessages(messages)
  });
  const text = response.content?.filter((c) => c.type === 'text').map((c) => c.text).join('\n') || 'Listo, jefe.';
  return { text: text.trim(), toolsUsed: [], degraded: false, provider: 'claude' };
}

async function chatGroq({ messages, userId }) {
  const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1'
  });
  const memories = await loadMemories(userId);
  const response = await client.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: buildJarvisSystemPrompt(memories) },
      ...sanitizeMessages(messages)
    ],
    temperature: 0.4,
    max_tokens: 1200
  });
  const text = response.choices?.[0]?.message?.content?.trim() || 'Listo, jefe.';
  return { text, toolsUsed: [], degraded: false, provider: 'groq' };
}

async function runProvider(name, ctx) {
  switch (name) {
    case 'claude':
      return chatClaude(ctx);
    case 'openai':
      return chatOpenAI(ctx);
    case 'gemini':
      return chatGemini(ctx);
    case 'groq':
      return chatGroq(ctx);
    case 'local':
      return chatLocal(ctx);
    default:
      return chatLocal(ctx);
  }
}

async function chat({ messages, userId, conversationId }) {
  const ctx = { messages, userId, conversationId };
  const online = await isOnline();
  const chain = online ? providerChain() : ['local'];

  if (!online) {
    console.warn('[LLMService] Sin conectividad cloud — motor local');
    return withMenu(await chatLocal(ctx), { offline: true });
  }

  const errors = [];
  for (const name of chain) {
    try {
      const result = await runProvider(name, ctx);
      return withMenu(result, { offline: name === 'local' });
    } catch (err) {
      errors.push(`${name}: ${err.message}`);
      console.warn(`[LLMService] ${name} falló → siguiente:`, err.message);
    }
  }

  return withMenu(
    {
      text: 'No pude contactar proveedores cloud. Usé degradación segura.',
      toolsUsed: [],
      degraded: true,
      error: errors.join(' | ').slice(0, 200),
      provider: 'error'
    },
    { offline: true }
  );
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
  providerChain,
  buildJarvisSystemPrompt
};
