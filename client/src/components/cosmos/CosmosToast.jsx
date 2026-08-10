import { create } from 'zustand';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { toastVariants } from '../../lib/motionVariants';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
};

const colors = {
  success: 'border-jarvis-emerald/30 text-jarvis-emerald',
  error: 'border-jarvis-red/30 text-jarvis-red',
  warning: 'border-jarvis-amber/30 text-jarvis-amber',
  info: 'border-jarvis-cyan/30 text-jarvis-cyan'
};

export const useToastStore = create((set, get) => ({
  toasts: [],
  add: (toast) => {
    const id = Date.now();
    const next = [{ id, ...toast }, ...get().toasts].slice(0, 3);
    set({ toasts: next });
    setTimeout(() => get().remove(id), 4000);
  },
  remove: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) })
}));

export function toast(message, variant = 'info', title) {
  useToastStore.getState().add({ message, variant, title: title || variant });
}

export function CosmosToastContainer() {
  const { toasts, remove } = useToastStore();
  return (
    <div className="fixed top-4 right-4 left-4 sm:left-auto z-[80] flex flex-col gap-2 max-w-sm sm:max-w-md ml-auto">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = icons[t.variant] || Info;
          return (
            <motion.div
              key={t.id}
              variants={toastVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={`glass-md rounded-lg border p-4 flex gap-3 ${colors[t.variant]}`}
            >
              <Icon size={18} className="shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium capitalize">{t.title}</p>
                <p className="text-xs text-white/70 mt-0.5">{t.message}</p>
              </div>
              <button type="button" onClick={() => remove(t.id)} className="shrink-0 opacity-60 hover:opacity-100">
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
