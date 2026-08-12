import { useEffect, useState } from 'react';
import { CheckCircle2, ListTodo, Plus, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { tasksApi } from '../../lib/api';
import {
  createLocalTask,
  listLocalTasks,
  completeLocalTask,
  deleteLocalTask,
  mergeServerTasks
} from '../../lib/localTasks';

export default function JarvisTasksPanel({ isOpen, onClose, online }) {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('media');
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    if (online) {
      try {
        const res = await tasksApi.list('pending');
        setTasks(mergeServerTasks(res.data || []));
        return;
      } catch {
        /* fallback local */
      }
    }
    setTasks(listLocalTasks('pending'));
  };

  useEffect(() => {
    if (isOpen) reload();
  }, [isOpen, online]);

  const add = async (e) => {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      if (online) {
        try {
          await tasksApi.create({ title: title.trim(), priority });
          setTitle('');
          await reload();
          return;
        } catch {
          /* local */
        }
      }
      createLocalTask({ title: title.trim(), priority });
      setTitle('');
      setTasks(listLocalTasks('pending'));
    } finally {
      setBusy(false);
    }
  };

  const complete = async (task) => {
    if (online && !task.localOnly) {
      try {
        await tasksApi.complete(task.id);
        await reload();
        return;
      } catch {
        /* local */
      }
    }
    completeLocalTask(task.id);
    setTasks(listLocalTasks('pending'));
  };

  const remove = async (task) => {
    if (online && !task.localOnly) {
      try {
        await tasksApi.remove(task.id);
        await reload();
        return;
      } catch {
        /* local */
      }
    }
    deleteLocalTask(task.id);
    setTasks(listLocalTasks('pending'));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          className="fixed right-3 bottom-28 sm:bottom-24 z-40 w-[min(100%-1.5rem,360px)] max-h-[55vh] surface-elevated rounded-2xl border border-jarvis-violet/25 flex flex-col shadow-[0_0_50px_rgba(123,97,255,0.15)]"
        >
          <div className="flex items-center justify-between px-4 h-12 border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <ListTodo size={16} className="text-jarvis-violet" />
              Tareas
            </h2>
            <button type="button" onClick={onClose} className="icon-btn" aria-label="Cerrar tareas">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={add} className="p-3 flex gap-2 border-b border-white/[0.06]">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nueva tarea…"
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 text-sm min-h-[40px] outline-none focus:border-jarvis-cyan/40"
              aria-label="Título de tarea"
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs px-2"
              aria-label="Prioridad"
            >
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
            <button type="submit" disabled={busy} className="icon-btn bg-jarvis-violet/20" aria-label="Añadir">
              <Plus size={16} />
            </button>
          </form>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {tasks.length === 0 && (
              <p className="text-muted text-sm text-center py-8">Sin tareas pendientes</p>
            )}
            {tasks.map((t) => (
              <div
                key={t.id}
                className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 flex items-start gap-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{t.title}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    {t.priority}
                    {t.localOnly ? ' · local' : ''}
                  </p>
                </div>
                <button type="button" onClick={() => complete(t)} className="icon-btn" aria-label="Completar">
                  <CheckCircle2 size={16} className="text-jarvis-emerald" />
                </button>
                <button type="button" onClick={() => remove(t)} className="icon-btn" aria-label="Eliminar">
                  <Trash2 size={16} className="text-jarvis-red/80" />
                </button>
              </div>
            ))}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
