import { motion } from 'framer-motion';

const STATE_CONFIG = {
  idle: {
    ring: 'border-jarvis-cyan/25',
    glow: 'shadow-[0_0_40px_rgba(0,212,255,0.15)]',
    label: 'En espera'
  },
  listening: {
    ring: 'border-jarvis-emerald/60',
    glow: 'shadow-[0_0_50px_rgba(0,255,178,0.35)]',
    label: 'Escuchando'
  },
  thinking: {
    ring: 'border-jarvis-violet/55',
    glow: 'shadow-[0_0_50px_rgba(123,97,255,0.35)]',
    label: 'Procesando galaxia'
  },
  speaking: {
    ring: 'border-jarvis-gold/50',
    glow: 'shadow-[0_0_50px_rgba(201,168,76,0.3)]',
    label: 'Respondiendo'
  }
};

export default function JarvisOrb({ state = 'idle', amplitude = 0 }) {
  const cfg = STATE_CONFIG[state] || STATE_CONFIG.idle;
  const scale = state === 'speaking' ? 1 + (amplitude / 255) * 0.14 : 1;

  return (
    <div className="flex flex-col items-center gap-4 perspective-[800px]">
      <div className="relative flex items-center justify-center w-44 h-44 sm:w-52 sm:h-52 lg:w-60 lg:h-60">
        <div className="absolute inset-0 rounded-full border border-jarvis-cyan/10 animate-[spin_40s_linear_infinite] motion-reduce:animate-none" />
        <div className="absolute inset-2 rounded-full border border-dashed border-jarvis-violet/15 animate-[spin_28s_linear_infinite_reverse] motion-reduce:animate-none" />
        <div className="absolute -inset-4 rounded-full bg-[radial-gradient(circle,rgba(0,212,255,0.08),transparent_65%)] blur-xl" />

        <motion.div
          className={`absolute inset-4 rounded-full border-2 ${cfg.ring} ${cfg.glow} motion-reduce:transition-none`}
          animate={{ scale, rotateX: state === 'thinking' ? 8 : 0 }}
          transition={{ type: 'spring', stiffness: 140, damping: 20 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {state === 'thinking' && (
            <div className="absolute inset-0 rounded-full border border-dashed border-jarvis-violet/30 animate-orb-think motion-reduce:animate-none" />
          )}
        </motion.div>

        <div
          className="relative w-32 h-32 sm:w-36 sm:h-36 lg:w-40 lg:h-40 rounded-full overflow-hidden border border-white/10"
          style={{
            background:
              'radial-gradient(circle at 30% 25%, rgba(0,212,255,0.25), transparent 45%), radial-gradient(circle at 70% 70%, rgba(123,97,255,0.2), transparent 50%), linear-gradient(145deg, #1E1E35, #0A0A15)',
            boxShadow: 'inset 0 0 40px rgba(0,212,255,0.15), 0 20px 60px rgba(0,0,0,0.45)',
            transform: 'rotateX(12deg) rotateY(-8deg)',
            transformStyle: 'preserve-3d'
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(201,168,76,0.12),transparent_50%)]" />
          <div className="flex items-end justify-center gap-[3px] h-full pb-10">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => {
              const h =
                state === 'speaking' || state === 'listening'
                  ? 8 + (amplitude / 255) * 28 * (0.55 + Math.sin(i * 1.2) * 0.45)
                  : state === 'thinking'
                    ? 6 + (i % 4) * 4
                    : 5 + (i % 3);
              return (
                <motion.span
                  key={i}
                  className="w-[3px] rounded-full bg-gradient-to-t from-jarvis-cyan to-jarvis-emerald"
                  animate={{ height: h }}
                  transition={{ duration: 0.15 }}
                  style={{
                    boxShadow: state !== 'idle' ? '0 0 8px rgba(0,212,255,0.55)' : undefined
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      <span className="chip border-jarvis-cyan/25 text-jarvis-cyan bg-jarvis-cyan/5 font-jarvis tracking-wider text-[10px] uppercase">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            state === 'idle'
              ? 'bg-zinc-500'
              : state === 'listening'
                ? 'bg-jarvis-emerald animate-pulse'
                : 'bg-jarvis-violet'
          }`}
        />
        {cfg.label}
      </span>
    </div>
  );
}
