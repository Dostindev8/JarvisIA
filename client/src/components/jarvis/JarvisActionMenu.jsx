import { motion } from 'framer-motion';

const DEFAULT = [
  { id: '1', label: 'Continuar conversación' },
  { id: '2', label: 'Ver mis tareas pendientes' },
  { id: '3', label: 'Crear una nueva tarea' },
  { id: '4', label: 'Buscar en mi historial' },
  { id: '5', label: 'Ver estado de conexión' },
  { id: '6', label: 'Configuración' }
];

export default function JarvisActionMenu({ options = DEFAULT, onSelect, disabled }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto mt-3 rounded-2xl border border-jarvis-cyan/20 bg-jarvis-deep/70 backdrop-blur-xl p-3 shadow-[0_0_40px_rgba(0,212,255,0.08)]"
    >
      <p className="text-[10px] uppercase tracking-[0.2em] text-jarvis-cyan/70 mb-2 font-jarvis">
        Siguiente paso
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect?.(opt.id, opt.label)}
            className="text-left text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-jarvis-cyan/10 hover:border-jarvis-cyan/30 transition-colors disabled:opacity-40"
          >
            <span className="text-jarvis-gold font-mono mr-2">[{opt.id}]</span>
            {opt.label}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
