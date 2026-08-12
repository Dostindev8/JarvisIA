import { useCallback, useEffect, useRef, useState } from 'react';
import { ListTodo, MessageSquare, Send, Settings2, Globe, Sparkles, WifiOff } from 'lucide-react';
import JarvisOrb from '../components/jarvis/JarvisOrb';
import JarvisWaveform from '../components/jarvis/JarvisWaveform';
import JarvisSubtitles from '../components/jarvis/JarvisSubtitles';
import JarvisChatPanel from '../components/jarvis/JarvisChatPanel';
import JarvisVoiceButton from '../components/jarvis/JarvisVoiceButton';
import JarvisMusicPlayer from '../components/jarvis/JarvisMusicPlayer';
import JarvisSettingsModal from '../components/jarvis/JarvisSettingsModal';
import JarvisActionMenu from '../components/jarvis/JarvisActionMenu';
import JarvisTasksPanel from '../components/jarvis/JarvisTasksPanel';
import WhatsAppConfirmPanel from '../components/jarvis/WhatsAppConfirmPanel';
import WhatsAppInboxPanel from '../components/jarvis/WhatsAppInboxPanel';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { useMusicPlayer } from '../hooks/useMusicPlayer';
import { useJarvisSocket } from '../hooks/useJarvisSocket';
import { useWhatsAppOutbox } from '../hooks/useWhatsAppOutbox';
import { useWhatsAppInbound } from '../hooks/useWhatsAppInbound';
import { useConnectivity } from '../hooks/useConnectivity';
import { useJarvisStore } from '../store/useJarvisStore';
import { jarvisApi } from '../lib/api';
import { runOfflineEngine, parseMenuOptions } from '../lib/offlineEngine';
import { appendLocalHistory } from '../lib/localMemory';
import LCSLogo from '../components/branding/LCSLogo';

export default function JarvisAI() {
  const [input, setInput] = useState('');
  const [jarvisReply, setJarvisReply] = useState('');
  const [sending, setSending] = useState(false);
  const [menuOptions, setMenuOptions] = useState([]);
  const [tasksOpen, setTasksOpen] = useState(false);
  const spokeRef = useRef(false);

  const connectivity = useConnectivity();

  const {
    jarvisState,
    amplitude: storeAmplitude,
    conversationId,
    messages,
    isSettingsOpen,
    isChatOpen,
    degradedMode,
    setJarvisState,
    setAmplitude,
    addMessage,
    setConversationId,
    toggleSettings,
    toggleChat,
    setDegradedMode
  } = useJarvisStore();

  const sendMessageRef = useRef(null);

  const {
    isSupported: sttSupported,
    isListening,
    transcript,
    interimTranscript,
    error: sttError,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechRecognition({ onFinal: (text) => sendMessageRef.current?.(text) });

  const { isSpeaking, amplitude: ttsAmplitude, speak, stop: stopTts } = useTextToSpeech();

  const handleSpeak = useCallback(
    async (text) => {
      if (!text || spokeRef.current) return;
      // Hablar solo el cuerpo (sin menú largo)
      const speakText = String(text).split('¿Qué deseas hacer ahora?')[0].trim().slice(0, 500);
      if (!speakText) return;
      spokeRef.current = true;
      setJarvisState('speaking');
      const voiceId = localStorage.getItem('jarvis_voice_id') || undefined;
      await speak(speakText, voiceId);
      setJarvisState('idle');
      spokeRef.current = false;
    },
    [setJarvisState, speak]
  );

  const handleSocketResponse = useCallback(
    async (data) => {
      if (!data?.text) return;
      setJarvisReply(data.text);
      setMenuOptions(parseMenuOptions(data.text));
      if (data.speak !== false) await handleSpeak(data.text);
    },
    [handleSpeak]
  );

  const { socket, isConnected } = useJarvisSocket({ onResponse: handleSocketResponse });
  const music = useMusicPlayer(socket);
  const whatsapp = useWhatsAppOutbox(socket);
  const whatsappInbox = useWhatsAppInbound(socket);

  const effectiveAmplitude = isSpeaking ? ttsAmplitude : storeAmplitude;
  const effectiveState = sending ? 'thinking' : isListening ? 'listening' : isSpeaking ? 'speaking' : jarvisState;
  const offlineMode = !connectivity.online;

  useEffect(() => {
    setAmplitude(effectiveAmplitude);
  }, [effectiveAmplitude, setAmplitude]);

  useEffect(() => {
    setDegradedMode(offlineMode);
  }, [offlineMode, setDegradedMode]);

  const applyAssistantReply = useCallback(
    async (reply, { toolsUsed, provider, skipSpeak } = {}) => {
      setJarvisReply(reply);
      setMenuOptions(parseMenuOptions(reply));
      addMessage({ role: 'assistant', content: reply, toolsUsed, provider });
      appendLocalHistory({ role: 'assistant', content: reply });
      if (!skipSpeak && !isConnected) await handleSpeak(reply);
    },
    [addMessage, handleSpeak, isConnected]
  );

  const sendMessage = useCallback(
    async (text) => {
      const message = text?.trim();
      if (!message || sending) return;

      // Atajos de menú locales
      if (message === '2' || message === '3') setTasksOpen(true);
      if (message === '6') toggleSettings();

      setSending(true);
      setJarvisState('thinking');
      setJarvisReply('');
      spokeRef.current = false;
      addMessage({ role: 'user', content: message });
      appendLocalHistory({ role: 'user', content: message });
      setInput('');
      resetTranscript();

      try {
        if (!connectivity.online) {
          const offline = runOfflineEngine(message, { online: false });
          if (offline.action === 'settings') toggleSettings();
          if (offline.action === 'list_tasks' || offline.action === 'create_task_prompt') setTasksOpen(true);
          await applyAssistantReply(offline.text, { provider: 'offline', skipSpeak: false });
          return;
        }

        const res = await jarvisApi.chat(message, conversationId, true);
        const { reply, conversationId: convId, toolsUsed, provider } = res.data;
        if (convId) setConversationId(convId);
        await applyAssistantReply(reply, { toolsUsed, provider });
      } catch (err) {
        const offline = runOfflineEngine(message, { online: false });
        await applyAssistantReply(
          `⚠️ API no disponible (${err.message}).\n\n${offline.text}`,
          { provider: 'offline-fallback' }
        );
      } finally {
        setSending(false);
        setJarvisState('idle');
      }
    },
    [
      sending,
      conversationId,
      addMessage,
      resetTranscript,
      setConversationId,
      setJarvisState,
      connectivity.online,
      applyAssistantReply,
      toggleSettings
    ]
  );

  sendMessageRef.current = sendMessage;

  const handleMenuSelect = (id) => {
    if (id === '2' || id === '3') setTasksOpen(true);
    if (id === '6') toggleSettings();
    sendMessage(String(id));
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
      setJarvisState('idle');
    } else {
      stopTts();
      resetTranscript();
      startListening();
      setJarvisState('listening');
    }
  };

  useEffect(() => () => stopTts(), [stopTts]);

  useEffect(() => {
    jarvisApi
      .capabilities()
      .then((r) => {
        const data = r.data || {};
        if (data.elevenLabs) {
          if (localStorage.getItem('jarvis_use_elevenlabs') === null) {
            localStorage.setItem('jarvis_use_elevenlabs', 'auto');
          }
          if (!localStorage.getItem('jarvis_voice_id') && data.defaultVoiceId) {
            localStorage.setItem('jarvis_voice_id', data.defaultVoiceId);
          }
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="galaxy-nebula-a" />
        <div className="galaxy-nebula-b" />
        <div className="galaxy-vignette" />
      </div>

      <header className="surface sticky top-0 z-30 border-b border-white/[0.06] backdrop-blur-xl bg-jarvis-void/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <LCSLogo size={36} className="rounded-full object-contain shrink-0" />
            <div className="min-w-0">
              <p className="font-jarvis font-semibold text-sm leading-none text-gold-gradient tracking-wider truncate">
                JARVISIA
              </p>
              <p className="text-[10px] text-muted mt-0.5 tracking-wide uppercase truncate">
                Inteligencia artificial que trabaja para ti
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`chip hidden sm:inline-flex ${
                offlineMode
                  ? 'border-amber-500/30 text-amber-300 bg-amber-500/5'
                  : isConnected
                    ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5'
                    : 'border-zinc-600 text-zinc-400 bg-zinc-800/30'
              }`}
            >
              {offlineMode ? <WifiOff size={12} /> : <Globe size={12} />}
              {offlineMode ? 'Offline' : isConnected ? 'En línea' : 'Local'}
            </span>
            {degradedMode && !offlineMode && (
              <span className="chip border-amber-500/30 text-amber-400 bg-amber-500/5 hidden md:inline-flex">
                <Sparkles size={12} />
                Degradado
              </span>
            )}
            <button type="button" onClick={() => setTasksOpen((v) => !v)} className="icon-btn" aria-label="Tareas">
              <ListTodo size={18} />
            </button>
            <button type="button" onClick={toggleChat} className="icon-btn" aria-label="Historial">
              <MessageSquare size={18} />
            </button>
            <button type="button" onClick={toggleSettings} className="icon-btn" aria-label="Ajustes">
              <Settings2 size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 lg:py-10 flex flex-col lg:flex-row gap-8 relative z-10">
        <section className="flex-1 flex flex-col items-center justify-center gap-8 min-h-[42vh] lg:min-h-[55vh]">
          <JarvisOrb state={effectiveState} amplitude={effectiveAmplitude} />
          <div className="w-full max-w-sm">
            <JarvisWaveform amplitude={effectiveAmplitude} isActive={isListening || isSpeaking || sending} />
          </div>
          <p className="text-xs text-muted text-center max-w-lg leading-relaxed">
            Galaxia JARVIS — CRM, tareas, WhatsApp con confirmación, web en vivo y motor offline-first.
          </p>
        </section>

        <JarvisChatPanel isOpen={isChatOpen} messages={messages} onClose={toggleChat} onOptionClick={handleMenuSelect} />
      </main>

      <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 pb-3 relative z-10">
        <JarvisSubtitles
          userText={transcript || input}
          jarvisText={jarvisReply}
          isListening={isListening}
          isSpeaking={isSpeaking}
          interimTranscript={interimTranscript}
        />
        {sttError && <p className="text-jarvis-red text-xs mt-2">{sttError}</p>}
        {menuOptions.length > 0 && (
          <JarvisActionMenu options={menuOptions.filter((o) => o.id !== '0')} onSelect={handleMenuSelect} disabled={sending} />
        )}
      </div>

      <div className="sticky bottom-0 pb-4 pt-2 px-4 sm:px-6 bg-gradient-to-t from-jarvis-void via-jarvis-void/95 to-transparent z-20">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input || transcript);
          }}
          className="surface-elevated max-w-2xl mx-auto rounded-2xl p-2 flex items-center gap-2 border border-jarvis-cyan/15 shadow-[0_0_30px_rgba(0,212,255,0.06)]"
        >
          <input
            type="text"
            value={isListening ? (interimTranscript || transcript || input) : input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              offlineMode
                ? 'Offline — tareas y comandos locales…'
                : isListening
                  ? 'Escuchando… habla ahora'
                  : !sttSupported
                    ? 'Escribe tu mensaje…'
                    : 'Escribe o pulsa el micrófono…'
            }
            className="flex-1 bg-transparent border-none outline-none text-sm px-3 min-h-[44px] placeholder:text-zinc-500"
            disabled={sending || isListening}
            aria-label="Mensaje"
          />
          <JarvisVoiceButton isListening={isListening} onToggle={handleVoiceToggle} disabled={!sttSupported || sending} />
          <button
            type="submit"
            disabled={sending || (!input.trim() && !transcript.trim())}
            className="w-11 h-11 rounded-xl bg-gradient-to-br from-jarvis-cyan/90 to-jarvis-violet/90 hover:opacity-95 shadow-[0_0_16px_rgba(0,212,255,0.25)] disabled:opacity-40 flex items-center justify-center shrink-0 transition-opacity"
            aria-label="Enviar"
          >
            <Send size={17} />
          </button>
        </form>
      </div>

      <JarvisTasksPanel isOpen={tasksOpen} onClose={() => setTasksOpen(false)} online={connectivity.online} />

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
        degradedMode={degradedMode || offlineMode}
      />
    </div>
  );
}
