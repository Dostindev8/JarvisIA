import { useEffect, useRef } from 'react';

const COLORS = {
  idle: [0, 212, 255],
  listening: [0, 255, 178],
  thinking: [123, 97, 255],
  speaking: [0, 212, 255],
  error: [233, 69, 96]
};

const MOTION = {
  idle: { radius: 1, speed: 1 },
  listening: { radius: 1.06, speed: 1.35 },
  thinking: { radius: 0.62, speed: 2.6 },
  speaking: { radius: 1.02, speed: 1.2 },
  error: { radius: 1.1, speed: 0.55 }
};

const LAYERS_DESKTOP = [
  { count: 64, radius: 0.62, tilt: 0.34, speed: 0.00022, size: 2.4, spin: 0.00004 },
  { count: 46, radius: 0.78, tilt: 0.56, speed: -0.00015, size: 2, spin: -0.00003 },
  { count: 30, radius: 0.93, tilt: 0.22, speed: 0.0001, size: 1.6, spin: 0.00002 }
];
const LAYERS_MOBILE = [LAYERS_DESKTOP[0]];

function makeSprite() {
  const s = document.createElement('canvas');
  s.width = 32;
  s.height = 32;
  const g = s.getContext('2d');
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.65)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return s;
}

function tintSprite(sprite, [r, g, b]) {
  const c = document.createElement('canvas');
  c.width = sprite.width;
  c.height = sprite.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(sprite, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

function buildParticles(layers) {
  return layers.map((layer, li) => ({
    ...layer,
    rot: li * 1.1,
    items: Array.from({ length: layer.count }, (_, i) => ({
      angle: (i / layer.count) * Math.PI * 2 + Math.random() * 0.3,
      jitter: 0.9 + Math.random() * 0.2,
      phase: Math.random()
    }))
  }));
}

/**
 * Partículas orbitales + waveform circular en Canvas 2D.
 * Lee `statusRef` y `amplitudeRef` en cada frame: cero re-renders de React durante la animación.
 */
export default function HologramParticles({ statusRef, amplitudeRef, dense = true, onFps }) {
  const canvasRef = useRef(null);
  const onFpsRef = useRef(onFps);
  useEffect(() => {
    onFpsRef.current = onFps;
  }, [onFps]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const base = makeSprite();
    const sprites = Object.fromEntries(Object.entries(COLORS).map(([k, c]) => [k, tintSprite(base, c)]));
    const layers = buildParticles(dense ? LAYERS_DESKTOP : LAYERS_MOBILE);
    const dprCap = dense ? 2 : 1.5;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let visible = true;
    let radiusMul = 1;
    let speedMul = 1;
    let color = [...COLORS.idle];
    let last = performance.now();
    let frames = 0;
    let fpsWindow = last;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    };

    const draw = (now) => {
      raf = requestAnimationFrame(draw);
      if (!visible || !width) return;
      const dt = Math.min(now - last, 50);
      last = now;

      frames += 1;
      if (now - fpsWindow >= 1000) {
        onFpsRef.current?.(Math.round((frames * 1000) / (now - fpsWindow)));
        frames = 0;
        fpsWindow = now;
      }

      const status = statusRef.current in MOTION ? statusRef.current : 'idle';
      const amp = Math.max(0, Math.min(1, amplitudeRef.current || 0));
      const target = MOTION[status];
      const targetRadius = target.radius + (status === 'speaking' ? amp * 0.38 : status === 'listening' ? amp * 0.12 : 0);
      const ease = 1 - Math.exp(-dt / 180);
      radiusMul += (targetRadius - radiusMul) * ease;
      speedMul += (target.speed - speedMul) * ease;
      const tc = COLORS[status];
      color = color.map((c, i) => c + (tc[i] - c) * ease);

      const cx = width / 2;
      const cy = height / 2;
      const half = Math.min(width, height) / 2;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      const sprite = sprites[status];
      for (const layer of layers) {
        layer.rot += layer.spin * dt * speedMul;
        const cosR = Math.cos(layer.rot);
        const sinR = Math.sin(layer.rot);
        for (const p of layer.items) {
          p.angle += layer.speed * dt * speedMul;
          let r = half * layer.radius * radiusMul * p.jitter;
          if (status === 'thinking') {
            p.phase = (p.phase + dt * 0.0006) % 1;
            r *= 0.35 + 0.65 * (1 - p.phase);
          }
          const ex = Math.cos(p.angle) * r;
          const ey = Math.sin(p.angle) * r * layer.tilt;
          const x = cx + ex * cosR - ey * sinR;
          const y = cy + ex * sinR + ey * cosR;
          const depth = (Math.sin(p.angle) + 1) / 2;
          const size = layer.size * (0.55 + depth * 0.9) * (status === 'speaking' ? 1 + amp * 0.6 : 1) * 3;
          ctx.globalAlpha = 0.25 + depth * 0.6;
          ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
        }
      }

      const ringR = half * 0.48;
      const energy = status === 'idle' ? 0.05 : status === 'error' ? 0.1 : 0.12 + amp * 0.88;
      const points = dense ? 120 : 72;
      ctx.globalAlpha = 0.35 + energy * 0.5;
      ctx.strokeStyle = `rgb(${color[0] | 0},${color[1] | 0},${color[2] | 0})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i <= points; i += 1) {
        const a = (i / points) * Math.PI * 2;
        const wave = Math.sin(a * 6 + now * 0.006) * 0.6 + Math.sin(a * 11 - now * 0.004) * 0.4;
        const rr = ringR * (1 + wave * energy * 0.16);
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(canvas);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [dense, statusRef, amplitudeRef]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden />;
}
