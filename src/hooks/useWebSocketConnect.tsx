import { useCallback, useRef, useState } from 'react';

type MessageCallback = (message: string) => void;

export function useWebSocketConnect() {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Set<MessageCallback>>(new Set());

  const addMessageListener = useCallback((cb: MessageCallback) => {
    listenersRef.current.add(cb);
    return () => {
      listenersRef.current.delete(cb);
    };
  }, []);

  const connect = useCallback((url: string) => {
    wsRef.current?.close();
    listenersRef.current.clear();
    const ws = new WebSocket(url);

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onerror = () => setIsConnected(false);
    ws.onmessage = (event) => {
      for (const cb of listenersRef.current) cb(event.data as string);
    };

    wsRef.current = ws;
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
  }, []);

  const sendJson = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN)
      wsRef.current.send(JSON.stringify(data));
  }, []);

  return { isConnected, connect, disconnect, sendJson, addMessageListener };
}
