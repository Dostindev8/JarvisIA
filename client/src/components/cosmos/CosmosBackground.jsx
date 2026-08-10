import { useRef, useState, useEffect } from 'react';
import { useStarField } from '../../hooks/useStarField';

export default function CosmosBackground({ intensity = 'full' }) {
  const canvasRef = useRef(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    setIsMobile(window.innerWidth < 640);
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => {
      mq.removeEventListener('change', onChange);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useStarField(canvasRef, !reducedMotion && intensity === 'full');

  if (reducedMotion) {
    return <div className="fixed inset-0 -z-10 bg-jarvis-void" aria-hidden />;
  }

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 'var(--z-particles)' }} aria-hidden>
      <div className="absolute inset-0 bg-jarvis-void" />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {!isMobile && (
        <>
          <div
            className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full opacity-80"
            style={{
              background: 'radial-gradient(circle, rgba(233,69,96,0.08) 0%, transparent 70%)',
              animation: 'float 20s ease-in-out infinite'
            }}
          />
          <div
            className="absolute top-1/3 -right-40 w-[800px] h-[800px] rounded-full opacity-60"
            style={{
              background: 'radial-gradient(circle, rgba(123,97,255,0.06) 0%, transparent 70%)',
              animation: 'float 25s ease-in-out infinite reverse'
            }}
          />
          <div
            className="absolute -bottom-20 left-0 w-[500px] h-[500px] rounded-full opacity-50"
            style={{
              background: 'radial-gradient(circle, rgba(201,168,76,0.05) 0%, transparent 70%)',
              animation: 'float 30s ease-in-out infinite'
            }}
          />
        </>
      )}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)'
        }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)' }}
      />
    </div>
  );
}
