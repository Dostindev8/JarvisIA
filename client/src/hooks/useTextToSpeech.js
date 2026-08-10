import { useCallback, useEffect, useRef, useState } from 'react';
import { getToken } from '../lib/api';
import { getSpeechSettings, pickBestVoice, loadVoices } from '../lib/voices';

const API_BASE = import.meta.env.VITE_API_URL || '';

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const sourceRef = useRef(null);
  const simRef = useRef(null);

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
          resolve();
          return;
        }

        const clean = String(text).replace(/\*\*/g, '').replace(/\[.*?\]\(.*?\)/g, '').slice(0, 4000);
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(clean);
        const { rate, pitch } = getSpeechSettings();
        utterance.lang = 'es-DO';
        utterance.rate = rate;
        utterance.pitch = pitch;

        const voice = pickBestVoice();
        if (voice) utterance.voice = voice;

        utterance.onstart = () => {
          setIsSpeaking(true);
          simRef.current = setInterval(() => setAmplitude(35 + Math.random() * 70), 100);
        };

        utterance.onend = () => {
          stopAnimation();
          setIsSpeaking(false);
          resolve();
        };

        utterance.onerror = () => {
          stopAnimation();
          setIsSpeaking(false);
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      }),
    [stopAnimation]
  );

  const speakWithBlob = useCallback(
    async (blobUrl) => {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

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

      const { useElevenLabs } = getSpeechSettings();
      const isMediaUrl =
        textOrUrl.startsWith('http') || textOrUrl.startsWith('/') || textOrUrl.startsWith('blob:');

      if (isMediaUrl) {
        try {
          const url = textOrUrl.startsWith('/') ? `${API_BASE}${textOrUrl}` : textOrUrl;
          await speakWithBlob(url.startsWith('blob:') ? url : url);
          return;
        } catch {
          /* fallback abajo */
        }
      }

      if (useElevenLabs && typeof textOrUrl === 'string' && !isMediaUrl) {
        try {
          const token = getToken();
          const res = await fetch(`${API_BASE}/api/ai/tts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { Authorization: `Bearer ${token}` })
            },
            body: JSON.stringify({ text: textOrUrl, voiceId })
          });
          if (res.ok) {
            const blob = await res.blob();
            await speakWithBlob(URL.createObjectURL(blob));
            return;
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
    sourceRef.current?.stop();
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    stopAnimation();
    audioContextRef.current?.close().catch(() => {});
  }, [stopAnimation]);

  useEffect(() => () => stop(), [stop]);

  return { isSpeaking, amplitude, speak, stop };
}
