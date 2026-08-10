import { useEffect, useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { jarvisApi, musicApi } from '../../lib/api';
import { useJarvisStore } from '../../store/useJarvisStore';
import { getAvailableVoices, loadVoices } from '../../lib/voices';

const TABS = ['Voz', 'Música', 'Memorias', 'Sistema'];

export default function JarvisSettingsModal({ isOpen, onClose, socketConnected, degradedMode }) {
  const [tab, setTab] = useState('Voz');
  const [voiceId, setVoiceId] = useState(localStorage.getItem('jarvis_voice_id') || '');
  const [browserVoice, setBrowserVoice] = useState(localStorage.getItem('jarvis_browser_voice') || '');
  const [ttsRate, setTtsRate] = useState(Number(localStorage.getItem('jarvis_tts_rate') || '0.95'));
  const [ttsPitch, setTtsPitch] = useState(Number(localStorage.getItem('jarvis_tts_pitch') || '0.95'));
  const [useElevenLabs, setUseElevenLabs] = useState(() => {
    const v = localStorage.getItem('jarvis_use_elevenlabs');
    return v === null || v === '' ? 'auto' : v;
  });
  const [voices, setVoices] = useState([]);
  const [caps, setCaps] = useState({ anthropic: false, elevenLabs: false });
  const [library, setLibrary] = useState([]);
  const { currentMemories, setMemories } = useJarvisStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    loadVoices();
    setVoices(getAvailableVoices());
    jarvisApi.getMemories().then((r) => setMemories(r.data || [])).catch(() => {});
    musicApi.library().then((r) => setLibrary(r.data || [])).catch(() => {});
    jarvisApi.capabilities().then((r) => {
      setCaps(r.data || {});
      if (r.data?.elevenLabs && !localStorage.getItem('jarvis_voice_id') && r.data.defaultVoiceId) {
        setVoiceId(r.data.defaultVoiceId);
      }
    }).catch(() => {});
  }, [isOpen, setMemories]);

  const saveVoiceSettings = () => {
    localStorage.setItem('jarvis_voice_id', voiceId);
    localStorage.setItem('jarvis_browser_voice', browserVoice);
    localStorage.setItem('jarvis_tts_rate', String(ttsRate));
    localStorage.setItem('jarvis_tts_pitch', String(ttsPitch));
    localStorage.setItem('jarvis_use_elevenlabs', useElevenLabs);
  };

  const deleteMemory = async (id) => {
    setLoading(true);
    try {
      await jarvisApi.deleteMemory(id);
      const r = await jarvisApi.getMemories();
      setMemories(r.data || []);
    } finally {
      setLoading(false);
    }
  };

  const clearAllMemories = async () => {
    if (!window.confirm('¿Eliminar todas las memorias?')) return;
    setLoading(true);
    try {
      await jarvisApi.clearMemories();
      setMemories([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4">
      <div className="surface-elevated w-full sm:max-w-lg max-h-[95vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 h-12 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold">Ajustes</h2>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-1 px-3 py-2 border-b border-white/[0.06] overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap min-h-[36px] ${
                tab === t ? 'bg-white/[0.06] text-jarvis-gold' : 'text-zinc-400'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {tab === 'Voz' && (
            <>
              <p className="text-xs text-muted">
                Modo <strong className="text-white/80">Auto</strong>: intenta ElevenLabs (voz premium) y si no hay key usa la mejor voz masculina española del navegador.
              </p>
              {!caps.elevenLabs && (
                <p className="text-xs text-amber-400/90 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                  ElevenLabs no configurado en el servidor. Añade ELEVENLABS_API_KEY en Render / server/.env para voz neural.
                </p>
              )}
              {!caps.anthropic && (
                <p className="text-xs text-amber-400/90 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                  ANTHROPIC_API_KEY ausente — JARVISIA está en modo básico sin razonamiento completo.
                </p>
              )}

              <label className="block text-sm text-muted">
                Motor de voz
                <select
                  value={useElevenLabs}
                  onChange={(e) => setUseElevenLabs(e.target.value)}
                  className="input-field mt-1"
                >
                  <option value="auto">Auto (recomendado)</option>
                  <option value="true">Solo ElevenLabs</option>
                  <option value="false">Solo navegador</option>
                </select>
              </label>

              <label className="block text-sm text-muted">
                Voz del navegador
                <select
                  value={browserVoice}
                  onChange={(e) => setBrowserVoice(e.target.value)}
                  className="input-field mt-1"
                >
                  <option value="">Automática (mejor español disponible)</option>
                  {voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-muted">
                ElevenLabs Voice ID
                <input
                  type="text"
                  value={voiceId}
                  onChange={(e) => setVoiceId(e.target.value)}
                  className="input-field mt-1"
                  placeholder="Solo si ElevenLabs está activo"
                />
              </label>

              <label className="block text-sm text-muted">
                Velocidad: {ttsRate.toFixed(2)}x
                <input type="range" min="0.7" max="1.2" step="0.05" value={ttsRate} onChange={(e) => setTtsRate(Number(e.target.value))} className="w-full mt-2 accent-jarvis-gold" />
              </label>

              <label className="block text-sm text-muted">
                Tono: {ttsPitch.toFixed(2)}
                <input type="range" min="0.7" max="1.1" step="0.05" value={ttsPitch} onChange={(e) => setTtsPitch(Number(e.target.value))} className="w-full mt-2 accent-jarvis-gold" />
              </label>

              <button type="button" onClick={saveVoiceSettings} className="w-full py-3 rounded-xl bg-jarvis-gold/15 text-jarvis-gold text-sm font-medium min-h-[44px]">
                Guardar voz
              </button>
            </>
          )}

          {tab === 'Música' && (
            <div className="space-y-2">
              <p className="text-sm text-muted">Biblioteca ({library.length})</p>
              <ul className="space-y-1 max-h-52 overflow-y-auto">
                {library.map((t) => (
                  <li key={t.filename} className="text-sm px-3 py-2 rounded-lg bg-white/[0.03] truncate">{t.title}</li>
                ))}
                {library.length === 0 && <li className="text-sm text-muted">Sin pistas — agrega MP3 en server/public/audio/</li>}
              </ul>
            </div>
          )}

          {tab === 'Memorias' && (
            <>
              <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted border-b border-white/[0.06] bg-white/[0.02]">
                      <th className="p-2">Tipo</th>
                      <th className="p-2">Contenido</th>
                      <th className="p-2 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {currentMemories.map((m) => (
                      <tr key={m._id} className="border-b border-white/[0.04]">
                        <td className="p-2 text-jarvis-gold">{m.type}</td>
                        <td className="p-2 max-w-[160px] truncate">{m.content}</td>
                        <td className="p-2">
                          <button type="button" onClick={() => deleteMemory(m._id)} disabled={loading} aria-label="Eliminar">
                            <Trash2 size={14} className="text-jarvis-red" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={clearAllMemories} disabled={loading} className="w-full py-3 rounded-xl border border-jarvis-red/30 text-jarvis-red text-sm min-h-[44px]">
                Limpiar memorias
              </button>
            </>
          )}

          {tab === 'Sistema' && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted">Versión</span><span>1.1.0</span></div>
              <div className="flex justify-between"><span className="text-muted">Socket</span><span className={socketConnected ? 'text-emerald-400' : 'text-zinc-400'}>{socketConnected ? 'Conectado' : 'Desconectado'}</span></div>
              <div className="flex justify-between"><span className="text-muted">Internet</span><span className="text-emerald-400">web_search activo</span></div>
              <div className="flex justify-between"><span className="text-muted">Modo IA</span><span className={degradedMode ? 'text-amber-400' : 'text-emerald-400'}>{degradedMode ? 'Básico' : 'Completo'}</span></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
