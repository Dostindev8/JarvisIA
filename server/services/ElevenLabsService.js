const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';

async function textToSpeech(text, voiceId) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ElevenLabs no configurado');
  }

  const vid = voiceId || process.env.ELEVENLABS_VOICE_ID;
  if (!vid) {
    throw new Error('ELEVENLABS_VOICE_ID no configurado');
  }

  const response = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${vid}/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
      Accept: 'audio/mpeg'
    },
    body: JSON.stringify({
      text: String(text).slice(0, 5000),
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`ElevenLabs error ${response.status}: ${errText}`);
  }

  return response;
}

async function listVoices() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return [];

  const response = await fetch(`${ELEVENLABS_BASE}/voices`, {
    headers: { 'xi-api-key': apiKey }
  });

  if (!response.ok) return [];
  const data = await response.json();
  return data.voices || [];
}

module.exports = { textToSpeech, listVoices };
