import { useState } from 'react';
import { motion } from 'framer-motion';
import { Music, Pause, Play, SkipBack, SkipForward } from 'lucide-react';

export default function JarvisMusicPlayer({
  currentTrack,
  isPlaying,
  progress,
  volume,
  onPlay,
  onPause,
  onNext,
  onPrev,
  onVolumeChange,
  onSeek
}) {
  const [expanded, setExpanded] = useState(false);
  const active = !!currentTrack;

  if (!active && !expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 glass-panel rounded-full px-4 py-3 flex items-center gap-2 border border-jarvis-gold/20 min-h-[44px]"
        aria-label="Abrir reproductor de música"
      >
        <Music className="w-5 h-5 text-jarvis-gold" />
        <span className="text-sm text-jarvis-gold hidden sm:inline">Music</span>
      </button>
    );
  }

  return (
    <motion.div
      drag
      dragConstraints={{ left: -200, right: 200, top: -200, bottom: 200 }}
      className="fixed bottom-20 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:bottom-6 sm:right-6 z-50 w-[min(100%,320px)] glass-panel rounded-2xl p-4 border border-jarvis-gold/20 shadow-xl"
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-jarvis-gold/10 flex items-center justify-center shrink-0">
          <Music className="w-6 h-6 text-jarvis-gold" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{currentTrack?.title || 'Sin pista'}</p>
          <p className="text-xs text-white/50 truncate">{currentTrack?.artist || 'Biblioteca local'}</p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-white/40 hover:text-white text-xs min-w-[44px] min-h-[44px]"
          aria-label="Colapsar reproductor"
        >
          —
        </button>
      </div>

      <div className="flex items-center justify-center gap-4 mt-3">
        <button type="button" onClick={onPrev} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-jarvis-gold" aria-label="Anterior">
          <SkipBack size={20} />
        </button>
        <button
          type="button"
          onClick={isPlaying ? onPause : onPlay}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-jarvis-gold"
          aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>
        <button type="button" onClick={onNext} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-jarvis-gold" aria-label="Siguiente">
          <SkipForward size={20} />
        </button>
      </div>

      <input
        type="range"
        min="0"
        max="100"
        value={progress || 0}
        onChange={(e) => onSeek?.(Number(e.target.value))}
        className="w-full mt-3 accent-jarvis-gold"
        aria-label="Progreso de la pista"
      />

      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-white/40">Vol</span>
        <input
          type="range"
          min="0"
          max="100"
          value={volume || 70}
          onChange={(e) => onVolumeChange?.(Number(e.target.value))}
          className="flex-1 accent-jarvis-gold"
          aria-label="Volumen"
        />
      </div>
    </motion.div>
  );
}
