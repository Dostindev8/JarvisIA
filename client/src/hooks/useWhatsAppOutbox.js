import { useCallback, useEffect, useState } from 'react';
import { whatsappApi } from '../lib/api';

/**
 * Gestiona los borradores de WhatsApp pendientes de confirmación.
 * Escucha eventos de socket en vivo (whatsapp:draft / sent / cancelled / failed).
 */
export function useWhatsAppOutbox(socket) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await whatsappApi.outbox('pending_confirmation');
      setDrafts(res.data || []);
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

    const onDraft = (d) => {
      setDrafts((prev) => (prev.some((x) => x.id === d.id) ? prev : [d, ...prev]));
    };
    const removeById = (d) => setDrafts((prev) => prev.filter((x) => x.id !== d.id));

    socket.on('whatsapp:draft', onDraft);
    socket.on('whatsapp:sent', removeById);
    socket.on('whatsapp:cancelled', removeById);
    socket.on('whatsapp:failed', (d) =>
      setDrafts((prev) => prev.map((x) => (x.id === d.id ? { ...x, status: 'failed', error: d.error } : x)))
    );

    return () => {
      socket.off('whatsapp:draft', onDraft);
      socket.off('whatsapp:sent', removeById);
      socket.off('whatsapp:cancelled', removeById);
      socket.off('whatsapp:failed');
    };
  }, [socket]);

  const confirm = useCallback(async (id, message) => {
    setBusyId(id);
    setError('');
    try {
      await whatsappApi.confirm(id, message);
      setDrafts((prev) => prev.filter((x) => x.id !== id));
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusyId(null);
    }
  }, []);

  const cancel = useCallback(async (id) => {
    setBusyId(id);
    try {
      await whatsappApi.cancel(id);
      setDrafts((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }, []);

  return { drafts, loading, busyId, error, confirm, cancel, reload: load };
}
