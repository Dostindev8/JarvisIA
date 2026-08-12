/**
 * Detector de conectividad hacia proveedores de IA (fail-safe → offline).
 * Cache 15s para no añadir latencia en cada mensaje.
 */

let cache = { online: true, checkedAt: 0, detail: 'unknown' };
const TTL_MS = 15_000;
const TIMEOUT_MS = 2000;

async function probe(url, init = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    return res.ok || res.status === 401 || res.status === 403 || res.status === 405;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

async function isOnline(force = false) {
  const now = Date.now();
  if (!force && now - cache.checkedAt < TTL_MS) return cache.online;

  // Cloudflare / DNS — prueba de salida a internet
  const netOk = await probe('https://1.1.1.1', { method: 'HEAD' });
  if (!netOk) {
    cache = { online: false, checkedAt: now, detail: 'no_internet' };
    return false;
  }

  cache = { online: true, checkedAt: now, detail: 'ok' };
  return true;
}

function getConnectivityStatus() {
  return { ...cache, ageMs: Date.now() - cache.checkedAt };
}

module.exports = { isOnline, getConnectivityStatus };
