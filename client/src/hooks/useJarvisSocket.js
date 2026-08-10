import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { getToken } from '../lib/api';
import { useJarvisStore } from '../store/useJarvisStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || '';

export function useJarvisSocket({ onResponse, onStateChange } = {}) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const retryRef = useRef(0);
  const socketRef = useRef(null);
  const { setSocketConnected, setDegradedMode, setJarvisState } = useJarvisStore();

  const connect = useCallback(() => {
    const token = getToken();
    if (!token) return;

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    setConnectionState('connecting');

    const s = io(SOCKET_URL || window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: Math.min(1000 * 2 ** retryRef.current, 30000),
      reconnectionAttempts: 10
    });

    s.on('connect', () => {
      retryRef.current = 0;
      setIsConnected(true);
      setConnectionState('connected');
      setSocketConnected(true);
      setDegradedMode(false);
    });

    s.on('disconnect', () => {
      setIsConnected(false);
      setConnectionState('disconnected');
      setSocketConnected(false);
      setDegradedMode(true);
    });

    s.on('connect_error', () => {
      retryRef.current += 1;
      setConnectionState('error');
      setDegradedMode(true);
    });

    s.on('jarvis:response', (data) => {
      onResponse?.(data);
    });

    s.on('jarvis:state', (data) => {
      if (data?.state) setJarvisState(data.state);
      onStateChange?.(data);
    });

    socketRef.current = s;
    setSocket(s);
  }, [onResponse, onStateChange, setDegradedMode, setJarvisState, setSocketConnected]);

  useEffect(() => {
    connect();
    return () => {
      socketRef.current?.disconnect();
    };
  }, [connect]);

  return { socket, isConnected, connectionState, reconnect: connect };
}
