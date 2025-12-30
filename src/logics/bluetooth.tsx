const SERVICE_UUID = '845d1d9a-b986-45b8-8b0e-21ee94307983';
const TX_CHARACTERISTIC_UUID = '47153006-9eef-45e5-afb7-038ea60ad893';
const RX_CHARACTERISTIC_UUID = '3ecd3272-0f80-4518-ad58-78aa9af3ec9d';

export async function sendJsonData(
  data: Object,
  txCharacteristic: BluetoothRemoteGATTCharacteristic,
) {
  const encoder = new TextEncoder();
  const jsonString = JSON.stringify(data);
  const txBuf = encoder.encode(jsonString);
  await txCharacteristic.writeValueWithoutResponse(txBuf);
}

export async function searchDevice() {
  return await navigator.bluetooth.requestDevice({
    filters: [{ namePrefix: 'Hojicha_' }],
    optionalServices: [SERVICE_UUID],
  });
}

export async function fetchTxCharacteristic(server: BluetoothRemoteGATTServer) {
  const service = await server?.getPrimaryService(SERVICE_UUID);
  return await service?.getCharacteristic(TX_CHARACTERISTIC_UUID);
}

export async function fetchRxCharacteristic(server: BluetoothRemoteGATTServer) {
  const service = await server?.getPrimaryService(SERVICE_UUID);
  return await service?.getCharacteristic(RX_CHARACTERISTIC_UUID);
}
