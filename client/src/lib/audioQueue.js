const queue = [];
let playing = false;
let onPlayCallback = null;

async function playNext() {
  if (playing || queue.length === 0) return;

  playing = true;
  const audioUrl = queue.shift();
  onPlayCallback?.(audioUrl);

  try {
    const audio = new Audio(audioUrl);
    await new Promise((resolve, reject) => {
      audio.onended = resolve;
      audio.onerror = reject;
      audio.play().catch(reject);
    });
  } catch (err) {
    console.warn('[audioQueue]', err.message);
  } finally {
    playing = false;
    playNext();
  }
}

export const audioQueue = {
  enqueue(audioUrl) {
    if (!audioUrl) return;
    queue.push(audioUrl);
    playNext();
  },
  clear() {
    queue.length = 0;
    playing = false;
  },
  onPlay(callback) {
    onPlayCallback = callback;
  }
};
