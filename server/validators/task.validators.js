/**
 * Validación ligera estilo Zod sin dependencia externa (cero fricción de install en Render).
 * Si zod está instalado, se usa; si no, schemas manuales equivalentes.
 */

function fail(message) {
  const err = new Error(message);
  err.code = 'ZOD';
  err.name = 'ValidationError';
  throw err;
}

const PRIORITIES = ['baja', 'media', 'alta', 'urgente'];
const STATUSES = ['pendiente', 'en_progreso', 'completada'];

const createTaskSchema = {
  parse(input) {
    const data = input || {};
    const title = String(data.title || '').trim();
    if (!title || title.length > 300) fail('title requerido (máx 300)');
    const priority = data.priority || 'media';
    if (!PRIORITIES.includes(priority)) fail('priority inválida');
    const status = data.status || 'pendiente';
    if (!STATUSES.includes(status)) fail('status inválido');
    const tags = Array.isArray(data.tags)
      ? data.tags.map((t) => String(t).trim().slice(0, 40)).filter(Boolean).slice(0, 12)
      : [];
    return {
      title,
      priority,
      status,
      dueDate: data.dueDate || undefined,
      tags,
      notes: data.notes ? String(data.notes).slice(0, 2000) : undefined
    };
  }
};

const updateTaskSchema = {
  parse(input) {
    const data = input || {};
    const out = {};
    if (data.title !== undefined) {
      out.title = String(data.title).trim();
      if (!out.title || out.title.length > 300) fail('title inválido');
    }
    if (data.priority !== undefined) {
      if (!PRIORITIES.includes(data.priority)) fail('priority inválida');
      out.priority = data.priority;
    }
    if (data.status !== undefined) {
      if (!STATUSES.includes(data.status)) fail('status inválido');
      out.status = data.status;
    }
    if (data.dueDate !== undefined) out.dueDate = data.dueDate;
    if (data.tags !== undefined) {
      out.tags = Array.isArray(data.tags)
        ? data.tags.map((t) => String(t).trim().slice(0, 40)).filter(Boolean).slice(0, 12)
        : [];
    }
    if (data.notes !== undefined) out.notes = String(data.notes).slice(0, 2000);
    return out;
  }
};

const chatBodySchema = {
  parse(input) {
    const data = input || {};
    const message = String(data.message || '').trim();
    if (!message) fail('Mensaje requerido');
    if (message.length > 8000) fail('Mensaje demasiado largo');
    return {
      message,
      conversationId: data.conversationId || undefined,
      audioMode: Boolean(data.audioMode)
    };
  }
};

function parseOrThrow(schema, input) {
  return schema.parse(input);
}

module.exports = {
  createTaskSchema,
  updateTaskSchema,
  chatBodySchema,
  parseOrThrow,
  PRIORITIES,
  STATUSES
};
