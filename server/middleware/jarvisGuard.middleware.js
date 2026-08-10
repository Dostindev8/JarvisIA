const INJECTION_PATTERNS = [
  /ignore previous instructions/i,
  /you are now/i,
  /disregard your/i,
  /act as if/i,
  /pretend you are/i,
  /new system prompt/i,
  /\[SYSTEM\]/i,
  /\[INST\]/i
];

function sanitizeUserMessage(message) {
  if (typeof message !== 'string') return '';
  const clean = message.trim().substring(0, 4000);
  if (INJECTION_PATTERNS.some((p) => p.test(clean))) {
    console.warn('[JARVIS GUARD] Intento de prompt injection bloqueado');
    throw new Error('Mensaje no permitido.');
  }
  return clean;
}

function validateToolInput(toolName, toolInput = {}) {
  const validators = {
    get_clients: (input) => {
      const ok = ['ACTIVO', 'VENCIDO', 'LEAD', 'SUSPENDIDO', 'EN_RIESGO', 'NEGOCIANDO', 'CERRADO'];
      if (input.status && !ok.includes(input.status)) throw new Error('Status inválido');
    },
    send_whatsapp: (input) => {
      if (!input.phone?.match(/^\+?[1-9]\d{6,14}$/)) throw new Error('Teléfono inválido');
      if (!input.message || input.message.length > 4096) throw new Error('Mensaje inválido');
    },
    music_set_volume: (input) => {
      if (typeof input.level !== 'number' || input.level < 0 || input.level > 100) {
        throw new Error('Volumen inválido');
      }
    },
    jarvis_remember: (input) => {
      const ok = ['preference', 'fact', 'feedback', 'pattern'];
      if (input.type && !ok.includes(input.type)) throw new Error('Tipo de memoria inválido');
      if (input.importance != null && (input.importance < 1 || input.importance > 5)) {
        throw new Error('Importancia debe ser 1-5');
      }
    }
  };
  if (validators[toolName]) validators[toolName](toolInput);
}

module.exports = { sanitizeUserMessage, validateToolInput };
