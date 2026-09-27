const SPEAKER_LABEL = { agent: 'JarvisIA', user: 'Tú', system: 'Sistema' };

/**
 * Subtítulos en vivo. La región aria-live solo anuncia lo que dice el agente o el sistema;
 * la transcripción parcial del usuario se muestra aparte para no saturar al lector de pantalla.
 */
export default function CaptionBar({ caption, speaker, status, interim }) {
  const showInterim = status === 'listening';
  const isError = status === 'error';
  const announce = speaker !== 'user' ? caption : '';

  return (
    <div className="w-full max-w-2xl min-h-[4.5rem] px-4 text-center">
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announce}
      </p>
      {showInterim ? (
        <p className="text-sm sm:text-base text-emerald-200/90 italic" aria-hidden>
          {interim || 'Te escucho…'}
        </p>
      ) : caption ? (
        <p key={`${speaker}-${caption}`} className="animate-[captionIn_0.35s_ease-out] motion-reduce:animate-none" aria-hidden>
          <span
            className={`block text-[10px] font-jarvis uppercase tracking-[0.3em] mb-1 ${isError ? 'text-jarvis-red' : speaker === 'user' ? 'text-white/50' : 'text-jarvis-cyan/80'}`}
          >
            {SPEAKER_LABEL[speaker] || SPEAKER_LABEL.agent}
          </span>
          <span className={`text-sm sm:text-base leading-relaxed ${isError ? 'text-red-200' : 'text-white/90'}`}>{caption}</span>
        </p>
      ) : null}
    </div>
  );
}
