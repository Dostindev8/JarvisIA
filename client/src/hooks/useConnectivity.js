import { useEffect, useState, useCallback } from 'react';
import { API_BASE_HINT } from '../lib/apiMeta';

/**
 * Detecta online real (navigator + ping API) con cache corta.
 */
export function useConnectivity(pollMs = 20000) {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [apiReachable, setApiReachable] = useState(true);
  const [checkedAt, setCheckedAt] = useState(0);

  const probe = useCallback(async () => {
    const browserOnline = navigator.onLine;
    setOnline(browserOnline);
    if (!browserOnline) {
      setApiReachable(false);
      setCheckedAt(Date.now());
      return false;
    }
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 2500);
      const base = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${base}/api/health`, { method: 'GET', signal: ctrl.signal, cache: 'no-store' });
      clearTimeout(t);
      const ok = res.ok;
      setApiReachable(ok);
      setCheckedAt(Date.now());
      return ok;
    } catch {
      setApiReachable(false);
      setCheckedAt(Date.now());
      return false;
    }
  }, []);

  useEffect(() => {
    probe();
    const onOnline = () => probe();
    const onOffline = () => {
      setOnline(false);
      setApiReachable(false);
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    const id = setInterval(probe, pollMs);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(id);
    };
  }, [probe, pollMs]);

  return {
    online: online && apiReachable,
    browserOnline: online,
    apiReachable,
    checkedAt,
    refresh: probe,
    hint: API_BASE_HINT
  };
}
