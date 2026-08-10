let cachedVoices = [];

export function loadVoices() {
  if (!window.speechSynthesis) return [];
  cachedVoices = window.speechSynthesis.getVoices();
  return cachedVoices;
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

// Voces masculinas naturales en español (estilo mayordomo / JARVIS)
const MALE_PREMIUM = [
  'jorge', 'alvaro', 'álvaro', 'pablo', 'diego', 'raul', 'raúl',
  'enrique', 'antonio', 'carlos', 'miguel', 'jorge online'
];
const FEMALE_PREMIUM = [
  'dalia', 'elvira', 'sabina', 'paulina', 'monica', 'mónica',
  'helena', 'laura', 'lucia', 'lucía', 'sofia', 'sofía'
];

export function getAvailableVoices() {
  return loadVoices().filter((v) => v.lang?.toLowerCase().startsWith('es'));
}

/**
 * Puntúa cada voz: prioriza masculina neural ES (JARVIS), luego natural/online.
 */
function scoreVoice(v) {
  const name = (v.name || '').toLowerCase();
  const lang = (v.lang || '').toLowerCase();
  let score = 0;

  if (/(natural|neural|online|premium|wavenet|studio)/.test(name)) score += 100;
  if (MALE_PREMIUM.some((n) => name.includes(n))) score += 80;
  if (FEMALE_PREMIUM.some((n) => name.includes(n))) score += 25;
  if (name.includes('google')) score += 30;
  if (name.includes('microsoft')) score += 20;
  if (/(female|mujer|zira|samantha)/.test(name)) score -= 40;

  if (lang.startsWith('es-mx')) score += 14;
  else if (lang.startsWith('es-es')) score += 12;
  else if (lang.startsWith('es-us')) score += 10;
  else if (lang.startsWith('es-419') || lang.startsWith('es-do')) score += 9;
  else if (lang.startsWith('es')) score += 5;

  return score;
}

export function pickBestVoice(preferredUri) {
  const voices = getAvailableVoices();
  if (!voices.length) return null;

  const explicit = preferredUri || localStorage.getItem('jarvis_browser_voice');
  if (explicit) {
    const saved = voices.find((v) => v.voiceURI === explicit || v.name === explicit);
    if (saved) return saved;
  }

  return [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0];
}

/**
 * useElevenLabs:
 * - 'auto' (default) → intenta servidor ElevenLabs y cae a navegador
 * - 'true' → fuerza ElevenLabs
 * - 'false' → solo navegador
 */
export function getSpeechSettings() {
  const flag = localStorage.getItem('jarvis_use_elevenlabs');
  return {
    rate: Number(localStorage.getItem('jarvis_tts_rate') || '0.95'),
    pitch: Number(localStorage.getItem('jarvis_tts_pitch') || '0.95'),
    useElevenLabs: flag === null || flag === '' ? 'auto' : flag === 'true' ? true : flag === 'false' ? false : 'auto'
  };
}
