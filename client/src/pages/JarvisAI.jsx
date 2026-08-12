import { useCallback, useEffect, useRef, useState } from 'react';
import { ListTodo, MessageSquare, Send, Settings2, Globe, Sparkles, WifiOff, Ear } from 'lucide-react';
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
import { cleanSpeakText } from '../lib/speakText';
import LCSLogo from '../components/branding/LCSLogo';

const WELCOME =
  'En línea, jefe. Soy JARVISIA. Puedo escucharte, hablarte y ayudarte con tareas, CRM, WhatsApp, internet y más. Pulsa el micrófono o escribe — estoy listo.';

const WELCOME_MENU = `${WELCOME}

──────────────────────────────────────────
 ¿Qué deseas hacer ahora?
  [1] Continuar conversación
  [2] Ver mis tareas pendientes
  [3] Crear una nueva tarea
  [5] Ver estado de conexión
  [6] Configuración
──────────────────────────────────────────`;

export default function JarvisAI() {
  const [input, setInput] = useState('');
  const [jarvisReply, setJarvisReply] = useState('');
  const [sending, setSending] = useState(false);
  const [menuOptions, setMenuOptions] = useState([]);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [handsFree, setHandsFree] = useState(
    () => localStorage.getItem('jarvis_hands_free') === 'true'
  );
  const spokeRef = useRef(false);
  const greetedRef = useRef(false);

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
  } = useSpeechRecognition({
    handsFree,
    onFinal: (text) => sendMessageRef.current?.(text)
  });

  const { isSpeaking, amplitude: ttsAmplitude, speak, stop: stopTts } = useTextToSpeech();

  const handleSpeak = useCallback(
    async (text) => {
      if (!text || spokeRef.current) return;
      const speakText = cleanSpeakText(text, 900);
      if (!speakText) return;
      spokeRef.current = true;
      setJarvisState('speaking');
      const voiceId = localStorage.getItem('jarvis_voice_id') || undefined;
      try {
        await speak(speakText, voiceId);
      } finally {
        setJarvisState('idle');
        spokeRef.current = false;
      }
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
  const effectiveState = sending
    ? 'thinking'
    : isListening
      ? 'listening'
      : isSpeaking
        ? 'speaking'
        : jarvisState;
  const offlineMode = !connectivity.online;

  useEffect(() => {
    setAmplitude(effectiveAmplitude);
  }, [effectiveAmplitude, setAmplitude]);

  useEffect(() => {
    setDegradedMode(offlineMode);
  }, [offlineMode, setDegradedMode]);

  useEffect(() => {
    localStorage.setItem('jarvis_hands_free', handsFree ? 'true' : 'false');
  }, [handsFree]);

  const applyAssistantReply = useCallback(
    async (reply, { toolsUsed, provider, skipSpeak } = {}) => {
      setJarvisReply(reply);
      setMenuOptions(parseMenuOptions(reply));
      addMessage({ role: 'assistant', content: reply, toolsUsed, provider });
      appendLocalHistory({ role: 'assistant', content: reply });
      if (!skipSpeak) await handleSpeak(reply);
    },
    [addMessage, handleSpeak]
  );

  const sendMessage = useCallback(
    async (text) => {
      const message = text?.trim();
      if (!message || sending) return;

      if (message === '2' || message === '3') setTasksOpen(true);
      if (message === '6') toggleSettings();

      if (isListening && !handsFree) stopListening();

      setSending(true);
      setJarvisState('thinking');
      setJarvisReply('');
      spokeRef.current = false;
      stopTts();
      addMessage({ role: 'user', content: message });
      appendLocalHistory({ role: 'user', content: message });
      setInput('');
      resetTranscript();

      try {
        if (!connectivity.online) {
          const offline = runOfflineEngine(message, { online: false });
          if (offline.action === 'settings') toggleSettings();
          if (offline.action === 'list_tasks' || offline.action === 'create_task_prompt') {
            setTasksOpen(true);
          }
          await applyAssistantReply(offline.text, { provider: 'offline' });
          return;
        }

        const res = await jarvisApi.chat(message, conversationId, true);
        const { reply, conversationId: convId, toolsUsed, provider } = res.data;
        if (convId) setConversationId(convId);
        await applyAssistantReply(reply, { toolsUsed, provider });
      } catch (err) {
        const offline = runOfflineEngine(message, { online: false });
        await applyAssistantReply(
          `No pude contactar el servidor (${err.message}). Uso motor local.\n\n${offline.text}`,
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
      toggleSettings,
      isListening,
      handsFree,
      stopListening,
      stopTts
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
      spokeRef.current = false;
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

    if (!greetedRef.current && messages.length === 0) {
      greetedRef.current = true;
      setJarvisReply(WELCOME);
      setMenuOptions(parseMenuOptions(WELCOME_MENU));
      addMessage({ role: 'assistant', content: WELCOME, provider: 'welcome' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                Escucha · entiende · habla · actúa
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
            <button
              type="button"
              onClick={() => setHandsFree((v) => !v)}
              className={`chip hidden md:inline-flex ${
                handsFree
                  ? 'border-jarvis-cyan/40 text-jarvis-cyan bg-jarvis-cyan/10'
                  : 'border-white/10 text-zinc-400'
              }`}
              title="Modo manos libres: escucha continua"
              aria-pressed={handsFree}
            >
              <Ear size={12} />
              {handsFree ? 'Manos libres' : 'Pulsar mic'}
            </button>
            {degradedMode && !offlineMode && (
              <span className="chip border-amber-500/30 text-amber-400 bg-amber-500/5 hidden lg:inline-flex">
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
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => {
                spokeRef.current = false;
                handleSpeak(jarvisReply || WELCOME);
              }}
              className="text-xs text-jarvis-cyan/80 hover:text-jarvis-gold underline-offset-2 hover:underline"
            >
              {isSpeaking ? 'Hablando…' : '▶ Escuchar respuesta de JARVIS'}
            </button>
            <p className="text-xs text-muted text-center max-w-lg leading-relaxed">
              Micrófono → te escucho. Escribe o habla → te entiendo. Respondo y hablo. Listo para ayudarte.
            </p>
          </div>
        </section>

        <JarvisChatPanel
          isOpen={isChatOpen}
          messages={messages}
          onClose={toggleChat}
          onOptionClick={handleMenuSelect}
        />
      </main>

      <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 pb-3 relative z-10">
        <JarvisSubtitles
          userText={transcript || input}
          jarvisText={cleanSpeakText(jarvisReply, 280) || jarvisReply}
          isListening={isListening}
          isSpeaking={isSpeaking}
          interimTranscript={interimTranscript}
        />
        {sttError && <p className="text-jarvis-red text-xs mt-2">{sttError}</p>}
        {menuOptions.length > 0 && (
          <JarvisActionMenu
            options={menuOptions.filter((o) => o.id !== '0')}
            onSelect={handleMenuSelect}
            disabled={sending}
          />
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
            value={isListening ? interimTranscript || transcript || input : input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isListening
                ? handsFree
                  ? 'Manos libres — habla cuando quieras…'
                  : 'Escuchando… habla ahora'
                : offlineMode
                  ? 'Offline — tareas y comandos locales…'
                  : !sttSupported
                    ? 'Escribe tu mensaje…'
                    : 'Escribe o pulsa el micrófono…'
            }
            className="flex-1 bg-transparent border-none outline-none text-sm px-3 min-h-[44px] placeholder:text-zinc-500"
            disabled={sending || (isListening && !handsFree)}
            aria-label="Mensaje"
          />
          <JarvisVoiceButton
            isListening={isListening}
            onToggle={handleVoiceToggle}
            disabled={!sttSupported || sending}
          />
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
