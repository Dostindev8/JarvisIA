import { useCallback, useEffect, useState } from 'react';
import { whatsappApi } from '../lib/api';

/**
 * Gestiona los mensajes de WhatsApp entrantes (bandeja de entrada).
 * Escucha `whatsapp:inbound` en vivo y permite pedirle a JARVIS que redacte
 * una respuesta (que queda como borrador pendiente de confirmación).
 */
export function useWhatsAppInbound(socket) {
  const [inbox, setInbox] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await whatsappApi.inbound('pending');
      setInbox(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!socket) return undefined;
    const onInbound = (m) => {
      setInbox((prev) => (prev.some((x) => x.id === m.id) ? prev : [m, ...prev]));
    };
    socket.on('whatsapp:inbound', onInbound);
    return () => socket.off('whatsapp:inbound', onInbound);
  }, [socket]);

  const draftReply = useCallback(async (id) => {
    setBusyId(id);
    setError('');
    try {
      await whatsappApi.draftReply(id);
      setInbox((prev) => prev.filter((x) => x.id !== id));
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusyId(null);
    }
  }, []);

  const dismiss = useCallback(async (id) => {
    setBusyId(id);
    try {
      await whatsappApi.dismissInbound(id);
      setInbox((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }, []);

  return { inbox, loading, busyId, error, draftReply, dismiss, reload: load };
}
