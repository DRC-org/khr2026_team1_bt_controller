import { useCallback, useRef, useState } from 'react';
import {
  fetchRxCharacteristic,
  fetchTxCharacteristic,
  searchDevice as searchBtDevice,
} from '@/logics/bluetooth';

type MessageCallback = (message: string) => void;

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
          const decoder = new TextDecoder('utf-8');
          const message = decoder.decode(
            (event.target as BluetoothRemoteGATTCharacteristic).value,
          );
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
