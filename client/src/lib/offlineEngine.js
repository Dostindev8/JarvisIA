import {
  createLocalTask,
  listLocalTasks,
  completeLocalTask,
  localTasksSummary
} from './localTasks';
import { searchLocalHistory } from './localMemory';

const MENU = `
──────────────────────────────────────────
 ¿Qué deseas hacer ahora?
  [1] Continuar conversación
  [2] Ver mis tareas pendientes
  [3] Crear una nueva tarea
  [4] Buscar en mi historial
  [5] Ver estado de conexión (online/offline)
  [6] Configuración
  [0] Salir / cerrar menú
──────────────────────────────────────────
Elige una opción o escribe tu siguiente mensaje:`;

function withMenu(text) {
  return `${String(text || '').trim()}\n${MENU}`;
}

/**
 * Motor offline 100% cliente — tareas, historial, ayuda, hora.
 * Nunca requiere red.
 */
export function runOfflineEngine(rawInput, { online = false } = {}) {
  const text = String(rawInput || '').trim();
  const lower = text.toLowerCase();

  if (/^0$/.test(text)) {
    return { text: withMenu('Menú cerrado. Escribe cuando quieras continuar.'), action: 'exit' };
  }
  if (/^1$/.test(text)) {
    return { text: withMenu('Continúa — dime en qué te ayudo.'), action: 'continue' };
  }
  if (/^2$/.test(text) || /lista(r)? tareas|mis tareas|pendientes/.test(lower)) {
    const tasks = listLocalTasks('pending');
    const lines = tasks.slice(0, 15).map((t) => `• [${t.priority}] ${t.title}`);
    return {
      text: withMenu(
        lines.length ? `Tareas pendientes (local):\n${lines.join('\n')}` : 'No hay tareas pendientes en local.'
      ),
      action: 'list_tasks'
    };
  }
  if (/^3$/.test(text)) {
    return {
      text: withMenu('Escribe: crea tarea [título] (opcional: urgente/alta/baja)'),
      action: 'create_task_prompt'
    };
  }
  if (/^4$/.test(text) || /historial|busca en (mi )?historial/.test(lower)) {
    const hits = searchLocalHistory(text.replace(/^4$|historial|busca en (mi )?historial/gi, '').trim());
    const lines = hits.slice(-8).map((m) => `• ${m.role}: ${String(m.content).slice(0, 80)}`);
    return {
      text: withMenu(lines.length ? `Historial local:\n${lines.join('\n')}` : 'Sin historial local aún.'),
      action: 'history'
    };
  }
  if (/^5$/.test(text) || /estado de conexi[oó]n|online|offline/.test(lower)) {
    return {
      text: withMenu(
        online
          ? '🌐 Conexión detectada. Intentaré el API; si falla uso motor local.'
          : '🔌 Modo offline activo — usando motor local. Tareas e historial siguen disponibles.'
      ),
      action: 'status'
    };
  }
  if (/^6$/.test(text) || /configuraci[oó]n|ajustes/.test(lower)) {
    return { text: withMenu('Abre ⚙️ Ajustes en la barra superior para voz, memorias y preferencias.'), action: 'settings' };
  }

  if (/^(hola|buenas|hey|hello|jarvis)/i.test(lower) && lower.length < 40) {
    return {
      text: withMenu(
        '🔌 Modo offline activo — usando motor local.\nEn línea local, jefe. Puedo gestionar tareas, historial y comandos básicos sin internet.'
      ),
      action: 'greet'
    };
  }

  if (/hora|fecha|qu[eé] d[ií]a/.test(lower)) {
    const now = new Date();
    return {
      text: withMenu(
        `Hoy es ${now.toLocaleDateString('es-DO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} — ${now.toLocaleTimeString('es-DO')}.`
      ),
      action: 'datetime'
    };
  }

  const createMatch = text.match(/(?:crea|nueva|agrega|añade)\s+(?:una\s+)?tarea\s*[:\-]?\s*(.+)/i);
  if (createMatch?.[1]) {
    let priority = 'media';
    if (/urgente/.test(lower)) priority = 'urgente';
    else if (/alta/.test(lower)) priority = 'alta';
    else if (/baja/.test(lower)) priority = 'baja';
    const title = createMatch[1].replace(/\s*(urgente|alta|baja|media)\s*$/i, '').trim();
    try {
      const task = createLocalTask({ title, priority });
      return { text: withMenu(`Tarea local creada: «${task.title}» (${task.priority}).`), action: 'task_created' };
    } catch (err) {
      return { text: withMenu(`No pude crear la tarea: ${err.message}`), action: 'error' };
    }
  }

  if (/completa|marcar.*(hecho|completa)/.test(lower)) {
    const pending = listLocalTasks('pending');
    const hit = pending.find((t) => lower.includes(String(t.title).toLowerCase().slice(0, 16)));
    if (hit) {
      completeLocalTask(hit.id);
      return { text: withMenu(`Completada: «${hit.title}».`), action: 'task_done' };
    }
  }

  if (/resumen tareas|cu[aá]ntas tareas/.test(lower)) {
    const s = localTasksSummary();
    return {
      text: withMenu(`Resumen local → pendientes: ${s.pendiente}, en progreso: ${s.en_progreso}, completadas: ${s.completada}.`),
      action: 'summary'
    };
  }

  if (/ayuda|comandos|qu[eé] puedes/.test(lower)) {
    return {
      text: withMenu(
        'Offline puedo: crear/listar/completar tareas, hora/fecha, historial local, menú numerado. Con internet: CRM, WhatsApp, web e IA cloud.'
      ),
      action: 'help'
    };
  }

  return {
    text: withMenu(
      `🔌 Modo offline activo — usando motor local.\nRecibí: «${text.slice(0, 180)}». Sin red no puedo usar CRM/IA cloud. Prueba «crea tarea …», «lista tareas» o «ayuda».`
    ),
    action: 'fallback'
  };
}

export function parseMenuOptions(text) {
  const lines = String(text || '').split('\n');
  const opts = [];
  for (const line of lines) {
    const m = line.match(/^\s*\[(\d+)\]\s+(.+)/);
    if (m) opts.push({ id: m[1], label: m[2].trim() });
  }
  return opts;
}
