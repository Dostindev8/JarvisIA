import { Mic, Square } from 'lucide-react';

export default function JarvisVoiceButton({ isListening = false, onToggle, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      title={
        disabled
          ? 'Micrófono no disponible en este navegador'
          : isListening
            ? 'Detener y enviar lo que dijiste'
            : 'Hablar con JARVISIA'
      }
      aria-label={isListening ? 'Detener micrófono' : 'Activar micrófono'}
      aria-pressed={isListening}
      className={`relative w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all min-w-[48px] min-h-[48px] ${
        disabled ? 'opacity-40 cursor-not-allowed' : ''
      } ${
        isListening
          ? 'bg-cyan-400 text-jarvis-void shadow-[0_0_24px_rgba(34,211,238,0.55)] scale-105'
          : 'bg-cyan-500/15 text-cyan-300 hover:bg-cyan-400/25 hover:text-cyan-200 border border-cyan-400/40'
      }`}
    >
      {isListening && (
        <span className="absolute inset-0 rounded-xl animate-ping bg-cyan-400/30 pointer-events-none" />
      )}
      {isListening ? <Square size={16} fill="currentColor" /> : <Mic size={20} />}
    </button>
  );
}
