import { memo, useEffect, useRef } from 'react';

const VIEW_W = 1440;
const VIEW_H = 420;

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildLayer(seed, { minH, maxH, minW, maxW, windows }) {
  const rand = mulberry32(seed);
  const buildings = [];
  const lit = [];
  let x = -20;
  while (x < VIEW_W + 20) {
    const w = minW + rand() * (maxW - minW);
    const h = minH + rand() * (maxH - minH);
    const y = VIEW_H - h;
    const spire = rand() > 0.85;
    buildings.push({ x, y, w, h, spire });
    if (windows) {
      for (let wy = y + 10; wy < VIEW_H - 8; wy += 12) {
        for (let wx = x + 5; wx < x + w - 6; wx += 9) {
          if (rand() < windows) lit.push({ x: wx, y: wy, o: 0.35 + rand() * 0.55 });
        }
      }
    }
    x += w + rand() * 6;
  }
  const d = buildings
    .map(({ x: bx, y, w, spire }) => {
      const top = spire ? `L${bx + w / 2 - 2},${y} L${bx + w / 2},${y - 26} L${bx + w / 2 + 2},${y} ` : '';
      return `M${bx},${VIEW_H} L${bx},${y} ${top}L${bx + w},${y} L${bx + w},${VIEW_H} Z`;
    })
    .join(' ');
  return { d, lit };
}

const FAR = buildLayer(7, { minH: 120, maxH: 260, minW: 36, maxW: 80, windows: 0 });
const MID = buildLayer(21, { minH: 90, maxH: 220, minW: 40, maxW: 96, windows: 0.1 });
const NEAR = buildLayer(42, { minH: 50, maxH: 150, minW: 60, maxW: 130, windows: 0.18 });

/**
 * Skyline nocturno azul neón (fondo compartido portada / operations).
 * SVG estático determinístico; parallax solo con puntero fino y sin reduced motion.
 */
function SkylineBackdrop({ variant = 'full' }) {
  const rootRef = useRef(null);

  useEffect(() => {
    const el = rootRef.current;
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!el || !fine || reduced || variant !== 'full') return undefined;
    let raf = 0;
    let px = 0;
    const onMove = (e) => {
      px = e.clientX / window.innerWidth - 0.5;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        el.style.setProperty('--px', px.toFixed(3));
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [variant]);

  const layer = (depth) => ({
    transform: `translateX(calc(var(--px, 0) * ${-depth}px))`,
    transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)'
  });

  return (
    <div
      ref={rootRef}
      className={`fixed inset-x-0 bottom-0 z-0 pointer-events-none ${variant === 'subtle' ? 'h-[34vh] opacity-45' : 'h-[46vh]'}`}
      aria-hidden
    >
      <div className="absolute inset-0 bg-gradient-to-t from-[#061433] via-[#0a1a44]/60 to-transparent" />
      <div
        className="absolute inset-x-0 bottom-[18%] h-[60%]"
        style={{ background: 'radial-gradient(ellipse 60% 70% at 50% 100%, rgba(0,153,255,0.28), transparent 70%)' }}
      />
      <svg
        className="absolute inset-x-[-3%] bottom-0 w-[106%] h-full"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMax slice"
      >
        <defs>
          <linearGradient id="sky-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#12306e" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#0a1638" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="sky-mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d2458" />
            <stop offset="100%" stopColor="#081230" />
          </linearGradient>
          <linearGradient id="sky-near" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#081a42" />
            <stop offset="100%" stopColor="#040a1c" />
          </linearGradient>
        </defs>
        <g style={layer(6)}>
          <path d={FAR.d} fill="url(#sky-far)" />
        </g>
        <g style={layer(12)}>
          <path d={MID.d} fill="url(#sky-mid)" stroke="rgba(56,189,248,0.18)" strokeWidth="1" />
          {MID.lit.map((w, i) => (
            <rect key={i} x={w.x} y={w.y} width="3" height="4" fill="#7dd3fc" opacity={w.o * 0.6} />
          ))}
        </g>
        <g style={layer(20)}>
          <path d={NEAR.d} fill="url(#sky-near)" stroke="rgba(0,212,255,0.28)" strokeWidth="1.2" />
          {NEAR.lit.map((w, i) => (
            <rect key={i} x={w.x} y={w.y} width="3.5" height="5" fill="#bae6fd" opacity={w.o} />
          ))}
        </g>
        <rect x="0" y={VIEW_H - 2} width={VIEW_W} height="2" fill="#00D4FF" opacity="0.55" />
      </svg>
      <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-jarvis-void to-transparent" />
    </div>
  );
}

export default memo(SkylineBackdrop);
