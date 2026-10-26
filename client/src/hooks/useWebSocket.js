import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for native browser WebSocket connection with automatic exponential backoff reconnect.
 *
 * @param {string} relativePath - E.g. '/ws/chat/1/' or '/ws/notifications/'
 * @param {string} token - JWT access token
 * @param {object} options - { onMessage, enabled }
 */
export function useWebSocket(relativePath, token, options = {}) {
  const { onMessage, enabled = true } = options;

  const [connectionStatus, setConnectionStatus] = useState('DISCONNECTED'); // 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED'
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    if (!enabled || !token || !relativePath) {
      setConnectionStatus('DISCONNECTED');
      return;
    }

    // Clean up existing instance if any
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const wsProtocol = apiBase.startsWith('https') ? 'wss:' : 'ws:';
    const host = apiBase.replace(/^https?:\/\//, '');
    const wsUrl = `${wsProtocol}//${host}${relativePath}?token=${encodeURIComponent(token)}`;

    setConnectionStatus('CONNECTING');
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('CONNECTED');
      reconnectAttemptsRef.current = 0;
    };

    ws.onmessage = (event) => {
      if (onMessageRef.current) {
        try {
          const parsed = JSON.parse(event.data);
          onMessageRef.current(parsed, event);
        } catch {
          onMessageRef.current(event.data, event);
        }
      }
    };

    ws.onerror = (error) => {
      console.warn('WebSocket connection error:', error);
    };

    ws.onclose = (event) => {
      wsRef.current = null;
      setConnectionStatus('DISCONNECTED');

      // Do not reconnect if closed cleanly or unauthenticated (code 4001/4003)
      if (event.code === 4001 || event.code === 4003 || event.wasClean) {
        return;
      }

      // Reconnect with exponential backoff if within max attempts
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const timeout = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
        reconnectAttemptsRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, timeout);
      }
    };
  }, [relativePath, token, enabled]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const send = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const payload = typeof data === 'string' ? data : JSON.stringify(data);
      wsRef.current.send(payload);
      return true;
    }
    return false;
  }, []);

  return {
    connectionStatus,
    send,
    isConnected: connectionStatus === 'CONNECTED',
    isConnecting: connectionStatus === 'CONNECTING',
  };
}
