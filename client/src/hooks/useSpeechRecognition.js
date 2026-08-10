import { useCallback, useEffect, useRef, useState } from 'react';

const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

const STT_LANGS = ['es-ES', 'es-MX', 'es-US', 'es'];

/**
 * STT one-shot estable (continuous=false evita el error "network" de Chrome
 * al reiniciar sesiones largas). Al terminar, entrega el texto vía onFinal.
 */
export function useSpeechRecognition({ onFinal } = {}) {
  const [isSupported] = useState(!!SpeechRecognition);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const finalRef = useRef('');
  const listeningRef = useRef(false);
  const deliveredRef = useRef(false);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  useEffect(() => {
    if (!SpeechRecognition) return undefined;

    const recognition = new SpeechRecognition();
    recognition.lang = STT_LANGS[0];
    // one-shot: más fiable que continuous+restart (evita error network)
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalRef.current = `${finalRef.current} ${text}`.trim();
          setTranscript(finalRef.current);
        } else {
          interim += text;
        }
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      const messages = {
        'not-allowed': 'Permiso de micrófono denegado. Actívalo en el candado del navegador.',
        'service-not-allowed': 'Usa Chrome o Edge para el micrófono.',
        'no-speech': 'No detecté voz. Pulsa el micrófono e intenta de nuevo.',
        'audio-capture': 'No hay micrófono disponible.',
        network:
          'El reconocimiento en la nube del navegador falló. Escribe el mensaje o reintenta en Chrome con internet estable.',
        'language-not-supported': 'Idioma no soportado — cambiando a español estándar.'
      };

      if (event.error === 'language-not-supported') {
        const idx = STT_LANGS.indexOf(recognition.lang);
        if (idx >= 0 && idx < STT_LANGS.length - 1) {
          recognition.lang = STT_LANGS[idx + 1];
          return;
        }
      }

      if (event.error === 'aborted') return;

      listeningRef.current = false;
      setIsListening(false);
      if (event.error !== 'no-speech') {
        setError(messages[event.error] || `Error de reconocimiento: ${event.error}`);
      } else {
        setError(messages['no-speech']);
      }
    };

    recognition.onend = () => {
      listeningRef.current = false;
      setIsListening(false);
      setInterimTranscript('');

      if (deliveredRef.current) return;
      const text = finalRef.current.trim();
      if (text) {
        deliveredRef.current = true;
        onFinalRef.current?.(text);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      listeningRef.current = false;
      try {
        recognition.abort();
      } catch {
        /* noop */
      }
    };
  }, []);

  const startListening = useCallback(async () => {
    if (!SpeechRecognition || !recognitionRef.current) {
      setError('Tu navegador no soporta micrófono. Usa Chrome/Edge o escribe.');
      return;
    }
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setError('No se pudo acceder al micrófono. Revisa los permisos del sitio.');
      return;
    }

    finalRef.current = '';
    deliveredRef.current = false;
    listeningRef.current = true;
    setTranscript('');
    setInterimTranscript('');
    setIsListening(true);
    try {
      recognitionRef.current.start();
    } catch {
      try {
        recognitionRef.current.abort();
        setTimeout(() => {
          try {
            recognitionRef.current.start();
          } catch {
            listeningRef.current = false;
            setIsListening(false);
            setError('No se pudo iniciar el micrófono. Recarga e intenta de nuevo.');
          }
        }, 120);
      } catch {
        listeningRef.current = false;
        setIsListening(false);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    setIsListening(false);
    try {
      recognitionRef.current?.stop();
    } catch {
      /* noop */
    }
  }, []);

  const cancelListening = useCallback(() => {
    listeningRef.current = false;
    deliveredRef.current = true;
    finalRef.current = '';
    setIsListening(false);
    setInterimTranscript('');
    try {
      recognitionRef.current?.abort();
    } catch {
      /* noop */
    }
  }, []);

  const resetTranscript = useCallback(() => {
    finalRef.current = '';
    deliveredRef.current = false;
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    cancelListening,
    resetTranscript
  };
}
