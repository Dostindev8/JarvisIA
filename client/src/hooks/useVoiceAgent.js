import { useCallback, useEffect, useRef, useState } from 'react';
import { AGENT_STATES, agentReducer, canTransition, initialAgentState, matchIntent } from '../lib/voiceAgentMachine';
import { pickBestVoice } from '../lib/voices';

const { IDLE, LISTENING, THINKING, SPEAKING, ERROR } = AGENT_STATES;

const SpeechRecognitionCtor =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

const LISTEN_TIMEOUT_MS = 12000;
const STOP_GRACE_MS = 2500;
const THINK_TIMEOUT_MS = 8000;
const MIN_THINK_MS = 450;
const ERROR_HOLD_MS = 2200;
const TTS_SLACK_MS = 6000;

const MESSAGES = {
  unsupported: 'Tu navegador no reconoce voz. Usa Chrome o Edge, o escribe tu pregunta.',
  micDenied: 'Permiso de micrófono denegado. Actívalo en el candado del navegador.',
  micMissing: 'No encontré un micrófono disponible.',
  noSpeech: 'No te escuché. Pulsa el micrófono e intenta de nuevo.',
  sttNetwork: 'El reconocimiento de voz falló por la red. Intenta de nuevo o escribe tu pregunta.',
  sttGeneric: 'No pude entenderte. Intenta de nuevo.',
  startFailed: 'No se pudo iniciar el micrófono. Intenta de nuevo.',
  thinkTimeout: 'La respuesta tardó demasiado. Intenta de nuevo.',
  network: 'Sin conexión con el asistente. Intenta de nuevo.'
};

const STT_ERRORS = {
  'not-allowed': MESSAGES.micDenied,
  'service-not-allowed': MESSAGES.micDenied,
  'audio-capture': MESSAGES.micMissing,
  'no-speech': MESSAGES.noSpeech,
  network: MESSAGES.sttNetwork
};

function estimateSpeechMs(text) {
  const words = String(text).split(/\s+/).filter(Boolean).length;
  return Math.max(2200, words * 380);
}

function splitSentences(text) {
  const parts = String(text).match(/[^.!?…]+[.!?…]*/g);
  return parts ? parts.map((p) => p.trim()).filter(Boolean) : [String(text)];
}

function hasUserActivation() {
  return typeof navigator === 'undefined' || !navigator.userActivation || navigator.userActivation.hasBeenActive;
}

/** Recursos mutables del agente (timers, mic, STT, rAF): viven fuera del ciclo de render. */
function ensureRuntime(runtimeRef, amplitudeRef) {
  if (!runtimeRef.current) {
    runtimeRef.current = {
      machine: initialAgentState,
      amplitude: amplitudeRef,
      pulse: 0,
      timers: new Set(),
      raf: 0,
      mic: null,
      recognition: null,
      stopRequested: false,
      muted: false,
      script: null,
      resolve: null
    };
  }
  return runtimeRef.current;
}

function isCurrent(rt, turn, status) {
  return rt.machine.turn === turn && rt.machine.status === status;
}

function later(rt, fn, ms) {
  const id = setTimeout(() => {
    rt.timers.delete(id);
    fn();
  }, ms);
  rt.timers.add(id);
  return id;
}

function clearLater(rt, id) {
  clearTimeout(id);
  rt.timers.delete(id);
}

function clearTimers(rt) {
  rt.timers.forEach((id) => clearTimeout(id));
  rt.timers.clear();
}

function stopLoop(rt) {
  cancelAnimationFrame(rt.raf);
  rt.raf = 0;
  rt.amplitude.current = 0;
  rt.pulse = 0;
}

function closeMic(rt) {
  const mic = rt.mic;
  rt.mic = null;
  if (!mic) return;
  mic.stream.getTracks().forEach((t) => t.stop());
  mic.ctx?.close().catch(() => {});
}

function abortRecognition(rt) {
  const rec = rt.recognition;
  rt.recognition = null;
  if (!rec) return;
  rec.onresult = null;
  rec.onerror = null;
  rec.onend = null;
  try {
    rec.abort();
  } catch {
    /* ya detenido */
  }
}

function cancelSpeech() {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* sin TTS */
  }
}

function startSpeakingEnvelope(rt) {
  stopLoop(rt);
  const t0 = performance.now();
  const tick = (now) => {
    rt.pulse *= 0.9;
    const base = 0.2 + 0.12 * Math.sin((now - t0) / 130);
    rt.amplitude.current = Math.min(1, Math.max(base, rt.pulse));
    rt.raf = requestAnimationFrame(tick);
  };
  rt.raf = requestAnimationFrame(tick);
}

async function openMic(rt) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    rt.mic = { stream, ctx: null };
    return;
  }
  const ctx = new AudioCtx();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  ctx.createMediaStreamSource(stream).connect(analyser);
  rt.mic = { stream, ctx };
  const data = new Uint8Array(analyser.fftSize);
  const tick = () => {
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i += 1) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    rt.amplitude.current = Math.min(1, Math.sqrt(sum / data.length) * 5);
    rt.raf = requestAnimationFrame(tick);
  };
  stopLoop(rt);
  rt.raf = requestAnimationFrame(tick);
}

/**
 * Agente de voz de la portada: STT/TTS nativos + máquina de estados explícita.
 * `amplitudeRef.current` (0..1) alimenta las animaciones sin re-renderizar React.
 * `resolve(text)` puede devolver una promesa; por defecto responde solo desde el guion.
 */
export function useVoiceAgent({ script, resolve } = {}) {
  const runtimeRef = useRef(null);
  const amplitudeRef = useRef(0);
  const [state, setState] = useState(initialAgentState);
  const [interim, setInterim] = useState('');
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const rt = ensureRuntime(runtimeRef, amplitudeRef);
    rt.script = script;
    rt.resolve = resolve;
  }, [script, resolve]);

  const send = useCallback((event) => {
    const rt = ensureRuntime(runtimeRef, amplitudeRef);
    const next = agentReducer(rt.machine, event);
    if (next !== rt.machine) {
      rt.machine = next;
      setState(next);
    }
    return next;
  }, []);

  const teardown = useCallback(() => {
    const rt = ensureRuntime(runtimeRef, amplitudeRef);
    clearTimers(rt);
    stopLoop(rt);
    closeMic(rt);
    abortRecognition(rt);
    cancelSpeech();
    setInterim('');
  }, []);

  const failTurn = useCallback(
    (turn, message) => {
      const rt = ensureRuntime(runtimeRef, amplitudeRef);
      if (rt.machine.turn !== turn) return;
      teardown();
      send({ type: 'FAIL', message, turn });
    },
    [send, teardown]
  );

  const speak = useCallback(
    (answer, turn) => {
      const rt = ensureRuntime(runtimeRef, amplitudeRef);
      startSpeakingEnvelope(rt);
      const speech = answer.speech || answer.response;
      const estimate = estimateSpeechMs(speech);
      const finish = () => {
        if (!isCurrent(rt, turn, SPEAKING)) return;
        stopLoop(rt);
        send({ type: 'SPEAK_END', turn });
      };

      const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
      const canVoice = !rt.muted && synth && typeof SpeechSynthesisUtterance !== 'undefined' && hasUserActivation();
      const watchdog = { id: later(rt, finish, estimate + (canVoice ? TTS_SLACK_MS : 0)) };
      if (!canVoice) return;

      synth.cancel();
      const voiced = { failed: false, startedAt: performance.now() };
      const voice = pickBestVoice();
      const parts = splitSentences(speech);
      parts.forEach((part, i) => {
        const u = new SpeechSynthesisUtterance(part);
        u.lang = voice?.lang || rt.script?.lang || 'es-ES';
        if (voice) u.voice = voice;
        u.rate = 1;
        u.pitch = 0.95;
        u.onstart = () => {
          rt.pulse = 0.85;
        };
        u.onboundary = () => {
          rt.pulse = 0.65 + Math.random() * 0.35;
        };
        if (i === parts.length - 1) u.onend = finish;
        u.onerror = (e) => {
          if (e.error === 'interrupted' || e.error === 'canceled') return;
          // Sin audio disponible: el turno sigue como subtítulo para no perder la respuesta.
          if (voiced.failed) return;
          voiced.failed = true;
          synth.cancel();
          clearLater(rt, watchdog.id);
          watchdog.id = later(rt, finish, Math.max(1200, estimate - (performance.now() - voiced.startedAt)));
        };
        synth.speak(u);
      });
    },
    [send]
  );

  const think = useCallback(
    (turn, text) => {
      const rt = ensureRuntime(runtimeRef, amplitudeRef);
      const started = performance.now();
      const flight = { settled: false, timeoutId: 0 };
      flight.timeoutId = later(
        rt,
        () => {
          if (flight.settled) return;
          flight.settled = true;
          failTurn(turn, MESSAGES.thinkTimeout);
        },
        THINK_TIMEOUT_MS
      );

      const resolver = rt.resolve || ((t) => matchIntent(rt.script, t));
      Promise.resolve()
        .then(() => resolver(text))
        .then(async (answer) => {
          const wait = MIN_THINK_MS - (performance.now() - started);
          if (wait > 0) await new Promise((r) => setTimeout(r, wait));
          if (flight.settled) return;
          flight.settled = true;
          clearLater(rt, flight.timeoutId);
          if (!isCurrent(rt, turn, THINKING)) return;
          const next = send({ type: 'RESPOND', text: answer.response, turn });
          if (next.status === SPEAKING) speak(answer, next.turn);
        })
        .catch(() => {
          if (flight.settled) return;
          flight.settled = true;
          clearLater(rt, flight.timeoutId);
          failTurn(turn, MESSAGES.network);
        });
    },
    [failTurn, send, speak]
  );

  const stopListening = useCallback(() => {
    const rt = ensureRuntime(runtimeRef, amplitudeRef);
    const { turn, status } = rt.machine;
    if (status !== LISTENING) return;
    rt.stopRequested = true;
    if (!rt.recognition) {
      teardown();
      send({ type: 'STOP', turn });
      return;
    }
    try {
      rt.recognition.stop();
    } catch {
      /* ya detenido */
    }
    later(
      rt,
      () => {
        if (!isCurrent(rt, turn, LISTENING)) return;
        teardown();
        send({ type: 'STOP', turn });
      },
      STOP_GRACE_MS
    );
  }, [send, teardown]);

  const listen = useCallback(async () => {
    const rt = ensureRuntime(runtimeRef, amplitudeRef);
    if (rt.machine.status === LISTENING) {
      stopListening();
      return;
    }
    if (!canTransition(rt.machine.status, 'LISTEN')) return;
    if (!SpeechRecognitionCtor || !navigator.mediaDevices?.getUserMedia) {
      teardown();
      if (rt.machine.status === ERROR) send({ type: 'RESET' });
      if (rt.machine.status === SPEAKING) send({ type: 'STOP', turn: rt.machine.turn });
      send({ type: 'FAIL', message: MESSAGES.unsupported });
      return;
    }

    teardown();
    const { turn } = send({ type: 'LISTEN' });
    rt.stopRequested = false;

    try {
      await openMic(rt);
    } catch (err) {
      failTurn(turn, err?.name === 'NotAllowedError' || err?.name === 'SecurityError' ? MESSAGES.micDenied : MESSAGES.micMissing);
      return;
    }
    if (!isCurrent(rt, turn, LISTENING)) {
      closeMic(rt);
      return;
    }

    const rec = new SpeechRecognitionCtor();
    rec.lang = rt.script?.lang || 'es-ES';
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    const session = { finalText: '', errored: false };

    rec.onresult = (event) => {
      let partial = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) session.finalText = `${session.finalText} ${text}`.trim();
        else partial += text;
      }
      setInterim(`${session.finalText} ${partial}`.trim());
    };
    rec.onerror = (event) => {
      if (event.error === 'aborted') return;
      if (event.error === 'no-speech' && rt.stopRequested) return;
      session.errored = true;
      failTurn(turn, STT_ERRORS[event.error] || MESSAGES.sttGeneric);
    };
    rec.onend = () => {
      rt.recognition = null;
      closeMic(rt);
      stopLoop(rt);
      setInterim('');
      if (!isCurrent(rt, turn, LISTENING)) return;
      const text = session.finalText.trim();
      if (text) {
        clearTimers(rt);
        send({ type: 'HEARD', text, turn });
        think(turn, text);
        return;
      }
      if (session.errored) return;
      if (rt.stopRequested) {
        clearTimers(rt);
        send({ type: 'STOP', turn });
        return;
      }
      failTurn(turn, MESSAGES.noSpeech);
    };

    rt.recognition = rec;
    later(
      rt,
      () => {
        if (!isCurrent(rt, turn, LISTENING)) return;
        try {
          rec.stop();
        } catch {
          /* ya detenido */
        }
      },
      LISTEN_TIMEOUT_MS
    );

    try {
      rec.start();
    } catch {
      failTurn(turn, MESSAGES.startFailed);
    }
  }, [failTurn, send, stopListening, teardown, think]);

  const ask = useCallback(
    (raw) => {
      const rt = ensureRuntime(runtimeRef, amplitudeRef);
      const text = String(raw || '').trim().slice(0, 300);
      if (!text) return;
      if (rt.machine.status === LISTENING) {
        teardown();
        send({ type: 'STOP', turn: rt.machine.turn });
      }
      if (!canTransition(rt.machine.status, 'ASK')) return;
      teardown();
      const { turn } = send({ type: 'ASK', text });
      think(turn, text);
    },
    [send, teardown, think]
  );

  const playIntro = useCallback(() => {
    const rt = ensureRuntime(runtimeRef, amplitudeRef);
    const { status } = rt.machine;
    if (status !== IDLE && status !== ERROR) return;
    if (status === ERROR) send({ type: 'RESET' });
    teardown();
    const text = (rt.script?.intro || []).join(' ');
    if (!text) return;
    const next = send({ type: 'RESPOND', text });
    if (next.status === SPEAKING) speak({ response: text, speech: text }, next.turn);
  }, [send, speak, teardown]);

  const interrupt = useCallback(() => {
    const rt = ensureRuntime(runtimeRef, amplitudeRef);
    const { status, turn } = rt.machine;
    if (status === LISTENING) {
      stopListening();
      return;
    }
    if (status !== THINKING && status !== SPEAKING) return;
    teardown();
    send({ type: 'STOP', turn });
  }, [send, stopListening, teardown]);

  const toggleMute = useCallback(() => {
    const rt = ensureRuntime(runtimeRef, amplitudeRef);
    rt.muted = !rt.muted;
    setMuted(rt.muted);
    if (rt.muted) cancelSpeech();
  }, []);

  useEffect(() => {
    if (state.status !== ERROR) return undefined;
    const id = setTimeout(() => send({ type: 'RESET' }), ERROR_HOLD_MS);
    return () => clearTimeout(id);
  }, [state.status, state.turn, send]);

  useEffect(() => teardown, [teardown]);

  return {
    state,
    status: state.status,
    interim,
    muted,
    amplitudeRef,
    sttSupported: !!SpeechRecognitionCtor,
    listen,
    stopListening,
    ask,
    playIntro,
    interrupt,
    toggleMute
  };
}
