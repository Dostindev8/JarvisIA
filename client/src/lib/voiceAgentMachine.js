/**
 * Máquina de estados del agente de la portada.
 * idle → listening → thinking → speaking → idle · error desde cualquier estado → idle.
 * Cada turno lleva un `turn` incremental: los callbacks asíncronos de un turno viejo se descartan.
 */

export const AGENT_STATES = Object.freeze({
  IDLE: 'idle',
  LISTENING: 'listening',
  THINKING: 'thinking',
  SPEAKING: 'speaking',
  ERROR: 'error'
});

const { IDLE, LISTENING, THINKING, SPEAKING, ERROR } = AGENT_STATES;

export const initialAgentState = Object.freeze({
  status: IDLE,
  turn: 0,
  caption: '',
  speaker: 'agent',
  error: null
});

const TRANSITIONS = {
  LISTEN: [IDLE, SPEAKING, ERROR],
  HEARD: [LISTENING],
  ASK: [IDLE, SPEAKING, ERROR],
  RESPOND: [IDLE, THINKING],
  SPEAK_END: [SPEAKING],
  STOP: [LISTENING, THINKING, SPEAKING],
  FAIL: [IDLE, LISTENING, THINKING, SPEAKING],
  RESET: [ERROR]
};

export function canTransition(status, type) {
  return TRANSITIONS[type]?.includes(status) ?? false;
}

export function agentReducer(state, event) {
  if (!canTransition(state.status, event.type)) return state;
  const startsTurn = event.type === 'LISTEN' || event.type === 'ASK' || (event.type === 'RESPOND' && state.status === IDLE);
  if (!startsTurn && event.turn !== undefined && event.turn !== state.turn) return state;

  switch (event.type) {
    case 'LISTEN':
      return { status: LISTENING, turn: state.turn + 1, caption: '', speaker: 'user', error: null };
    case 'HEARD':
      return { ...state, status: THINKING, caption: event.text, speaker: 'user' };
    case 'ASK':
      return { status: THINKING, turn: state.turn + 1, caption: event.text, speaker: 'user', error: null };
    case 'RESPOND':
      return {
        status: SPEAKING,
        turn: state.status === IDLE ? state.turn + 1 : state.turn,
        caption: event.text,
        speaker: 'agent',
        error: null
      };
    case 'SPEAK_END':
    case 'STOP':
      return { ...state, status: IDLE };
    case 'FAIL':
      return { ...state, status: ERROR, caption: event.message, speaker: 'system', error: event.message };
    case 'RESET':
      return { ...state, status: IDLE, error: null };
    default:
      return state;
  }
}

export function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsPhrase(haystack, phrase) {
  const needle = normalizeText(phrase);
  if (!needle) return false;
  return ` ${haystack} `.includes(` ${needle} `);
}

/**
 * Resuelve una pregunta SOLO contra el guion versionado. Sin coincidencia → fallback.
 * Orden del array `faq` = prioridad.
 */
export function matchIntent(script, text) {
  const haystack = normalizeText(text);
  if (haystack) {
    for (const item of script.faq || []) {
      if ((item.trigger || []).some((t) => containsPhrase(haystack, t))) {
        return { id: item.id, source: 'faq', response: item.response, speech: item.speech || item.response };
      }
    }
  }
  return { id: 'fallback', source: 'fallback', response: script.fallback, speech: script.fallback };
}
