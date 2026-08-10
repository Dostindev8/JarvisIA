const fs = require('fs');
const path = require('path');

const AUDIO_DIR = path.join(__dirname, '..', 'public', 'audio');

function ensureAudioDir() {
  if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
  }
}

function listAudioFiles() {
  ensureAudioDir();
  const exts = ['.mp3', '.ogg', '.wav', '.flac'];
  return fs.readdirSync(AUDIO_DIR).filter((f) => exts.includes(path.extname(f).toLowerCase()));
}

function searchAudio(query) {
  const q = query.toLowerCase();
  return listAudioFiles()
    .filter((f) => f.toLowerCase().includes(q))
    .map((filename) => ({
      filename,
      title: path.basename(filename, path.extname(filename)),
      url: `/audio/${filename}`
    }));
}

module.exports = { AUDIO_DIR, ensureAudioDir, listAudioFiles, searchAudio };
