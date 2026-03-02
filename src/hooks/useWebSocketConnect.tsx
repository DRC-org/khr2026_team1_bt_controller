import { useCallback, useRef, useState } from 'react';

type MessageCallback = (message: string) => void;

export function useWebSocketConnect() {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messageCallbackRef = useRef<MessageCallback | null>(null);

  const onMessage = useCallback((cb: MessageCallback) => {
    messageCallbackRef.current = cb;
  }, []);

  const connect = useCallback((url: string) => {
    wsRef.current?.close();
    const ws = new WebSocket(url);

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onerror = () => setIsConnected(false);
    ws.onmessage = (event) => {
      messageCallbackRef.current?.(event.data as string);
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

  return { isConnected, connect, disconnect, sendJson, onMessage };
}
