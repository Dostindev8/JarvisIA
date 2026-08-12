import { useCallback, useEffect, useRef, useState } from 'react';
import { getToken } from '../lib/api';
import { getSpeechSettings, pickBestVoice, loadVoices } from '../lib/voices';
import { cleanSpeakText } from '../lib/speakText';

const API_BASE = import.meta.env.VITE_API_URL || '';

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const sourceRef = useRef(null);
  const simRef = useRef(null);
  const speakingLock = useRef(false);

  useEffect(() => {
    loadVoices();
  }, []);

  const stopAnimation = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (simRef.current) clearInterval(simRef.current);
    setAmplitude(0);
  }, []);

  const startAnalyserLoop = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setAmplitude(avg);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const speakWithSynthesis = useCallback(
    (text) =>
      new Promise((resolve) => {
        if (!window.speechSynthesis) {
          speakingLock.current = false;
          resolve();
          return;
        }

        const clean = cleanSpeakText(text, 3500);
        if (!clean) {
          speakingLock.current = false;
          resolve();
          return;
        }

        window.speechSynthesis.cancel();

        const run = () => {
          const utterance = new SpeechSynthesisUtterance(clean);
          const { rate, pitch } = getSpeechSettings();
          utterance.lang = 'es-ES';
          utterance.rate = Number.isFinite(rate) ? rate : 0.95;
          utterance.pitch = Number.isFinite(pitch) ? pitch : 0.92;
          utterance.volume = 1;

          const voice = pickBestVoice();
          if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang || 'es-ES';
          }

          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            stopAnimation();
            setIsSpeaking(false);
            speakingLock.current = false;
            resolve();
          };

          utterance.onstart = () => {
            setIsSpeaking(true);
            simRef.current = setInterval(() => setAmplitude(35 + Math.random() * 70), 100);
          };
          utterance.onend = finish;
          utterance.onerror = finish;

          window.speechSynthesis.speak(utterance);

          const approxMs = Math.min(60000, Math.max(2500, clean.length * 55));
          setTimeout(finish, approxMs + 2000);
        };

        loadVoices();
        setTimeout(run, 40);
      }),
    [stopAnimation]
  );

  const speakWithBlob = useCallback(
    async (blobUrl) => {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      if (ctx.state === 'suspended') await ctx.resume();

      const response = await fetch(blobUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      const source = ctx.createBufferSource();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;

      source.buffer = audioBuffer;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      sourceRef.current = source;
      analyserRef.current = analyser;

      setIsSpeaking(true);
      startAnalyserLoop();

      return new Promise((resolve) => {
        source.onended = () => {
          setIsSpeaking(false);
          speakingLock.current = false;
          stopAnimation();
          ctx.close().catch(() => {});
          if (blobUrl.startsWith('blob:')) URL.revokeObjectURL(blobUrl);
          resolve();
        };
        source.start(0);
      });
    },
    [startAnalyserLoop, stopAnimation]
  );

  const speak = useCallback(
    async (textOrUrl, voiceId) => {
      if (!textOrUrl) return;

      try {
        sourceRef.current?.stop();
      } catch {
        /* noop */
      }
      window.speechSynthesis?.cancel();
      speakingLock.current = true;

      const { useElevenLabs } = getSpeechSettings();
      const isMediaUrl =
        typeof textOrUrl === 'string' &&
        (textOrUrl.startsWith('http') || textOrUrl.startsWith('/') || textOrUrl.startsWith('blob:'));

      if (isMediaUrl) {
        try {
          const url = textOrUrl.startsWith('/') ? `${API_BASE}${textOrUrl}` : textOrUrl;
          await speakWithBlob(url.startsWith('blob:') ? url : url);
          return;
        } catch {
          /* fallback */
        }
      }

      const tryEleven = useElevenLabs === true || useElevenLabs === 'auto';
      if (tryEleven && typeof textOrUrl === 'string' && !isMediaUrl) {
        try {
          const token = getToken();
          const payload = cleanSpeakText(textOrUrl, 4500);
          if (!payload) {
            speakingLock.current = false;
            return;
          }
          const res = await fetch(`${API_BASE}/api/ai/tts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { Authorization: `Bearer ${token}` })
            },
            body: JSON.stringify({ text: payload, voiceId })
          });
          if (res.ok) {
            const blob = await res.blob();
            if (blob.size > 100) {
              await speakWithBlob(URL.createObjectURL(blob));
              return;
            }
          }
        } catch {
          /* fallback navegador */
        }
      }

      await speakWithSynthesis(textOrUrl);
    },
    [speakWithBlob, speakWithSynthesis]
  );

  const stop = useCallback(() => {
    speakingLock.current = false;
    try {
      sourceRef.current?.stop();
    } catch {
      /* noop */
    }
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    stopAnimation();
    audioContextRef.current?.close().catch(() => {});
  }, [stopAnimation]);

  useEffect(() => () => stop(), [stop]);

  return { isSpeaking, amplitude, speak, stop };
}
