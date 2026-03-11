import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  fetchCharacteristics,
  resetWriteQueue,
  searchDevice as searchBtDevice,
  sendJsonData,
} from '@/logics/bluetooth';
import { ReconnectBanner } from '@/components/ReconnectBanner';

type Court = 'blue' | 'red';
type MessageCallback = (message: string) => void;

interface AppContextValue {
  bluetoothDevice: BluetoothDevice | undefined;
  isDeviceConnected: boolean;
  isReconnecting: boolean;
  bluetoothTxCharacteristic: BluetoothRemoteGATTCharacteristic | undefined;
  bluetoothRxCharacteristic: BluetoothRemoteGATTCharacteristic | undefined;
  canReconnect: boolean;
  court: Court;
  onMessage: (callback: MessageCallback) => void;
  searchDevice: () => Promise<void>;
  reconnect: () => Promise<void>;
  disconnect: () => void;
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

const AUTO_RECONNECT_MAX_ATTEMPTS = 5;
const AUTO_RECONNECT_BASE_DELAY_MS = 500;
const CONNECTION_TIMEOUT_MS = 10_000;
// BLE通知が途絶えた場合に切断と判定するまでの時間
const WATCHDOG_TIMEOUT_MS = 3_000;

function loadCourt(): Court {
  const stored = localStorage.getItem('drc_court');
  return stored === 'red' ? 'red' : 'blue';
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Connection timeout')), ms);
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
  const [bluetoothDevice, setBluetoothDevice] = useState<BluetoothDevice>();
  const [isDeviceConnected, setIsDeviceConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [bluetoothTxCharacteristic, setBluetoothTxCharacteristic] =
    useState<BluetoothRemoteGATTCharacteristic>();
  const [bluetoothRxCharacteristic, setBluetoothRxCharacteristic] =
    useState<BluetoothRemoteGATTCharacteristic>();
  const [court, setCourtState] = useState<Court>(loadCourt);

  const deviceRef = useRef<BluetoothDevice | undefined>(undefined);
  const messageCallbackRef = useRef<MessageCallback | null>(null);
  const courtRef = useRef(court);
  const watchdogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoReconnectAbortRef = useRef(false);
  const isDisconnectingRef = useRef(false);

  useEffect(() => {
    courtRef.current = court;
  }, [court]);

  const onMessage = useCallback((callback: MessageCallback) => {
    messageCallbackRef.current = callback;
  }, []);

  const setCourt = useCallback((c: Court) => {
    setCourtState(c);
    localStorage.setItem('drc_court', c);
  }, []);

  const canReconnect =
    !!bluetoothDevice && !isDeviceConnected && !isReconnecting;

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
      console.warn('[BLE] Watchdog timeout — no notifications for 3s');
      deviceRef.current?.gatt?.disconnect();
    }, WATCHDOG_TIMEOUT_MS);
  }, [clearWatchdog]);

  const setupConnection = useCallback(
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

        rxChar.addEventListener(
          'characteristicvaluechanged',
          (event) => {
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
                  messageCallbackRef.current?.(
                    rxBuffer.slice(objectStart, i + 1),
                  );
                  consumed = i + 1;
                  objectStart = -1;
                }
              }
            }
            rxBuffer = rxBuffer.slice(consumed);

            if (rxBuffer.length > 8192) {
              rxBuffer = '';
            }
          },
        );
        await rxChar.startNotifications();
        resetWatchdog();
      }

      setIsDeviceConnected(true);

      if (txChar) {
        sendJsonData(
          { type: 'set_court', court: courtRef.current },
          txChar,
        );
      }
    },
    [resetWatchdog],
  );

  const attemptAutoReconnect = useCallback(
    async (device: BluetoothDevice) => {
      autoReconnectAbortRef.current = false;
      setIsReconnecting(true);

      for (let attempt = 0; attempt < AUTO_RECONNECT_MAX_ATTEMPTS; attempt++) {
        if (autoReconnectAbortRef.current) {
          console.log('[BLE] Auto-reconnect aborted');
          break;
        }

        const delay = AUTO_RECONNECT_BASE_DELAY_MS * 2 ** attempt;
        console.log(
          `[BLE] Auto-reconnect attempt ${attempt + 1}/${AUTO_RECONNECT_MAX_ATTEMPTS} in ${delay}ms`,
        );
        await new Promise((r) => setTimeout(r, delay));

        if (autoReconnectAbortRef.current) break;

        try {
          await setupConnection(device);
          console.log('[BLE] Auto-reconnect succeeded');
          setIsReconnecting(false);
          return;
        } catch (e) {
          console.warn(`[BLE] Auto-reconnect attempt ${attempt + 1} failed:`, e);
        }
      }

      setIsReconnecting(false);
      console.error('[BLE] Auto-reconnect exhausted all attempts');
    },
    [setupConnection],
  );

  const installDisconnectHandler = useCallback(
    (device: BluetoothDevice) => {
      device.addEventListener('gattserverdisconnected', () => {
        clearWatchdog();
        setIsDeviceConnected(false);
        clearCharacteristics();

        if (!isDisconnectingRef.current && deviceRef.current) {
          attemptAutoReconnect(device);
        }
      });
    },
    [clearCharacteristics, clearWatchdog, attemptAutoReconnect],
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
      await setupConnection(device);
    } catch (e) {
      console.error('Bluetooth connection failed:', e);
      setIsDeviceConnected(false);
      clearCharacteristics();
      device.gatt?.disconnect();
    }
  }, [setupConnection, installDisconnectHandler, clearCharacteristics]);

  const reconnect = useCallback(async () => {
    const device = deviceRef.current;
    if (!device) return;

    autoReconnectAbortRef.current = true;
    setIsReconnecting(false);

    try {
      await setupConnection(device);
    } catch (e) {
      console.error('Bluetooth reconnection failed:', e);
      setIsDeviceConnected(false);
      clearCharacteristics();
    }
  }, [setupConnection, clearCharacteristics]);

  const disconnect = useCallback(() => {
    isDisconnectingRef.current = true;
    autoReconnectAbortRef.current = true;
    clearWatchdog();
    deviceRef.current?.gatt?.disconnect();
    deviceRef.current = undefined;
    setBluetoothDevice(undefined);
    setIsDeviceConnected(false);
    setIsReconnecting(false);
    clearCharacteristics();
    isDisconnectingRef.current = false;
  }, [clearCharacteristics, clearWatchdog]);

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

  const value: AppContextValue = {
    bluetoothDevice,
    isDeviceConnected,
    isReconnecting,
    bluetoothTxCharacteristic,
    bluetoothRxCharacteristic,
    canReconnect,
    court,
    onMessage,
    searchDevice,
    reconnect,
    disconnect,
    setCourt,
  };

  return (
    <AppContext.Provider value={value}>
      <ReconnectBanner />
      {children}
    </AppContext.Provider>
  );
}
