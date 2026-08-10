// En dev, vacío usa el proxy de Vite (/api → :5000). En prod, VITE_API_URL es obligatorio.
const API_BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '' : '');

export function getToken() {
  return localStorage.getItem('jarvis_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('jarvis_token', token);
  else localStorage.removeItem('jarvis_token');
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  };

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error('No se pudo conectar al servidor. Verifica que el backend esté en puerto 5000.');
  }
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || data.error || `Error ${res.status}`);
  }

  return data;
}

export const authApi = {
  login: (email, password) =>
    apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name, email, password) =>
    apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  me: () => apiFetch('/api/auth/me'),
  logout: () => apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
};

export const jarvisApi = {
  chat: (message, conversationId, audioMode = true) =>
    apiFetch('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, conversationId, audioMode })
    }),
  capabilities: () => apiFetch('/api/ai/capabilities'),
  getMemories: () => apiFetch('/api/ai/memories'),
  deleteMemory: (id) => apiFetch(`/api/ai/memories/${id}`, { method: 'DELETE' }),
  clearMemories: () => apiFetch('/api/ai/memories', { method: 'DELETE' }),
  ttsUrl: (text, voiceId) => {
    const base = API_BASE || '';
    const params = new URLSearchParams({ text });
    if (voiceId) params.set('voiceId', voiceId);
    return `${base}/api/ai/tts`;
  }
};

export const musicApi = {
  library: () => apiFetch('/api/music/library'),
  playlists: () => apiFetch('/api/music/playlists')
};

export const whatsappApi = {
  outbox: (status = 'pending_confirmation') =>
    apiFetch(`/api/whatsapp/outbox?status=${encodeURIComponent(status)}`),
  edit: (id, message) =>
    apiFetch(`/api/whatsapp/outbox/${id}`, { method: 'PATCH', body: JSON.stringify({ message }) }),
  confirm: (id, message) =>
    apiFetch(`/api/whatsapp/outbox/${id}/confirm`, {
      method: 'POST',
      body: JSON.stringify(message ? { message } : {})
    }),
  cancel: (id) => apiFetch(`/api/whatsapp/outbox/${id}/cancel`, { method: 'POST' }),
  create: (payload) =>
    apiFetch('/api/whatsapp/outbox', { method: 'POST', body: JSON.stringify(payload) }),
  inbound: (scope = 'pending') =>
    apiFetch(`/api/whatsapp/inbound?scope=${encodeURIComponent(scope)}`),
  draftReply: (id) => apiFetch(`/api/whatsapp/inbound/${id}/draft`, { method: 'POST' }),
  dismissInbound: (id) => apiFetch(`/api/whatsapp/inbound/${id}/dismiss`, { method: 'POST' })
};
