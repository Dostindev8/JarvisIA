import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useVoiceAgent } from '../../hooks/useVoiceAgent';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import agentScript from '../../lib/agent-script.json';
import LCSLogo from '../branding/LCSLogo';
import HologramAgent from './HologramAgent';
import CaptionBar from './CaptionBar';
import VoiceControls from './VoiceControls';
import SkylineBackdrop from './SkylineBackdrop';

const INTRO_DELAY_MS = 900;

const devParams = import.meta.env.DEV ? new URLSearchParams(window.location.search) : null;
const simulate = devParams?.get('simulate');
const devResolve =
  simulate === 'network'
    ? () => new Promise((_, reject) => setTimeout(() => reject(new Error('simulated network failure')), 600))
    : simulate === 'timeout'
      ? () => new Promise(() => {})
      : undefined;
const showFps = devParams?.has('fps') ?? false;

export default function Portada() {
  const { isAuthenticated } = useAuth();
  const enterTo = isAuthenticated ? '/operations' : '/login';
  const reducedMotion = usePrefersReducedMotion();
  const agent = useVoiceAgent({ script: agentScript, resolve: devResolve });
  const { playIntro } = agent;
  const [scrolled, setScrolled] = useState(false);
  const [fps, setFps] = useState(null);

  useEffect(() => {
    const id = setTimeout(playIntro, INTRO_DELAY_MS);
    return () => clearTimeout(id);
  }, [playIntro]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const reveal = (delay) =>
    reducedMotion
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3, delay: delay / 2 } }
      : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] } };

  return (
    <div className="relative min-h-[100svh] flex flex-col overflow-x-hidden">
      <SkylineBackdrop />

      <motion.header
        {...reveal(1.2)}
        className={`fixed top-0 inset-x-0 z-30 transition-colors duration-300 ${scrolled ? 'bg-jarvis-void/80 backdrop-blur-cosmos border-b border-jarvis-cyan/10' : 'bg-transparent'}`}
      >
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <Link to="/" className="flex items-center gap-3 min-h-[44px]" aria-label="JarvisIA — inicio">
            <LCSLogo size={34} variant="lcs" />
            <span className="font-jarvis text-xs sm:text-sm tracking-[0.25em] text-white/80">LOGIC CODE SPOT</span>
          </Link>
          <Link
            to={enterTo}
            className="inline-flex items-center gap-2 rounded-lg border border-jarvis-cyan/30 px-4 min-h-[44px] text-sm text-cyan-50 hover:bg-jarvis-cyan/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-jarvis-cyan/60"
          >
            Entrar
            <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </motion.header>

      <section
        aria-label="Agente JarvisIA"
        className="relative z-10 flex-1 flex flex-col items-center justify-center gap-4 sm:gap-5 px-4 pt-20 pb-[6vh]"
      >
        <HologramAgent
          status={agent.status}
          amplitudeRef={agent.amplitudeRef}
          reducedMotion={reducedMotion}
          onFps={showFps ? setFps : undefined}
        />

        <div className="text-center">
          <h1
            className="font-jarvis text-3xl sm:text-5xl tracking-[0.3em] text-cyan-50"
            style={{ textShadow: '0 0 18px rgba(0,212,255,0.55), 0 0 42px rgba(0,153,255,0.35)' }}
          >
            JARVISIA
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-sky-200/70 tracking-wide">Centro de operaciones con IA · Logic Code Spot</p>
        </div>

        <CaptionBar caption={agent.state.caption} speaker={agent.state.speaker} status={agent.status} interim={agent.interim} />

        <motion.div {...reveal(1.4)} className="w-full flex justify-center">
          <VoiceControls
            status={agent.status}
            muted={agent.muted}
            enterTo={enterTo}
            onMic={agent.listen}
            onInterrupt={agent.interrupt}
            onAsk={agent.ask}
            onReplay={agent.playIntro}
            onToggleMute={agent.toggleMute}
          />
        </motion.div>
      </section>

      {showFps && (
        <output className="fixed bottom-3 right-3 z-40 rounded-md bg-black/70 px-2 py-1 font-mono text-xs text-emerald-300" data-testid="fps">
          {fps ?? '—'} fps
        </output>
      )}
    </div>
  );
}
