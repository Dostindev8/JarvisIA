const HISTORY_KEY = 'jarvisia_chat_history_v1';
const MAX = 80;

export function loadLocalHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function appendLocalHistory(entry) {
  const list = loadLocalHistory();
  list.push({
    ...entry,
    id: entry.id || Date.now() + Math.random(),
    timestamp: entry.timestamp || new Date().toISOString()
  });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(-MAX)));
}

export function searchLocalHistory(query) {
  const q = String(query || '').toLowerCase().trim();
  if (!q) return loadLocalHistory().slice(-10);
  return loadLocalHistory()
    .filter((m) => String(m.content || '').toLowerCase().includes(q))
    .slice(-20);
}

export function clearLocalHistory() {
  localStorage.removeItem(HISTORY_KEY);
}
