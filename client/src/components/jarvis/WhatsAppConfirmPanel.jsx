import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Check, X, Pencil, Send, AlertTriangle } from 'lucide-react';

function DraftCard({ draft, busy, onConfirm, onCancel }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(draft.message);

  const recipient = draft.recipientName || draft.phoneNormalized || draft.phone;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="glass-md rounded-xl border border-jarvis-emerald/30 p-4 shadow-panel"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="w-8 h-8 rounded-lg bg-jarvis-emerald/15 text-jarvis-emerald flex items-center justify-center shrink-0">
          <MessageCircle size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate">{recipient}</p>
          <p className="text-[11px] text-white/40">WhatsApp · pendiente de tu confirmación</p>
        </div>
      </div>

      {draft.inboundMessage && (
        <div className="mb-3 rounded-lg bg-white/[0.03] border-l-2 border-jarvis-cyan/40 px-3 py-2">
          <p className="text-[10px] uppercase tracking-widest text-jarvis-cyan/70 mb-1">Mensaje recibido</p>
          <p className="text-xs text-white/60 line-clamp-3">{draft.inboundMessage}</p>
        </div>
      )}

      {editing ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={4096}
          className="w-full rounded-lg bg-jarvis-navy/60 border border-jarvis-gold/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-jarvis-gold/20 resize-none"
        />
      ) : (
        <p className="text-sm text-white/90 whitespace-pre-wrap rounded-lg bg-jarvis-emerald/5 px-3 py-2.5">{text}</p>
      )}

      {draft.status === 'failed' && (
        <p className="mt-2 text-xs text-jarvis-red flex items-center gap-1">
          <AlertTriangle size={12} /> {draft.error || 'Fallo al enviar'}
        </p>
      )}

      <div className="flex items-center gap-2 mt-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => onConfirm(draft.id, editing ? text : undefined)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-jarvis-emerald/90 hover:bg-jarvis-emerald text-jarvis-void font-semibold text-sm py-2.5 min-h-[44px] disabled:opacity-50 transition-colors"
        >
          {busy ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Send size={15} />}
          Enviar
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setEditing((v) => !v)}
          className="icon-btn border border-white/10"
          aria-label="Editar mensaje"
        >
          {editing ? <Check size={16} /> : <Pencil size={16} />}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onCancel(draft.id)}
          className="icon-btn border border-jarvis-red/30 text-jarvis-red"
          aria-label="Cancelar"
        >
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
}

export default function WhatsAppConfirmPanel({ drafts, busyId, onConfirm, onCancel }) {
  if (!drafts?.length) return null;

  return (
    <div className="fixed bottom-24 right-4 left-4 sm:left-auto z-[55] w-auto sm:w-[360px] max-h-[70vh] overflow-y-auto space-y-3">
      <div className="flex items-center gap-2 px-1">
        <span className="text-xs uppercase tracking-widest text-jarvis-emerald/80 font-medium">
          WhatsApp · {drafts.length} por confirmar
        </span>
      </div>
      <AnimatePresence mode="popLayout">
        {drafts.map((d) => (
          <DraftCard key={d.id} draft={d} busy={busyId === d.id} onConfirm={onConfirm} onCancel={onCancel} />
        ))}
      </AnimatePresence>
    </div>
  );
}
