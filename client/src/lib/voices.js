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

const VOICE_PRIORITY = [
  'microsoft sabina',
  'microsoft pablo',
  'google español',
  'paulina',
  'monica',
  'helena',
  'laura',
  'es-mx',
  'es-es',
  'es-us',
  'es-do',
  'es-'
];

export function getAvailableVoices() {
  return loadVoices().filter((v) => v.lang?.startsWith('es') || v.lang?.startsWith('en'));
}

export function pickBestVoice(preferredUri) {
  const voices = getAvailableVoices();
  if (!voices.length) return null;

  if (preferredUri) {
    const saved = voices.find((v) => v.voiceURI === preferredUri || v.name === preferredUri);
    if (saved) return saved;
  }

  const savedName = localStorage.getItem('jarvis_browser_voice');
  if (savedName) {
    const saved = voices.find((v) => v.voiceURI === savedName || v.name === savedName);
    if (saved) return saved;
  }

  for (const key of VOICE_PRIORITY) {
    const match = voices.find((v) => v.name.toLowerCase().includes(key) || v.lang.toLowerCase().includes(key));
    if (match) return match;
  }

  return voices[0];
}

export function getSpeechSettings() {
  return {
    rate: Number(localStorage.getItem('jarvis_tts_rate') || '0.95'),
    pitch: Number(localStorage.getItem('jarvis_tts_pitch') || '0.88'),
    useElevenLabs: localStorage.getItem('jarvis_use_elevenlabs') === 'true'
  };
}
