import { useCallback, useEffect, useRef, useState } from 'react';

const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export function useSpeechRecognition() {
  const [isSupported] = useState(!!SpeechRecognition);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const shouldRestartRef = useRef(false);

  useEffect(() => {
    if (!SpeechRecognition) return undefined;

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-DO';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += text;
        else interim += text;
      }

      if (final) setTranscript((prev) => (prev ? `${prev} ${final}` : final).trim());
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      const messages = {
        'not-allowed': 'Permiso de micrófono denegado. Actívalo en la configuración del navegador.',
        'no-speech': 'No detecté voz. Intenta de nuevo.',
        network: 'Error de red al transcribir. Verifica tu conexión.'
      };
      setError(messages[event.error] || `Error de reconocimiento: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      if (shouldRestartRef.current) {
        try {
          recognition.start();
        } catch {
          setIsListening(false);
        }
      } else {
        setIsListening(false);
        setInterimTranscript('');
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldRestartRef.current = false;
      recognition.stop();
    };
  }, [isSupported]);

  const startListening = useCallback(async () => {
    if (!SpeechRecognition || !recognitionRef.current) return;

    setError(null);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError('No se pudo acceder al micrófono.');
      return;
    }

    shouldRestartRef.current = true;
    setIsListening(true);
    try {
      recognitionRef.current.start();
    } catch {
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    setIsListening(false);
    recognitionRef.current?.stop();
    setInterimTranscript('');
  }, []);

  const resetTranscript = useCallback(() => {
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
    resetTranscript
  };
}
