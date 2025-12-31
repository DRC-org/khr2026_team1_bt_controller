import { useState } from 'react';
import {
  fetchRxCharacteristic,
  fetchTxCharacteristic,
  searchDevice as searchBtDevice,
} from '@/logics/bluetooth';

export function useBluetoothConnect() {
  const [bluetoothDevice, setBluetoothDevice] = useState<BluetoothDevice>();
  const [isDeviceConnected, setIsDeviceConnected] = useState(false);
  const [bluetoothTxCharacteristic, setBluetoothTxCharacteristic] =
    useState<BluetoothRemoteGATTCharacteristic>();
  const [bluetoothRxCharacteristic, setBluetoothRxCharacteristic] =
    useState<BluetoothRemoteGATTCharacteristic>();
  const [receivedMessages, setReceivedMessages] = useState<string[]>([]);

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
      setReceivedMessages([]);
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
          setReceivedMessages((prev) => [...prev, message]);

          // Keep only the latest 100 messages
          if (receivedMessages.length > 100) {
            setReceivedMessages((prev) => prev.slice(-100));
          }
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
    receivedMessages,
    searchDevice,
    disconnect,
  };
}
