import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, X } from 'lucide-react';

function formatTime(date) {
  return new Date(date).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });
}

export default function JarvisChatPanel({ isOpen, messages = [], onClose, onOptionClick }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className="fixed lg:relative inset-x-0 bottom-0 lg:inset-auto z-40 lg:w-[360px] surface-elevated lg:rounded-2xl flex flex-col max-h-[65vh] lg:max-h-[calc(100vh-8rem)] border-t lg:border border-jarvis-cyan/15"
        >
          <div className="flex items-center justify-between px-4 h-12 border-b border-white/[0.06] shrink-0">
            <h2 className="text-sm font-semibold font-jarvis tracking-wide">Conversación</h2>
            <button type="button" onClick={onClose} className="icon-btn" aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-muted text-sm text-center py-10">Aún no hay mensajes</p>
            )}
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              const body = String(msg.content || '');
              const parts = body.split('¿Qué deseas hacer ahora?');
              const main = parts[0];
              const menuPart = parts.length > 1 ? `¿Qué deseas hacer ahora?${parts.slice(1).join('')}` : '';
              return (
                <div key={msg.id} className={`flex flex-col max-w-[92%] ${isUser ? 'ml-auto items-end' : ''}`}>
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? 'bg-jarvis-red/15 text-zinc-100 border border-jarvis-red/20'
                        : 'bg-white/[0.04] text-zinc-100 border border-white/[0.06]'
                    }`}
                  >
                    {main.trim()}
                    {!isUser && menuPart && onOptionClick && (
                      <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                        {menuPart
                          .split('\n')
                          .map((line) => line.match(/^\s*\[(\d+)\]\s+(.+)/))
                          .filter(Boolean)
                          .map((m) => (
                            <button
                              key={`${msg.id}-${m[1]}`}
                              type="button"
                              className="block w-full text-left text-xs text-jarvis-cyan/90 hover:text-jarvis-gold"
                              onClick={() => onOptionClick(m[1], m[2])}
                            >
                              [{m[1]}] {m[2]}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-zinc-500">
                    <span>{formatTime(msg.timestamp || Date.now())}</span>
                    {msg.provider && <span className="text-jarvis-violet/70">{msg.provider}</span>}
                    {msg.toolsUsed?.length > 0 && (
                      <span className="flex items-center gap-0.5 text-jarvis-gold/80">
                        <Wrench size={10} />
                        {msg.toolsUsed.length}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
