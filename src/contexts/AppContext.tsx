import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { HealthBar } from '@/components/HealthBar';
import { ReconnectBanner } from '@/components/ReconnectBanner';
import {
  fetchCharacteristics,
  resetWriteQueue,
  searchDevice as searchBtDevice,
  sendJsonData,
} from '@/logics/bluetooth';

export type ConnectionMode = 'ble' | 'ws';
type Court = 'blue' | 'red';
type MessageCallback = (message: string) => void;
type UnsubscribeFn = () => void;

interface AppContextValue {
  connectionMode: ConnectionMode;
  setConnectionMode: (mode: ConnectionMode) => void;

  // 統一インターフェース
  isConnected: boolean;
  isReconnecting: boolean;
  sendJson: (data: unknown) => void;
  connect: () => void;
  disconnect: () => void;
  addMessageListener: (callback: MessageCallback) => UnsubscribeFn;

  // BLE 固有（Controller のジョイスティック等で必要）
  bluetoothDevice: BluetoothDevice | undefined;
  isDeviceConnected: boolean;
  bluetoothTxCharacteristic: BluetoothRemoteGATTCharacteristic | undefined;
  canReconnect: boolean;
  searchDevice: () => Promise<void>;
  reconnect: () => Promise<void>;

  // WS 固有
  isWsConnected: boolean;
  wsUrl: string;
  setWsUrl: (url: string) => void;

  // 共通
  court: Court;
  setCourt: (court: Court) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

const bleDebug = {
  eventCount: 0,
  lastEventTime: 0,
  maxEventInterval: 0,
  totalBytes: 0,
  lastLogTime: performance.now(),
};

const AUTO_RECONNECT_MAX_ATTEMPTS = 10;
const AUTO_RECONNECT_BASE_DELAY_MS = 300;
const AUTO_RECONNECT_MAX_DELAY_MS = 5_000;
const CONNECTION_TIMEOUT_MS = 10_000;
const WATCHDOG_TIMEOUT_MS = 6_000;

function loadCourt(): Court {
  const stored = localStorage.getItem('drc_court');
  return stored === 'red' ? 'red' : 'blue';
}

function loadConnectionMode(): ConnectionMode {
  const stored = localStorage.getItem('drc_connection_mode');
  return stored === 'ws' ? 'ws' : 'ble';
}

function loadWsUrl(): string {
  const stored = localStorage.getItem('drc_ws_url');
  if (stored) return stored;
  const isGitHubPages = window.location.hostname.endsWith('.github.io');
  if (isGitHubPages) return 'ws://192.168.1.101:8080/ws';
  const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${scheme}://${window.location.host}/ws`;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Connection timeout')),
      ms,
    );
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

export function AppProvider({ children }: { children: ReactNode }) {
  // --- 共通 ---
  const [connectionMode, setConnectionModeState] =
    useState<ConnectionMode>(loadConnectionMode);
  const [court, setCourtState] = useState<Court>(loadCourt);
  const messageCallbackRef = useRef<MessageCallback | null>(null);
  const messageListenersRef = useRef<Set<MessageCallback>>(new Set());
  const courtRef = useRef(court);

  useEffect(() => {
    courtRef.current = court;
  }, [court]);

  const setConnectionMode = useCallback((mode: ConnectionMode) => {
    setConnectionModeState(mode);
    localStorage.setItem('drc_connection_mode', mode);
  }, []);

  const setCourt = useCallback((c: Court) => {
    setCourtState(c);
    localStorage.setItem('drc_court', c);
  }, []);

  const addMessageListener = useCallback(
    (callback: MessageCallback): UnsubscribeFn => {
      messageListenersRef.current.add(callback);
      return () => {
        messageListenersRef.current.delete(callback);
      };
    },
    [],
  );

  const dispatchMessage = useCallback((msg: string) => {
    messageCallbackRef.current?.(msg);
    for (const listener of messageListenersRef.current) {
      listener(msg);
    }
  }, []);

  // --- BLE ---
  const [bluetoothDevice, setBluetoothDevice] = useState<BluetoothDevice>();
  const [isDeviceConnected, setIsDeviceConnected] = useState(false);
  const [isBleReconnecting, setIsBleReconnecting] = useState(false);
  const [bluetoothTxCharacteristic, setBluetoothTxCharacteristic] =
    useState<BluetoothRemoteGATTCharacteristic>();
  const [, setBluetoothRxCharacteristic] =
    useState<BluetoothRemoteGATTCharacteristic>();

  const deviceRef = useRef<BluetoothDevice | undefined>(undefined);
  const watchdogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bleAutoReconnectAbortRef = useRef(false);
  const isBleDisconnectingRef = useRef(false);

  const canReconnect =
    !!bluetoothDevice && !isDeviceConnected && !isBleReconnecting;

  const clearCharacteristics = useCallback(() => {
    setBluetoothTxCharacteristic(undefined);
    setBluetoothRxCharacteristic(undefined);
  }, []);

  const clearWatchdog = useCallback(() => {
    if (watchdogTimerRef.current !== null) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
  }, []);

  const resetWatchdog = useCallback(() => {
    clearWatchdog();
    watchdogTimerRef.current = setTimeout(() => {
      console.warn('[BLE] Watchdog timeout — no notifications');
      deviceRef.current?.gatt?.disconnect();
    }, WATCHDOG_TIMEOUT_MS);
  }, [clearWatchdog]);

  const setupBleConnection = useCallback(
    async (device: BluetoothDevice) => {
      resetWriteQueue();
      if (!device.gatt) throw new Error('GATT not available');
      const server = await withTimeout(
        device.gatt.connect(),
        CONNECTION_TIMEOUT_MS,
      );

      const { txChar, rxChar } = await fetchCharacteristics(server);
      setBluetoothTxCharacteristic(txChar);
      setBluetoothRxCharacteristic(rxChar);

      if (rxChar) {
        let rxBuffer = '';
        rxChar.addEventListener('characteristicvaluechanged', (event) => {
          resetWatchdog();
          const now = performance.now();
          const value = (event.target as BluetoothRemoteGATTCharacteristic)
            .value;
          const byteLen = value?.byteLength ?? 0;

          if (bleDebug.lastEventTime > 0) {
            const interval = now - bleDebug.lastEventTime;
            if (interval > bleDebug.maxEventInterval)
              bleDebug.maxEventInterval = interval;
          }
          bleDebug.lastEventTime = now;
          bleDebug.eventCount++;
          bleDebug.totalBytes += byteLen;

          if (now - bleDebug.lastLogTime > 3000) {
            console.log(
              `[BLE DEBUG] ${bleDebug.eventCount} events in 3s (${(bleDebug.eventCount / 3).toFixed(1)}/s) | ` +
                `maxInterval: ${bleDebug.maxEventInterval.toFixed(0)}ms | ` +
                `avgSize: ${bleDebug.eventCount > 0 ? (bleDebug.totalBytes / bleDebug.eventCount).toFixed(0) : 0}B`,
            );
            bleDebug.eventCount = 0;
            bleDebug.maxEventInterval = 0;
            bleDebug.totalBytes = 0;
            bleDebug.lastLogTime = now;
          }

          rxBuffer += new TextDecoder('utf-8').decode(value);
          let depth = 0;
          let objectStart = -1;
          let consumed = 0;
          for (let i = 0; i < rxBuffer.length; i++) {
            const ch = rxBuffer[i];
            if (ch === '{') {
              if (depth === 0) objectStart = i;
              depth++;
            } else if (ch === '}') {
              depth--;
              if (depth === 0 && objectStart >= 0) {
                const jsonStr = rxBuffer.slice(objectStart, i + 1);
                dispatchMessage(jsonStr);
                consumed = i + 1;
                objectStart = -1;
              }
            }
          }
          rxBuffer = rxBuffer.slice(consumed);
          if (rxBuffer.length > 8192) rxBuffer = '';
        });
        await rxChar.startNotifications();
        resetWatchdog();
      }

      setIsDeviceConnected(true);
      if (txChar) {
        sendJsonData({ type: 'set_court', court: courtRef.current }, txChar);
      }
    },
    [resetWatchdog, dispatchMessage],
  );

  const attemptBleAutoReconnect = useCallback(
    async (device: BluetoothDevice) => {
      bleAutoReconnectAbortRef.current = false;
      setIsBleReconnecting(true);

      for (
        let attempt = 0;
        attempt < AUTO_RECONNECT_MAX_ATTEMPTS;
        attempt++
      ) {
        if (bleAutoReconnectAbortRef.current) {
          console.log('[BLE] Auto-reconnect aborted');
          break;
        }
        const delay = Math.min(
          AUTO_RECONNECT_BASE_DELAY_MS * 2 ** attempt,
          AUTO_RECONNECT_MAX_DELAY_MS,
        );
        console.log(
          `[BLE] Auto-reconnect attempt ${attempt + 1}/${AUTO_RECONNECT_MAX_ATTEMPTS} in ${delay}ms`,
        );
        await new Promise((r) => setTimeout(r, delay));
        if (bleAutoReconnectAbortRef.current) break;

        try {
          await setupBleConnection(device);
          console.log('[BLE] Auto-reconnect succeeded');
          setIsBleReconnecting(false);
          return;
        } catch (e) {
          console.warn(
            `[BLE] Auto-reconnect attempt ${attempt + 1} failed:`,
            e,
          );
        }
      }
      setIsBleReconnecting(false);
      console.error('[BLE] Auto-reconnect exhausted all attempts');
    },
    [setupBleConnection],
  );

  const installDisconnectHandler = useCallback(
    (device: BluetoothDevice) => {
      device.addEventListener('gattserverdisconnected', () => {
        clearWatchdog();
        setIsDeviceConnected(false);
        clearCharacteristics();
        if (!isBleDisconnectingRef.current && deviceRef.current) {
          attemptBleAutoReconnect(device);
        }
      });
    },
    [clearCharacteristics, clearWatchdog, attemptBleAutoReconnect],
  );

  const searchDevice = useCallback(async () => {
    if (!navigator.bluetooth) {
      alert('Your browser does not support the Web Bluetooth API.');
      return;
    }
    const device = await searchBtDevice().catch((e: Error) => {
      if (e.name !== 'NotFoundError') {
        console.error(e);
        deviceRef.current?.gatt?.disconnect();
      }
      return undefined;
    });
    if (!device) return;

    deviceRef.current = device;
    setBluetoothDevice(device);
    installDisconnectHandler(device);

    try {
      await setupBleConnection(device);
    } catch (e) {
      console.error('Bluetooth connection failed:', e);
      setIsDeviceConnected(false);
      clearCharacteristics();
      device.gatt?.disconnect();
    }
  }, [setupBleConnection, installDisconnectHandler, clearCharacteristics]);

  const bleReconnect = useCallback(async () => {
    const device = deviceRef.current;
    if (!device) return;
    bleAutoReconnectAbortRef.current = true;
    setIsBleReconnecting(false);
    try {
      await setupBleConnection(device);
    } catch (e) {
      console.error('Bluetooth reconnection failed:', e);
      setIsDeviceConnected(false);
      clearCharacteristics();
    }
  }, [setupBleConnection, clearCharacteristics]);

  const bleDisconnect = useCallback(() => {
    isBleDisconnectingRef.current = true;
    bleAutoReconnectAbortRef.current = true;
    clearWatchdog();
    deviceRef.current?.gatt?.disconnect();
    deviceRef.current = undefined;
    setBluetoothDevice(undefined);
    setIsDeviceConnected(false);
    setIsBleReconnecting(false);
    clearCharacteristics();
    isBleDisconnectingRef.current = false;
  }, [clearCharacteristics, clearWatchdog]);

  // BLE 起動時にペアリング済みデバイスを復元
  useEffect(() => {
    if (!navigator.bluetooth?.getDevices) return;
    navigator.bluetooth
      .getDevices()
      .then((devices) => {
        const hojicha = devices.find((d) => d.name?.startsWith('Hojicha_'));
        if (hojicha) {
          deviceRef.current = hojicha;
          setBluetoothDevice(hojicha);
          installDisconnectHandler(hojicha);
        }
      })
      .catch(() => {});
  }, [installDisconnectHandler]);

  useEffect(() => {
    return () => clearWatchdog();
  }, [clearWatchdog]);

  // --- WebSocket ---
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [isWsReconnecting, setIsWsReconnecting] = useState(false);
  const [wsUrl, setWsUrlState] = useState(loadWsUrl);
  const wsRef = useRef<WebSocket | null>(null);
  const wsAutoReconnectAbortRef = useRef(false);
  const isWsDisconnectingRef = useRef(false);
  const wsUrlRef = useRef(wsUrl);

  useEffect(() => {
    wsUrlRef.current = wsUrl;
  }, [wsUrl]);

  const setWsUrl = useCallback((url: string) => {
    setWsUrlState(url);
    localStorage.setItem('drc_ws_url', url);
  }, []);

  const wsSendJson = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const wsConnectInner = useCallback(
    (url: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        wsRef.current?.close();
        const ws = new WebSocket(url);

        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('WebSocket connection timeout'));
        }, CONNECTION_TIMEOUT_MS);

        ws.onopen = () => {
          clearTimeout(timeout);
          setIsWsConnected(true);
          wsSendJson({ type: 'set_court', court: courtRef.current });
          resolve();
        };
        ws.onclose = () => {
          clearTimeout(timeout);
          setIsWsConnected(false);
          if (!isWsDisconnectingRef.current && wsRef.current === ws) {
            attemptWsAutoReconnect();
          }
        };
        ws.onerror = () => {
          clearTimeout(timeout);
        };
        ws.onmessage = (event) => {
          dispatchMessage(event.data as string);
        };

        wsRef.current = ws;
      });
    },
    [dispatchMessage, wsSendJson],
  );

  const attemptWsAutoReconnect = useCallback(async () => {
    wsAutoReconnectAbortRef.current = false;
    setIsWsReconnecting(true);

    for (let attempt = 0; attempt < AUTO_RECONNECT_MAX_ATTEMPTS; attempt++) {
      if (wsAutoReconnectAbortRef.current) {
        console.log('[WS] Auto-reconnect aborted');
        break;
      }
      const delay = Math.min(
        AUTO_RECONNECT_BASE_DELAY_MS * 2 ** attempt,
        AUTO_RECONNECT_MAX_DELAY_MS,
      );
      console.log(
        `[WS] Auto-reconnect attempt ${attempt + 1}/${AUTO_RECONNECT_MAX_ATTEMPTS} in ${delay}ms`,
      );
      await new Promise((r) => setTimeout(r, delay));
      if (wsAutoReconnectAbortRef.current) break;

      try {
        await wsConnectInner(wsUrlRef.current);
        console.log('[WS] Auto-reconnect succeeded');
        setIsWsReconnecting(false);
        return;
      } catch (e) {
        console.warn(
          `[WS] Auto-reconnect attempt ${attempt + 1} failed:`,
          e,
        );
      }
    }
    setIsWsReconnecting(false);
    console.error('[WS] Auto-reconnect exhausted all attempts');
  }, [wsConnectInner]);

  const wsConnect = useCallback(() => {
    wsAutoReconnectAbortRef.current = true;
    setIsWsReconnecting(false);
    wsConnectInner(wsUrl).catch((e) => {
      console.error('WebSocket connection failed:', e);
    });
  }, [wsUrl, wsConnectInner]);

  const wsDisconnect = useCallback(() => {
    isWsDisconnectingRef.current = true;
    wsAutoReconnectAbortRef.current = true;
    wsRef.current?.close();
    wsRef.current = null;
    setIsWsConnected(false);
    setIsWsReconnecting(false);
    isWsDisconnectingRef.current = false;
  }, []);

  // --- 統一インターフェース ---
  const isConnected =
    connectionMode === 'ws' ? isWsConnected : isDeviceConnected;
  const isReconnecting =
    connectionMode === 'ws' ? isWsReconnecting : isBleReconnecting;

  const sendJson = useCallback(
    (data: unknown) => {
      if (connectionMode === 'ws') {
        wsSendJson(data);
      } else if (bluetoothTxCharacteristic) {
        sendJsonData(data as object, bluetoothTxCharacteristic);
      }
    },
    [connectionMode, bluetoothTxCharacteristic, wsSendJson],
  );

  const connect = useCallback(() => {
    if (connectionMode === 'ws') wsConnect();
    else searchDevice();
  }, [connectionMode, wsConnect, searchDevice]);

  const disconnect = useCallback(() => {
    if (connectionMode === 'ws') wsDisconnect();
    else bleDisconnect();
  }, [connectionMode, wsDisconnect, bleDisconnect]);

  const value: AppContextValue = {
    connectionMode,
    setConnectionMode,
    isConnected,
    isReconnecting,
    sendJson,
    connect,
    disconnect,
    addMessageListener,
    bluetoothDevice,
    isDeviceConnected,
    bluetoothTxCharacteristic,
    canReconnect,
    searchDevice,
    reconnect: bleReconnect,
    isWsConnected,
    wsUrl,
    setWsUrl,
    court,
    setCourt,
  };

  return (
    <AppContext.Provider value={value}>
      <HealthBar />
      <ReconnectBanner />
      {children}
    </AppContext.Provider>
  );
}
