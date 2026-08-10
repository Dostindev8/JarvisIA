import { motion } from 'framer-motion';

const STATE_CONFIG = {
  idle: {
    ring: 'border-lcs-neon/20',
    glow: 'shadow-orb',
    label: 'En espera'
  },
  listening: {
    ring: 'border-lcs-neon/60',
    glow: 'shadow-orbActive animate-neon-pulse',
    label: 'Escuchando'
  },
  thinking: {
    ring: 'border-lcs-blue/50',
    glow: 'shadow-orb',
    label: 'DostinX8 procesando'
  },
  speaking: {
    ring: 'border-lcs-neon/45',
    glow: 'shadow-orbActive',
    label: 'Respondiendo'
  }
};

export default function JarvisOrb({ state = 'idle', amplitude = 0 }) {
  const cfg = STATE_CONFIG[state] || STATE_CONFIG.idle;
  const scale = state === 'speaking' ? 1 + (amplitude / 255) * 0.12 : 1;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex items-center justify-center w-44 h-44 sm:w-52 sm:h-52 lg:w-56 lg:h-56">
        <div className="absolute inset-0 rounded-full border border-lcs-blue/10" />

        <motion.div
          className={`absolute inset-3 rounded-full border-2 ${cfg.ring} ${cfg.glow} motion-reduce:transition-none`}
          animate={{ scale }}
          transition={{ type: 'spring', stiffness: 140, damping: 20 }}
        >
          {state === 'thinking' && (
            <div className="absolute inset-0 rounded-full border border-dashed border-lcs-blue/25 animate-orb-think motion-reduce:animate-none" />
          )}
        </motion.div>

        <div className="relative w-32 h-32 sm:w-36 sm:h-36 lg:w-40 lg:h-40 rounded-full bg-gradient-to-br from-lcs-elevated to-lcs-navy flex items-center justify-center overflow-hidden neon-border">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(57,255,20,0.1),transparent_55%)]" />
          <div className="flex items-end justify-center gap-[3px] h-10">
            {[0, 1, 2, 3, 4].map((i) => {
              const h =
                state === 'speaking' || state === 'listening'
                  ? 8 + (amplitude / 255) * 24 * (0.6 + Math.sin(i) * 0.4)
                  : state === 'thinking'
                    ? 6 + i * 3
                    : 6;
              return (
                <motion.span
                  key={i}
                  className="w-[3px] rounded-full bg-lcs-neon/90"
                  animate={{ height: h }}
                  transition={{ duration: 0.15 }}
                  style={{ boxShadow: state !== 'idle' ? '0 0 6px rgba(57,255,20,0.5)' : undefined }}
                />
              );
            })}
          </div>
        </div>
      </div>

      <span className="chip border-lcs-neon/25 text-lcs-neon bg-lcs-neon/5">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            state === 'idle' ? 'bg-zinc-500' : state === 'listening' ? 'bg-lcs-neon animate-pulse' : 'bg-lcs-blue'
          }`}
        />
        {cfg.label}
      </span>
    </div>
  );
}
