const STORAGE_KEY = 'jarvisia_local_tasks_v1';

function uid() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeAll(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 500)));
}

export function listLocalTasks(filter = 'pending') {
  let tasks = readAll();
  if (filter === 'pending') tasks = tasks.filter((t) => t.status !== 'completada');
  if (filter === 'completed') tasks = tasks.filter((t) => t.status === 'completada');
  if (filter === 'today') {
    const day = new Date().toISOString().slice(0, 10);
    tasks = tasks.filter((t) => t.dueDate && String(t.dueDate).startsWith(day));
  }
  return tasks.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export function createLocalTask({ title, priority = 'media', dueDate, tags = [] }) {
  const task = {
    id: uid(),
    title: String(title || '').trim().slice(0, 300),
    priority,
    status: 'pendiente',
    dueDate: dueDate || null,
    tags,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    localOnly: true
  };
  if (!task.title) throw new Error('Título requerido');
  const all = readAll();
  all.unshift(task);
  writeAll(all);
  return task;
}

export function completeLocalTask(id) {
  const all = readAll().map((t) =>
    t.id === id ? { ...t, status: 'completada', updatedAt: new Date().toISOString() } : t
  );
  writeAll(all);
  return all.find((t) => t.id === id) || null;
}

export function deleteLocalTask(id) {
  writeAll(readAll().filter((t) => t.id !== id));
}

export function localTasksSummary() {
  const all = readAll();
  return {
    pendiente: all.filter((t) => t.status === 'pendiente').length,
    en_progreso: all.filter((t) => t.status === 'en_progreso').length,
    completada: all.filter((t) => t.status === 'completada').length
  };
}

export function mergeServerTasks(serverTasks = []) {
  const local = readAll().filter((t) => t.localOnly);
  const mapped = serverTasks.map((t) => ({
    id: String(t._id || t.id),
    title: t.title,
    priority: t.priority,
    status: t.status,
    dueDate: t.dueDate,
    tags: t.tags || [],
    createdAt: t.createdAt,
    localOnly: false
  }));
  return [...local, ...mapped];
}
