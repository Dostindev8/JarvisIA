import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Keyboard, Mic, Play, Send, Square, Volume2, VolumeX } from 'lucide-react';

const MIC_LABEL = {
  idle: 'Hablar con Jarvis',
  listening: 'Escuchando… toca para enviar',
  thinking: 'Detener',
  speaking: 'Detener',
  error: 'Reintentar'
};

export default function VoiceControls({ status, muted, enterTo, onMic, onInterrupt, onAsk, onReplay, onToggleMute }) {
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState('');
  const inputId = useId();
  const busy = status === 'thinking' || status === 'speaking';
  const listening = status === 'listening';

  const handleMic = () => (busy ? onInterrupt() : onMic());

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAsk(text);
    setText('');
  };

  return (
    <div className="w-full max-w-xl flex flex-col items-center gap-4 px-4">
      <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleMic}
          aria-pressed={listening}
          className={`group inline-flex items-center justify-center gap-2 rounded-xl border backdrop-blur-md px-5 min-h-[52px] sm:min-h-[48px] text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-jarvis-cyan/60 ${
            listening
              ? 'border-emerald-300/60 bg-emerald-400/15 text-emerald-100'
              : status === 'error'
                ? 'border-jarvis-red/50 bg-jarvis-red/10 text-red-100'
                : 'border-jarvis-cyan/40 bg-jarvis-cyan/10 text-cyan-50 hover:bg-jarvis-cyan/20'
          }`}
        >
          {busy ? <Square size={16} aria-hidden /> : <Mic size={18} aria-hidden className={listening ? 'animate-pulse' : ''} />}
          {MIC_LABEL[status] || MIC_LABEL.idle}
        </button>

        <Link
          to={enterTo}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-jarvis-cyan px-6 min-h-[48px] text-sm font-semibold text-jarvis-void shadow-glow-cyan transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          Entrar al centro de operaciones
          <ArrowRight size={16} aria-hidden />
        </Link>
      </div>

      <div className="flex items-center gap-1 text-white/50">
        <button type="button" onClick={onReplay} className="icon-btn hover:!text-jarvis-cyan" aria-label="Escuchar presentación" title="Escuchar presentación">
          <Play size={18} aria-hidden />
        </button>
        <button
          type="button"
          onClick={onToggleMute}
          aria-pressed={muted}
          className="icon-btn hover:!text-jarvis-cyan"
          aria-label={muted ? 'Activar voz' : 'Silenciar voz'}
          title={muted ? 'Activar voz' : 'Silenciar voz'}
        >
          {muted ? <VolumeX size={18} aria-hidden /> : <Volume2 size={18} aria-hidden />}
        </button>
        <button
          type="button"
          onClick={() => setTyping((v) => !v)}
          aria-expanded={typing}
          aria-controls={inputId}
          className="icon-btn hover:!text-jarvis-cyan"
          aria-label="Escribir una pregunta"
          title="Escribir una pregunta"
        >
          <Keyboard size={18} aria-hidden />
        </button>
      </div>

      {typing && (
        <form onSubmit={submit} className="w-full flex gap-2" id={inputId}>
          <label htmlFor={`${inputId}-q`} className="sr-only">
            Pregunta para JarvisIA
          </label>
          <input
            id={`${inputId}-q`}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={300}
            autoComplete="off"
            placeholder="Ej.: ¿qué eres?"
            className="flex-1 rounded-xl bg-jarvis-void/60 border border-jarvis-cyan/25 px-4 min-h-[44px] text-sm placeholder:text-white/35 focus:outline-none focus:border-jarvis-cyan/60 focus:ring-2 focus:ring-jarvis-cyan/15"
          />
          <button type="submit" className="icon-btn border border-jarvis-cyan/30 !text-jarvis-cyan" aria-label="Enviar pregunta">
            <Send size={16} aria-hidden />
          </button>
        </form>
      )}
    </div>
  );
}
