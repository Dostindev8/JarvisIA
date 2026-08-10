import { useEffect, useState } from 'react';

export default function JarvisSubtitles({
  userText = '',
  jarvisText = '',
  isListening = false,
  isSpeaking = false,
  interimTranscript = ''
}) {
  const [displayed, setDisplayed] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!jarvisText) {
      setDisplayed('');
      return undefined;
    }
    let i = 0;
    setDisplayed('');
    const t = setInterval(() => {
      i += 1;
      setDisplayed(jarvisText.slice(0, i));
      if (i >= jarvisText.length) clearInterval(t);
    }, 18);
    return () => clearInterval(t);
  }, [jarvisText]);

  const userLine = userText || (isListening ? interimTranscript : '');

  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      className="surface w-full rounded-xl px-4 py-3 text-left"
    >
      <div className={`space-y-2.5 ${open ? '' : 'max-h-[4.5rem] overflow-hidden'}`}>
        <p className="text-sm leading-relaxed">
          <span className="text-muted font-medium mr-2">Tú</span>
          <span className={interimTranscript && isListening ? 'text-zinc-400' : 'text-zinc-100'}>
            {userLine || '—'}
          </span>
        </p>
        <p className="text-sm leading-relaxed">
          <span className="text-jarvis-gold font-medium mr-2">Jarvis</span>
          <span className="text-zinc-100">{displayed || (isSpeaking ? '...' : '—')}</span>
        </p>
      </div>
    </button>
  );
}
