import { useEffect } from 'react';

function getStarCount() {
  const w = window.innerWidth;
  if (w < 640) return 80;
  if (w < 1024) return 150;
  return 300;
}

export function useStarField(canvasRef, enabled = true) {
  useEffect(() => {
    if (!enabled || !canvasRef.current) return undefined;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animFrameId;
    let mouseX = 0;
    let mouseY = 0;
    let time = 0;
    let paused = document.hidden;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    const count = getStarCount();
    const stars = Array.from({ length: count }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      z: Math.random() * 0.9 + 0.1,
      size: i < count * 0.67 ? Math.random() * 0.5 + 0.5 : Math.random() * 1 + 1,
      opacity: Math.random() * 0.5 + 0.3,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      twinklePhase: Math.random() * Math.PI * 2,
      color: i > count * 0.93 ? (Math.random() > 0.5 ? '#C9A84C' : '#00D4FF') : '#FFFFFF',
      parallaxDepth: Math.random() * 0.02 + 0.005
    }));

    const onMouseMove = (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    const onVisibility = () => { paused = document.hidden; };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('visibilitychange', onVisibility);

    const draw = () => {
      if (!paused) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        time += 1;

        stars.forEach((star) => {
          // Profundidad 3D: estrellas cercanas se mueven más (efecto galaxia)
          star.z -= 0.0012;
          if (star.z <= 0.05) {
            star.z = 1;
            star.x = Math.random();
            star.y = Math.random();
          }
          const depth = star.z;
          const cx = canvas.width / 2;
          const cy = canvas.height / 2;
          const sx = (star.x - 0.5) * (1.2 / depth);
          const sy = (star.y - 0.5) * (1.2 / depth);
          const px = cx + sx * canvas.width * 0.45 + mouseX * star.parallaxDepth * canvas.width * (2 - depth);
          const py = cy + sy * canvas.height * 0.45 + mouseY * star.parallaxDepth * canvas.height * (2 - depth);
          const size = star.size * (1.4 / depth);
          const twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase);
          const currentOpacity = star.opacity * (0.55 + 0.45 * twinkle) * Math.min(1, 1.2 / depth);

          if (size > 1.6) {
            const gradient = ctx.createRadialGradient(px, py, 0, px, py, size * 4);
            gradient.addColorStop(0, `${star.color}AA`);
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(px, py, size * 4, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.globalAlpha = currentOpacity;
          ctx.fillStyle = star.color;
          ctx.beginPath();
          ctx.arc(px, py, Math.max(0.4, size), 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      }
      animFrameId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [canvasRef, enabled]);
}
