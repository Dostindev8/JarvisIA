import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, Settings2, Globe, Sparkles } from 'lucide-react';
import JarvisOrb from '../components/jarvis/JarvisOrb';
import JarvisWaveform from '../components/jarvis/JarvisWaveform';
import JarvisSubtitles from '../components/jarvis/JarvisSubtitles';
import JarvisChatPanel from '../components/jarvis/JarvisChatPanel';
import JarvisVoiceButton from '../components/jarvis/JarvisVoiceButton';
import JarvisMusicPlayer from '../components/jarvis/JarvisMusicPlayer';
import JarvisSettingsModal from '../components/jarvis/JarvisSettingsModal';
import WhatsAppConfirmPanel from '../components/jarvis/WhatsAppConfirmPanel';
import WhatsAppInboxPanel from '../components/jarvis/WhatsAppInboxPanel';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { useMusicPlayer } from '../hooks/useMusicPlayer';
import { useJarvisSocket } from '../hooks/useJarvisSocket';
import { useWhatsAppOutbox } from '../hooks/useWhatsAppOutbox';
import { useWhatsAppInbound } from '../hooks/useWhatsAppInbound';
import { useJarvisStore } from '../store/useJarvisStore';
import { jarvisApi } from '../lib/api';
import LCSLogo from '../components/branding/LCSLogo';

export default function JarvisAI() {
  const [input, setInput] = useState('');
  const [jarvisReply, setJarvisReply] = useState('');
  const [sending, setSending] = useState(false);
  const spokeRef = useRef(false);

  const {
    jarvisState,
    amplitude: storeAmplitude,
    conversationId,
    messages,
    isSettingsOpen,
    isChatOpen,
    socketConnected,
    degradedMode,
    setJarvisState,
    setAmplitude,
    addMessage,
    setConversationId,
    toggleSettings,
    toggleChat
  } = useJarvisStore();

  const {
    isSupported: sttSupported,
    isListening,
    transcript,
    interimTranscript,
    error: sttError,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechRecognition();

  const { isSpeaking, amplitude: ttsAmplitude, speak, stop: stopTts } = useTextToSpeech();

  const handleSpeak = useCallback(
    async (text, audioUrl) => {
      if (spokeRef.current) return;
      spokeRef.current = true;
      setJarvisState('speaking');
      const voiceId = localStorage.getItem('jarvis_voice_id') || undefined;
      await speak(audioUrl || text, voiceId);
      setJarvisState('idle');
      spokeRef.current = false;
    },
    [setJarvisState, speak]
  );

  const handleSocketResponse = useCallback(
    async (data) => {
      if (!data?.text) return;
      setJarvisReply(data.text);
      await handleSpeak(data.text, data.audioUrl);
    },
    [handleSpeak]
  );

  const { socket, isConnected } = useJarvisSocket({ onResponse: handleSocketResponse });
  const music = useMusicPlayer(socket);
  const whatsapp = useWhatsAppOutbox(socket);
  const whatsappInbox = useWhatsAppInbound(socket);

  const effectiveAmplitude = isSpeaking ? ttsAmplitude : storeAmplitude;
  const effectiveState = sending ? 'thinking' : isListening ? 'listening' : isSpeaking ? 'speaking' : jarvisState;

  useEffect(() => {
    setAmplitude(effectiveAmplitude);
  }, [effectiveAmplitude, setAmplitude]);

  const sendMessage = useCallback(
    async (text) => {
      const message = text?.trim();
      if (!message || sending) return;

      setSending(true);
      setJarvisState('thinking');
      setJarvisReply('');
      spokeRef.current = false;
      addMessage({ role: 'user', content: message });
      setInput('');
      resetTranscript();

      try {
        const res = await jarvisApi.chat(message, conversationId, false);
        const { reply, conversationId: convId, toolsUsed } = res.data;

        if (convId) setConversationId(convId);
        setJarvisReply(reply);
        addMessage({ role: 'assistant', content: reply, toolsUsed });

        if (!isConnected) {
          await handleSpeak(reply);
        }
      } catch (err) {
        setJarvisReply(`No pude procesar eso: ${err.message}`);
        setJarvisState('idle');
      } finally {
        setSending(false);
      }
    },
    [sending, conversationId, addMessage, resetTranscript, setConversationId, setJarvisState, handleSpeak, isConnected]
  );

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
      const finalText = transcript || interimTranscript;
      if (finalText.trim()) sendMessage(finalText);
    } else {
      resetTranscript();
      startListening();
      setJarvisState('listening');
    }
  };

  useEffect(() => () => stopTts(), [stopTts]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="surface sticky top-0 z-30 border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LCSLogo size={36} className="rounded-full" />
            <div>
              <p className="font-jarvis font-semibold text-sm leading-none text-gold-gradient tracking-wider">JARVISIA</p>
              <p className="text-[11px] text-muted mt-0.5">Inteligencia que trabaja para ti</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`chip hidden sm:inline-flex ${
                isConnected
                  ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5'
                  : 'border-zinc-600 text-zinc-400 bg-zinc-800/30'
              }`}
            >
              <Globe size={12} />
              {isConnected ? 'En línea' : 'Local'}
            </span>
            {degradedMode && (
              <span className="chip border-amber-500/30 text-amber-400 bg-amber-500/5 hidden md:inline-flex">
                <Sparkles size={12} />
                Modo básico
              </span>
            )}
            <button type="button" onClick={toggleChat} className="icon-btn" aria-label="Historial">
              <MessageSquare size={18} />
            </button>
            <button type="button" onClick={toggleSettings} className="icon-btn" aria-label="Ajustes">
              <Settings2 size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 lg:py-10 flex flex-col lg:flex-row gap-8">
        <section className="flex-1 flex flex-col items-center justify-center gap-8 min-h-[42vh] lg:min-h-[55vh]">
          <JarvisOrb state={effectiveState} amplitude={effectiveAmplitude} />
          <div className="w-full max-w-sm">
            <JarvisWaveform amplitude={effectiveAmplitude} isActive={isListening || isSpeaking || sending} />
          </div>
          <p className="text-xs text-muted text-center max-w-lg leading-relaxed">
            Agente DostinX8 Supreme — CRM, ciberseguridad, redes sociales, internet en vivo, código y resolución de problemas.
          </p>
        </section>

        <JarvisChatPanel isOpen={isChatOpen} messages={messages} onClose={toggleChat} />
      </main>

      <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 pb-3">
        <JarvisSubtitles
          userText={transcript || input}
          jarvisText={jarvisReply}
          isListening={isListening}
          isSpeaking={isSpeaking}
          interimTranscript={interimTranscript}
        />
        {sttError && <p className="text-jarvis-red text-xs mt-2">{sttError}</p>}
      </div>

      <div className="sticky bottom-0 pb-4 pt-2 px-4 sm:px-6 bg-gradient-to-t from-lcs-navy-dark via-lcs-navy-dark/95 to-transparent">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input || transcript);
          }}
          className="surface-elevated max-w-2xl mx-auto rounded-2xl p-2 flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu mensaje..."
            className="flex-1 bg-transparent border-none outline-none text-sm px-3 min-h-[44px] placeholder:text-zinc-500"
            disabled={sending}
            aria-label="Mensaje"
          />
          <JarvisVoiceButton isListening={isListening} onToggle={handleVoiceToggle} disabled={!sttSupported || sending} />
          <button
            type="submit"
            disabled={sending || (!input.trim() && !transcript.trim())}
            className="w-11 h-11 rounded-xl bg-lcs-blue hover:bg-lcs-blue/90 shadow-[0_0_16px_rgba(0,163,255,0.25)] disabled:opacity-40 flex items-center justify-center shrink-0 transition-colors"
            aria-label="Enviar"
          >
            <Send size={17} />
          </button>
        </form>
      </div>

      <WhatsAppConfirmPanel
        drafts={whatsapp.drafts}
        busyId={whatsapp.busyId}
        onConfirm={whatsapp.confirm}
        onCancel={whatsapp.cancel}
      />

      <WhatsAppInboxPanel
        inbox={whatsappInbox.inbox}
        busyId={whatsappInbox.busyId}
        onDraft={whatsappInbox.draftReply}
        onDismiss={whatsappInbox.dismiss}
      />

      <JarvisMusicPlayer
        currentTrack={music.currentTrack}
        isPlaying={music.isPlaying}
        progress={music.progress}
        volume={music.volume}
        onPlay={music.play}
        onPause={music.pause}
        onNext={music.next}
        onPrev={music.prev}
        onVolumeChange={music.setVolume}
        onSeek={music.seekTo}
      />

      <JarvisSettingsModal
        isOpen={isSettingsOpen}
        onClose={toggleSettings}
        socketConnected={isConnected}
        degradedMode={degradedMode}
      />
    </div>
  );
}
