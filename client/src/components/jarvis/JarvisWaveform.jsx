import { useEffect, useRef } from 'react';

export default function JarvisWaveform({ amplitude = 0, isActive = false }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const reducedMotion = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    const bars = 20;

    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const barWidth = width / bars - 2;
      for (let i = 0; i < bars; i += 1) {
        const wave = Math.sin(i * 0.5 + Date.now() / 200) * 0.3 + 0.7;
        const h =
          isActive && !reducedMotion.current
            ? ((amplitude / 255) * height * 0.8 + 4) * wave
            : 4;

        const x = i * (barWidth + 2);
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, '#39FF14');
        gradient.addColorStop(1, '#00A3FF');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, height - h, barWidth, h);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [amplitude, isActive]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={48}
      className="w-full max-w-md h-12"
      aria-hidden="true"
    />
  );
}
