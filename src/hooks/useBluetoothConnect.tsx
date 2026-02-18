import { useCallback, useRef, useState } from 'react';
import {
  fetchRxCharacteristic,
  fetchTxCharacteristic,
  searchDevice as searchBtDevice,
} from '@/logics/bluetooth';

type MessageCallback = (message: string) => void;

// === BLE DEBUG ===
const bleDebug = {
  eventCount: 0,
  lastEventTime: 0,
  maxEventInterval: 0,
  totalBytes: 0,
  lastLogTime: performance.now(),
};

export function useBluetoothConnect() {
  const [bluetoothDevice, setBluetoothDevice] = useState<BluetoothDevice>();
  const [isDeviceConnected, setIsDeviceConnected] = useState(false);
  const [bluetoothTxCharacteristic, setBluetoothTxCharacteristic] =
    useState<BluetoothRemoteGATTCharacteristic>();
  const [bluetoothRxCharacteristic, setBluetoothRxCharacteristic] =
    useState<BluetoothRemoteGATTCharacteristic>();

  const messageCallbackRef = useRef<MessageCallback | null>(null);

  const onMessage = useCallback((callback: MessageCallback) => {
    messageCallbackRef.current = callback;
  }, []);

  function disconnect() {
    if (!confirm('Are you sure you want to disconnect?')) return;

    bluetoothDevice?.gatt?.disconnect();
  }

  async function searchDevice() {
    if (!navigator.bluetooth) {
      alert('Your browser does not support the Web Bluetooth API.');
      return;
    }

    const device = await searchBtDevice().catch((e) => {
      console.error(e);
      bluetoothDevice?.gatt?.disconnect();
      return undefined;
    });
    if (device === undefined) return;

    setIsDeviceConnected(true);
    device.addEventListener('gattserverdisconnected', () => {
      setIsDeviceConnected(false);
      setBluetoothTxCharacteristic(undefined);
      setBluetoothRxCharacteristic(undefined);
    });
    setBluetoothDevice(device);

    const server = await device.gatt?.connect();
    if (server === undefined) return;

    const txCharacteristic = await fetchTxCharacteristic(server);
    setBluetoothTxCharacteristic(txCharacteristic);

    const rxCharacteristic = await fetchRxCharacteristic(server);
    setBluetoothRxCharacteristic(rxCharacteristic);

    if (rxCharacteristic) {
      rxCharacteristic.addEventListener(
        'characteristicvaluechanged',
        (event) => {
          const now = performance.now();
          const value = (event.target as BluetoothRemoteGATTCharacteristic)
            .value;
          const byteLen = value?.byteLength ?? 0;

          // === BLE DEBUG ===
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

          const decoder = new TextDecoder('utf-8');
          const message = decoder.decode(value);
          messageCallbackRef.current?.(message);
        },
      );
      await rxCharacteristic.startNotifications();
    }
  }

  return {
    bluetoothDevice,
    isDeviceConnected,
    bluetoothTxCharacteristic,
    bluetoothRxCharacteristic,
    onMessage,
    searchDevice,
    disconnect,
  };
}
