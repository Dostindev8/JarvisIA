import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const HologramParticles = lazy(() => import('./HologramParticles'));

const STATUS_LABEL = {
  idle: 'En espera',
  listening: 'Escuchando',
  thinking: 'Pensando',
  speaking: 'Hablando',
  error: 'Error'
};

const TINTS = {
  listening: 'radial-gradient(circle at 50% 45%, rgba(0,255,178,0.55), rgba(0,255,178,0.08) 60%, transparent 72%)',
  thinking: 'radial-gradient(circle at 50% 45%, rgba(123,97,255,0.6), rgba(123,97,255,0.1) 60%, transparent 72%)',
  error: 'radial-gradient(circle at 50% 45%, rgba(233,69,96,0.7), rgba(233,69,96,0.12) 60%, transparent 72%)'
};

const CORE_MOTION = {
  idle: { animate: { scale: [0.97, 1.03, 0.97] }, transition: { duration: 4, ease: 'easeInOut', repeat: Infinity } },
  listening: { animate: { scale: 1.07 }, transition: { type: 'spring', stiffness: 160, damping: 18 } },
  thinking: { animate: { scale: [1, 1.05, 1] }, transition: { duration: 0.9, ease: 'easeInOut', repeat: Infinity } },
  speaking: { animate: { scale: 1.02 }, transition: { type: 'spring', stiffness: 160, damping: 20 } },
  error: { animate: { scale: [1, 0.95, 1] }, transition: { duration: 0.35 } }
};

function useAfterFirstPaint() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let idleId;
    const frame = requestAnimationFrame(() => {
      if ('requestIdleCallback' in window) idleId = window.requestIdleCallback(() => setReady(true), { timeout: 1200 });
      else idleId = setTimeout(() => setReady(true), 300);
    });
    return () => {
      cancelAnimationFrame(frame);
      if ('cancelIdleCallback' in window) window.cancelIdleCallback(idleId);
      clearTimeout(idleId);
    };
  }, []);
  return ready;
}

function useIsCompact() {
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const onChange = (e) => setCompact(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return compact;
}

/**
 * Holograma JarvisIA (orbe de energía). Estados: idle · listening · thinking · speaking · error.
 * Con reduced motion: sin partículas ni movimiento, solo fundidos de opacidad.
 */
export default function HologramAgent({ status, amplitudeRef, reducedMotion = false, onFps }) {
  const statusRef = useRef(status);
  const coreRef = useRef(null);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  const ready = useAfterFirstPaint();
  const compact = useIsCompact();
  const animated = !reducedMotion;
  const reactive = animated && (status === 'speaking' || status === 'listening');

  useEffect(() => {
    const el = coreRef.current;
    if (!el) return undefined;
    if (!reactive) {
      el.style.setProperty('--amp', '0');
      return undefined;
    }
    let raf = 0;
    const tick = () => {
      el.style.setProperty('--amp', String(amplitudeRef.current || 0));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reactive, amplitudeRef]);

  const coreMotion = animated ? CORE_MOTION[status] || CORE_MOTION.idle : { animate: { scale: 1 }, transition: { duration: 0 } };

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: 'clamp(180px, min(40vh, 60vw), 420px)', aspectRatio: '1 / 1' }}
      role="img"
      aria-label={`Holograma de JarvisIA — ${STATUS_LABEL[status] || STATUS_LABEL.idle}`}
      data-status={status}
    >
      <div
        className="absolute inset-[6%] rounded-full blur-2xl"
        style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.18), rgba(30,64,175,0.08) 55%, transparent 70%)' }}
        aria-hidden
      />

      {animated && ready && (
        <Suspense fallback={null}>
          <HologramParticles statusRef={statusRef} amplitudeRef={amplitudeRef} dense={!compact} onFps={onFps} />
        </Suspense>
      )}

      {animated && (
        <>
          <div className="absolute inset-[22%] rounded-full border border-jarvis-cyan/20 animate-[spin_36s_linear_infinite]" aria-hidden />
          <div className="absolute inset-[18%] rounded-full border border-dashed border-sky-400/15 animate-[spin_52s_linear_infinite_reverse]" aria-hidden />
        </>
      )}
      {!animated && <div className="absolute inset-[24%] rounded-full border border-jarvis-cyan/30" aria-hidden />}

      <motion.div className="relative w-[42%] aspect-square" animate={coreMotion.animate} transition={coreMotion.transition}>
        <div
          ref={coreRef}
          className="absolute inset-0 rounded-full"
          style={{
            transform: 'scale(calc(1 + var(--amp, 0) * 0.09))',
            background:
              'radial-gradient(circle at 38% 32%, rgba(224,247,255,0.95), rgba(0,212,255,0.85) 22%, rgba(14,116,244,0.55) 52%, rgba(10,10,21,0.1) 72%)',
            boxShadow: '0 0 40px rgba(0,212,255,0.55), 0 0 120px rgba(0,212,255,0.25), inset 0 0 30px rgba(255,255,255,0.25)'
          }}
        >
          {Object.entries(TINTS).map(([key, bg]) => (
            <motion.div
              key={key}
              className="absolute inset-0 rounded-full"
              style={{ background: bg }}
              initial={false}
              animate={{ opacity: status === key ? 1 : 0 }}
              transition={{ duration: animated ? 0.35 : 0.2 }}
              aria-hidden
            />
          ))}
          <div className="absolute inset-[18%] rounded-full border border-white/20" aria-hidden />
        </div>
      </motion.div>
    </div>
  );
}
