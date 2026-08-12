/**
 * Menú post-respuesta obligatorio (mega-prompt §5.6).
 * Se adjunta a toda respuesta de texto si aún no hay menú numerado.
 */

const DEFAULT_MENU = [
  'Continuar conversación',
  'Ver mis tareas pendientes',
  'Crear una nueva tarea',
  'Buscar en mi historial',
  'Ver estado de conexión (online/offline)',
  'Configuración'
];

function hasMenu(text) {
  const t = String(text || '');
  return /¿Qué deseas hacer ahora\?/i.test(t) || /\[1\]\s*Continuar/i.test(t) || /^\s*\[1\]/m.test(t);
}

function formatMenu(options = DEFAULT_MENU) {
  const lines = options.map((label, i) => `  [${i + 1}] ${label}`);
  return [
    '',
    '──────────────────────────────────────────',
    ' ¿Qué deseas hacer ahora?',
    ...lines,
    '  [0] Salir / cerrar menú',
    '──────────────────────────────────────────',
    'Elige una opción o escribe tu siguiente mensaje:'
  ].join('\n');
}

function appendPostResponseMenu(text, { offline = false, customOptions } = {}) {
  const body = String(text || '').trim();
  if (!body) return formatMenu(customOptions);
  if (hasMenu(body)) return body;
  const prefix = offline ? '🔌 Modo offline activo — usando motor local.\n\n' : '';
  // Evitar duplicar prefijo offline
  const cleaned = body.replace(/^🔌 Modo offline[^\n]*\n*/i, '');
  return `${offline ? prefix : ''}${cleaned}${formatMenu(customOptions)}`;
}

function resolveMenuChoice(input) {
  const raw = String(input || '').trim();
  if (/^0$/.test(raw)) return { type: 'exit' };
  if (/^1$/.test(raw)) return { type: 'continue' };
  if (/^2$/.test(raw)) return { type: 'list_tasks' };
  if (/^3$/.test(raw)) return { type: 'create_task_prompt' };
  if (/^4$/.test(raw)) return { type: 'history' };
  if (/^5$/.test(raw)) return { type: 'status' };
  if (/^6$/.test(raw)) return { type: 'settings' };
  return { type: 'message', text: raw };
}

module.exports = {
  appendPostResponseMenu,
  formatMenu,
  hasMenu,
  resolveMenuChoice,
  DEFAULT_MENU
};
