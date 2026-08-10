import { Mic, Square } from 'lucide-react';

export default function JarvisVoiceButton({ isListening = false, onToggle, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label={isListening ? 'Detener micrófono' : 'Activar micrófono'}
      aria-pressed={isListening}
      className={`relative w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all ${
        disabled ? 'opacity-40 cursor-not-allowed' : ''
      } ${
        isListening
          ? 'bg-lcs-neon text-lcs-navy-dark shadow-neon'
          : 'bg-white/[0.04] text-zinc-300 hover:text-lcs-neon hover:bg-lcs-neon/5 border border-lcs-blue/15'
      }`}
    >
      {isListening ? <Square size={16} fill="currentColor" /> : <Mic size={18} />}
    </button>
  );
}
