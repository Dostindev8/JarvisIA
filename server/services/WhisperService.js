const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function transcribe(audioBuffer, originalName = 'audio.webm') {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API no configurada para STT');
  }

  const client = new OpenAI({ apiKey });
  const tmpPath = path.join(os.tmpdir(), `jarvis-stt-${Date.now()}-${originalName}`);

  try {
    fs.writeFileSync(tmpPath, audioBuffer);
    const transcription = await client.audio.transcriptions.create({
      file: fs.createReadStream(tmpPath),
      model: 'whisper-1',
      language: 'es'
    });
    return transcription.text || '';
  } finally {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
  }
}

module.exports = { transcribe };
