const fs = require('fs');
const path = require('path');
const Client = require('../models/Client');
const Payment = require('../models/Payment');
const Quote = require('../models/Quote');
const JarvisMemory = require('../models/JarvisMemory');
const Playlist = require('../models/Playlist');
const WhatsAppService = require('../services/WhatsAppService');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const { searchAudio, listAudioFiles } = require('../services/MusicService');
const { searchWeb, fetchWebPage } = require('../services/WebService');
const Task = require('../models/Task');

let socketBroadcast = null;

function setSocketBroadcast(fn) {
  socketBroadcast = fn;
}

function emitToUser(userId, event, data) {
  if (socketBroadcast) {
    socketBroadcast(userId, event, data);
  }
}

const JARVIS_TOOLS = [
  {
    name: 'get_clients',
    description: 'Lista clientes del CRM filtrados por estado opcional',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['ACTIVO', 'VENCIDO', 'LEAD', 'SUSPENDIDO', 'EN_RIESGO']
        }
      }
    }
  },
  {
    name: 'get_payments',
    description: 'Consulta pagos de un mes y año específicos con totales',
    input_schema: {
      type: 'object',
      properties: {
        month: { type: 'number', description: 'Mes 1-12' },
        year: { type: 'number', description: 'Año ej. 2026' }
      },
      required: ['month', 'year']
    }
  },
  {
    name: 'create_quote',
    description: 'Crea una cotización LCS para un cliente',
    input_schema: {
      type: 'object',
      properties: {
        clientId: { type: 'string' },
        modules: { type: 'array', items: { type: 'string' } },
        setupFee: { type: 'number' },
        licenciaMensual: { type: 'number' }
      },
      required: ['clientId', 'modules', 'setupFee', 'licenciaMensual']
    }
  },
  {
    name: 'send_whatsapp',
    description:
      'Prepara un mensaje de WhatsApp que SIEMPRE queda como borrador pendiente de confirmación del usuario antes de enviarse. Nunca se envía automáticamente. Devuelve el borrador para que el usuario lo apruebe, edite o cancele.',
    input_schema: {
      type: 'object',
      properties: {
        phone: { type: 'string', description: 'Número destino (acepta formato local RD o internacional)' },
        message: { type: 'string', description: 'Texto propuesto a enviar' },
        clientId: { type: 'string', description: 'ID del cliente CRM si aplica' },
        recipientName: { type: 'string', description: 'Nombre del destinatario para mostrar' }
      },
      required: ['phone', 'message']
    }
  },
  {
    name: 'draft_whatsapp_reply',
    description:
      'Redacta una respuesta profesional a un mensaje de WhatsApp que el usuario indica. Queda como borrador pendiente de confirmación antes de enviarse. Úsalo cuando el usuario diga algo como "respóndele a X que...", "contéstale a este mensaje...".',
    input_schema: {
      type: 'object',
      properties: {
        phone: { type: 'string', description: 'Número del destinatario (o usa clientId)' },
        clientId: { type: 'string', description: 'ID del cliente CRM si el destinatario está en el CRM' },
        inboundMessage: { type: 'string', description: 'El mensaje recibido al que se responde (contexto)' },
        message: { type: 'string', description: 'La respuesta redactada, lista y profesional' },
        recipientName: { type: 'string' }
      },
      required: ['message']
    }
  },
  {
    name: 'update_client_status',
    description: 'Actualiza el estado de un cliente en el pipeline',
    input_schema: {
      type: 'object',
      properties: {
        clientId: { type: 'string' },
        status: {
          type: 'string',
          enum: ['ACTIVO', 'VENCIDO', 'LEAD', 'SUSPENDIDO', 'EN_RIESGO', 'COTIZADO', 'NEGOCIANDO']
        }
      },
      required: ['clientId', 'status']
    }
  },
  {
    name: 'get_kpis',
    description: 'Retorna KPIs del negocio: MRR, ARR, churn, clientes activos, vencimientos',
    input_schema: { type: 'object', properties: {} }
  },
  {
    name: 'music_search',
    description: 'Busca pistas en la biblioteca local de audio',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query']
    }
  },
  {
    name: 'music_play',
    description: 'Reproduce una pista de la biblioteca local',
    input_schema: {
      type: 'object',
      properties: { filename: { type: 'string' } },
      required: ['filename']
    }
  },
  {
    name: 'music_pause',
    description: 'Pausa la reproducción de música',
    input_schema: { type: 'object', properties: {} }
  },
  {
    name: 'music_next',
    description: 'Siguiente pista en la cola',
    input_schema: { type: 'object', properties: {} }
  },
  {
    name: 'music_prev',
    description: 'Pista anterior en la cola',
    input_schema: { type: 'object', properties: {} }
  },
  {
    name: 'music_set_volume',
    description: 'Ajusta el volumen del reproductor 0-100',
    input_schema: {
      type: 'object',
      properties: { level: { type: 'number' } },
      required: ['level']
    }
  },
  {
    name: 'music_create_playlist',
    description: 'Crea una playlist persistida en MongoDB',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        tracks: { type: 'array', items: { type: 'string' } }
      },
      required: ['name', 'tracks']
    }
  },
  {
    name: 'jarvis_remember',
    description: 'Guarda un hecho, preferencia o feedback en memoria de largo plazo',
    input_schema: {
      type: 'object',
      properties: {
        content: { type: 'string' },
        type: { type: 'string', enum: ['preference', 'fact', 'feedback'] },
        importance: { type: 'number' }
      },
      required: ['content', 'type']
    }
  },
  {
    name: 'jarvis_recall',
    description: 'Busca memorias relevantes por consulta',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query']
    }
  },
  {
    name: 'web_search',
    description:
      'Busca información actualizada en internet. Usar para noticias, precios, documentación, datos en tiempo real o cualquier cosa fuera del CRM.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Consulta de búsqueda en español o inglés' },
        limit: { type: 'number', description: 'Máximo de resultados (default 6)' }
      },
      required: ['query']
    }
  },
  {
    name: 'web_fetch',
    description: 'Lee el contenido de texto de una URL pública (artículo, documentación, página web)',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL completa https://...' }
      },
      required: ['url']
    }
  },
  {
    name: 'web_learn',
    description:
      'Investiga un tema en internet, extrae lo relevante y lo guarda en memoria de largo plazo para futuras conversaciones',
    input_schema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'Tema a investigar y aprender' },
        importance: { type: 'number', description: 'Prioridad 1-5 (default 4)' }
      },
      required: ['topic']
    }
  },
  {
    name: 'create_task',
    description: 'Crea una tarea personal (título, prioridad, fecha opcional)',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        priority: { type: 'string', enum: ['baja', 'media', 'alta', 'urgente'] },
        dueDate: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } }
      },
      required: ['title']
    }
  },
  {
    name: 'list_tasks',
    description: 'Lista tareas. filter: all|pending|completed|today',
    input_schema: {
      type: 'object',
      properties: {
        filter: { type: 'string', enum: ['all', 'pending', 'completed', 'today'] }
      }
    }
  },
  {
    name: 'complete_task',
    description: 'Marca tarea completada por id',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id']
    }
  },
  {
    name: 'update_task',
    description: 'Actualiza una tarea',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        priority: { type: 'string' },
        status: { type: 'string' },
        dueDate: { type: 'string' }
      },
      required: ['id']
    }
  },
  {
    name: 'delete_task',
    description: 'Elimina una tarea por id',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id']
    }
  },
  {
    name: 'tasks_summary',
    description: 'Resumen de conteos de tareas del usuario',
    input_schema: { type: 'object', properties: {} }
  }
];

async function generateQuoteNumber() {
  const year = new Date().getFullYear();
  const prefix = `LCS-${year}-`;
  const last = await Quote.findOne({ quoteNumber: new RegExp(`^${prefix}`) })
    .sort({ quoteNumber: -1 })
    .lean();

  let seq = 1;
  if (last?.quoteNumber) {
    const parts = last.quoteNumber.split('-');
    seq = parseInt(parts[2], 10) + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}

/**
 * Crea un borrador de WhatsApp que requiere confirmación explícita del usuario
 * antes de enviarse. Nunca envía en este punto (Ley 14 — habla/actúa post-análisis).
 */
async function createWhatsAppDraft(toolInput, context = {}) {
  const { userId } = context;
  let { phone, clientId, message, inboundMessage, recipientName } = toolInput;

  // Resolver número desde el CRM si se pasó clientId
  if (clientId) {
    const client = await Client.findById(clientId).select('nombre whatsapp').lean();
    if (client) {
      phone = phone || client.whatsapp;
      recipientName = recipientName || client.nombre;
    }
  }

  if (!phone) {
    return { error: 'No hay número de destino. Indica el teléfono o el cliente.' };
  }

  const phoneNormalized = WhatsAppService.normalizePhone(phone);
  if (!phoneNormalized) {
    return { error: `Número de WhatsApp inválido: ${phone}` };
  }

  const text = String(message || '').trim().slice(0, 4096);
  if (!text) {
    return { error: 'El mensaje está vacío.' };
  }

  const draft = await WhatsAppMessage.create({
    userId,
    clientId: clientId || undefined,
    phone,
    phoneNormalized,
    recipientName,
    inboundMessage,
    message: text,
    status: 'pending_confirmation',
    origin: 'jarvis'
  });

  // Notificar al frontend para mostrar el panel de confirmación en vivo
  if (userId) {
    emitToUser(userId.toString(), 'whatsapp:draft', {
      id: draft._id,
      phone: draft.phone,
      phoneNormalized: draft.phoneNormalized,
      recipientName: draft.recipientName || null,
      inboundMessage: draft.inboundMessage || null,
      message: draft.message,
      status: draft.status,
      createdAt: draft.createdAt
    });
  }

  return {
    status: 'pending_confirmation',
    draftId: draft._id,
    to: recipientName || phoneNormalized,
    preview: text,
    note: 'Borrador creado. Requiere confirmación del usuario antes de enviarse. Informa al usuario que revise y apruebe el mensaje.'
  };
}

async function executeJarvisTool(toolName, toolInput, context = {}) {
  const { userId } = context;
  const start = Date.now();

  console.log(`[JARVIS TOOL] user=${userId} tool=${toolName} params=${JSON.stringify(toolInput)}`);

  try {
    let result;

    switch (toolName) {
      case 'get_clients': {
        const filter = toolInput.status ? { status: toolInput.status } : {};
        const clients = await Client.find(filter)
          .select('nombre empresa email whatsapp tier precioMensual status proximoVencimiento')
          .lean();
        result = clients.map((c) => ({
          nombre: c.nombre,
          empresa: c.empresa,
          email: c.email,
          whatsapp: c.whatsapp,
          tier: c.tier,
          precioMensual: c.precioMensual,
          status: c.status,
          proximoVencimiento: c.proximoVencimiento
        }));
        break;
      }

      case 'get_payments': {
        const { month, year } = toolInput;
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        const payments = await Payment.find({
          fecha: { $gte: startDate, $lte: endDate }
        })
          .populate('clientId', 'nombre empresa')
          .lean();
        const total = payments.reduce((sum, p) => sum + p.monto, 0);
        result = { payments, total, month, year };
        break;
      }

      case 'create_quote': {
        const quoteNumber = await generateQuoteNumber();
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 15);
        const total = (toolInput.setupFee || 0) + (toolInput.licenciaMensual || 0);
        const quote = await Quote.create({
          quoteNumber,
          clientId: toolInput.clientId,
          modules: toolInput.modules,
          setupFee: toolInput.setupFee,
          licenciaMensual: toolInput.licenciaMensual,
          total,
          validUntil,
          status: 'BORRADOR'
        });
        result = {
          quoteId: quote._id,
          quoteNumber: quote.quoteNumber,
          total: quote.total,
          validUntil: quote.validUntil
        };
        break;
      }

      case 'send_whatsapp':
      case 'draft_whatsapp_reply': {
        result = await createWhatsAppDraft(toolInput, context);
        break;
      }

      case 'update_client_status': {
        const client = await Client.findByIdAndUpdate(
          toolInput.clientId,
          { status: toolInput.status, updatedAt: new Date() },
          { new: true }
        );
        result = { updated: !!client, newStatus: client?.status };
        break;
      }

      case 'get_kpis': {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const in7Days = new Date(now);
        in7Days.setDate(in7Days.getDate() + 7);

        const [activos, vencidos, suspendidos, enRiesgo, leads, vencimientos] = await Promise.all([
          Client.find({ status: 'ACTIVO' }).lean(),
          Client.countDocuments({ status: 'VENCIDO', updatedAt: { $gte: monthStart } }),
          Client.countDocuments({ status: 'SUSPENDIDO', updatedAt: { $gte: monthStart } }),
          Client.countDocuments({ status: 'EN_RIESGO' }),
          Client.countDocuments({ status: 'LEAD' }),
          Client.find({
            status: 'ACTIVO',
            proximoVencimiento: { $gte: now, $lte: in7Days }
          })
            .select('nombre proximoVencimiento precioMensual')
            .lean()
        ]);

        const mrr = activos.reduce((sum, c) => sum + (c.precioMensual || 0), 0);
        const totalActivos = activos.length;
        const churnBase = totalActivos || 1;
        const churn = ((vencidos + suspendidos) / churnBase) * 100;

        result = {
          mrr,
          arr: mrr * 12,
          churnRate: Math.round(churn * 100) / 100,
          clientesActivos: totalActivos,
          clientesEnRiesgo: enRiesgo,
          leads,
          proximosVencimientos: vencimientos
        };
        break;
      }

      case 'music_search': {
        result = searchAudio(toolInput.query || '');
        break;
      }

      case 'music_play': {
        const url = `/audio/${toolInput.filename}`;
        emitToUser(userId, 'music:play', { filename: toolInput.filename, url });
        result = { playing: toolInput.filename, url };
        break;
      }

      case 'music_pause': {
        emitToUser(userId, 'music:pause', {});
        result = { paused: true };
        break;
      }

      case 'music_next': {
        emitToUser(userId, 'music:next', {});
        result = { next: true };
        break;
      }

      case 'music_prev': {
        emitToUser(userId, 'music:prev', {});
        result = { prev: true };
        break;
      }

      case 'music_set_volume': {
        const level = Math.min(100, Math.max(0, toolInput.level));
        emitToUser(userId, 'music:volume', { level });
        result = { volume: level };
        break;
      }

      case 'music_create_playlist': {
        const tracks = (toolInput.tracks || []).map((filename) => ({
          title: path.basename(filename, path.extname(filename)),
          filename
        }));
        const playlist = await Playlist.create({
          userId,
          name: toolInput.name,
          tracks
        });
        result = {
          playlistId: playlist._id,
          name: playlist.name,
          trackCount: playlist.tracks.length
        };
        break;
      }

      case 'jarvis_remember': {
        const memory = await JarvisMemory.create({
          userId,
          type: toolInput.type || 'fact',
          content: toolInput.content,
          importance: toolInput.importance || 3,
          lastUsedAt: new Date()
        });
        result = { saved: true, memoryId: memory._id };
        break;
      }

      case 'jarvis_recall': {
        const regex = new RegExp(toolInput.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const memories = await JarvisMemory.find({
          $or: [{ userId }, { userId: { $exists: false } }],
          content: regex
        })
          .sort({ importance: -1, lastUsedAt: -1 })
          .limit(5)
          .lean();
        await JarvisMemory.updateMany(
          { _id: { $in: memories.map((m) => m._id) } },
          { lastUsedAt: new Date() }
        );
        result = memories;
        break;
      }

      case 'web_search': {
        result = await searchWeb(toolInput.query, toolInput.limit || 6);
        break;
      }

      case 'web_fetch': {
        result = await fetchWebPage(toolInput.url);
        break;
      }

      case 'web_learn': {
        const search = await searchWeb(toolInput.topic, 3);
        let learned = '';

        if (search.results[0]?.url) {
          try {
            const page = await fetchWebPage(search.results[0].url);
            learned = `${search.results[0].title}: ${page.content.slice(0, 1500)}`;
          } catch {
            learned = search.results
              .map((r) => `${r.title} — ${r.snippet}`)
              .join(' | ')
              .slice(0, 1500);
          }
        } else {
          learned = `Sin resultados web para: ${toolInput.topic}`;
        }

        const memory = await JarvisMemory.create({
          userId,
          type: 'fact',
          content: `[Web ${new Date().toISOString().slice(0, 10)}] ${toolInput.topic}: ${learned}`,
          context: 'web_learn',
          importance: toolInput.importance || 4,
          lastUsedAt: new Date()
        });

        result = {
          learned: true,
          memoryId: memory._id,
          topic: toolInput.topic,
          sources: search.results.map((r) => ({ title: r.title, url: r.url })),
          preview: learned.slice(0, 300)
        };
        break;
      }

      case 'create_task': {
        if (!userId) {
          result = { error: 'Usuario requerido' };
          break;
        }
        const task = await Task.create({
          userId,
          title: String(toolInput.title || '').trim().slice(0, 300),
          priority: toolInput.priority || 'media',
          dueDate: toolInput.dueDate ? new Date(toolInput.dueDate) : undefined,
          tags: Array.isArray(toolInput.tags) ? toolInput.tags.slice(0, 12) : []
        });
        result = {
          id: task._id,
          title: task.title,
          priority: task.priority,
          status: task.status
        };
        break;
      }

      case 'list_tasks': {
        if (!userId) {
          result = { tasks: [] };
          break;
        }
        const q = { userId };
        const f = toolInput.filter || 'pending';
        if (f === 'pending') q.status = { $in: ['pendiente', 'en_progreso'] };
        if (f === 'completed') q.status = 'completada';
        if (f === 'today') {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const end = new Date();
          end.setHours(23, 59, 59, 999);
          q.dueDate = { $gte: start, $lte: end };
        }
        const tasks = await Task.find(q).sort({ priority: -1, createdAt: -1 }).limit(50).lean();
        result = {
          tasks: tasks.map((t) => ({
            id: t._id,
            title: t.title,
            priority: t.priority,
            status: t.status,
            dueDate: t.dueDate
          }))
        };
        break;
      }

      case 'complete_task': {
        const task = await Task.findOneAndUpdate(
          { _id: toolInput.id, userId },
          { status: 'completada' },
          { new: true }
        );
        result = task
          ? { id: task._id, title: task.title, status: task.status }
          : { error: 'Tarea no encontrada' };
        break;
      }

      case 'update_task': {
        const patch = {};
        if (toolInput.title) patch.title = String(toolInput.title).slice(0, 300);
        if (toolInput.priority) patch.priority = toolInput.priority;
        if (toolInput.status) patch.status = toolInput.status;
        if (toolInput.dueDate) patch.dueDate = new Date(toolInput.dueDate);
        const task = await Task.findOneAndUpdate({ _id: toolInput.id, userId }, patch, { new: true });
        result = task
          ? { id: task._id, title: task.title, priority: task.priority, status: task.status }
          : { error: 'Tarea no encontrada' };
        break;
      }

      case 'delete_task': {
        const deleted = await Task.findOneAndDelete({ _id: toolInput.id, userId });
        result = deleted ? { deleted: true, id: toolInput.id } : { error: 'Tarea no encontrada' };
        break;
      }

      case 'tasks_summary': {
        if (!userId) {
          result = { pendiente: 0, en_progreso: 0, completada: 0 };
          break;
        }
        const [pendiente, en_progreso, completada] = await Promise.all([
          Task.countDocuments({ userId, status: 'pendiente' }),
          Task.countDocuments({ userId, status: 'en_progreso' }),
          Task.countDocuments({ userId, status: 'completada' })
        ]);
        result = { pendiente, en_progreso, completada };
        break;
      }

      default:
        result = { error: `Tool desconocido: ${toolName}` };
    }

    console.log(`[JARVIS TOOL] ${toolName} completado en ${Date.now() - start}ms`);
    return result;
  } catch (err) {
    console.error(`[JARVIS TOOL ERROR] ${toolName}:`, err.message);
    return { error: err.message };
  }
}

module.exports = {
  JARVIS_TOOLS,
  executeJarvisTool,
  setSocketBroadcast,
  listAudioFiles
};
