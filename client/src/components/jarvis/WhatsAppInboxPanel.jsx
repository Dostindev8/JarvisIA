import { motion, AnimatePresence } from 'framer-motion';
import { Inbox, Sparkles, X } from 'lucide-react';

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return new Date(date).toLocaleDateString();
}

function InboxCard({ item, busy, onDraft, onDismiss }) {
  const who = item.name || item.fromNormalized || item.from;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="glass-md rounded-xl border border-jarvis-cyan/30 p-4 shadow-panel"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="w-8 h-8 rounded-lg bg-jarvis-cyan/15 text-jarvis-cyan flex items-center justify-center shrink-0">
          <Inbox size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate">{who}</p>
          <p className="text-[11px] text-white/40">WhatsApp entrante · {timeAgo(item.receivedAt)}</p>
        </div>
      </div>

      <p className="text-sm text-white/90 whitespace-pre-wrap rounded-lg bg-jarvis-cyan/5 px-3 py-2.5 mb-3 line-clamp-4">
        {item.text}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onDraft(item.id)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-jarvis-cyan/90 hover:bg-jarvis-cyan text-jarvis-void font-semibold text-sm py-2.5 min-h-[44px] disabled:opacity-50 transition-colors"
        >
          {busy ? (
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Sparkles size={15} />
          )}
          JARVIS responde
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onDismiss(item.id)}
          className="icon-btn border border-white/10"
          aria-label="Descartar"
        >
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
}

export default function WhatsAppInboxPanel({ inbox, busyId, onDraft, onDismiss }) {
  if (!inbox?.length) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 sm:right-auto z-[54] w-auto sm:w-[360px] max-h-[70vh] overflow-y-auto space-y-3">
      <div className="flex items-center gap-2 px-1">
        <span className="text-xs uppercase tracking-widest text-jarvis-cyan/80 font-medium">
          Entrantes · {inbox.length} sin responder
        </span>
      </div>
      <AnimatePresence mode="popLayout">
        {inbox.map((item) => (
          <InboxCard
            key={item.id}
            item={item}
            busy={busyId === item.id}
            onDraft={onDraft}
            onDismiss={onDismiss}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
