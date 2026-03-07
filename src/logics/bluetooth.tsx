const SERVICE_UUID = '845d1d9a-b986-45b8-8b0e-21ee94307983';
const TX_CHARACTERISTIC_UUID = '47153006-9eef-45e5-afb7-038ea60ad893';
const RX_CHARACTERISTIC_UUID = '3ecd3272-0f80-4518-ad58-78aa9af3ec9d';

// BLE は同一 characteristic への同時 write を禁止しているため直列キューで保護する。
// ジョイスティック送信（100ms 間隔）とボタン送信が同時に走ると
// "GATT operation already in progress" が発生するのを防ぐ。
//
// fire-and-forget: 呼び出し元は await 不要。write は内部で順番に実行される。
// ジョイスティックのように高頻度で呼ばれても、前の write が終わるまで次はキューで待機し
// 同時実行は起きない。write 失敗時はキューを詰まらせないよう catch で握り潰す。
let writeQueue: Promise<void> = Promise.resolve();

export function sendJsonData(
  // biome-ignore lint/complexity/noBannedTypes: Temporary object type
  data: Object,
  txCharacteristic: BluetoothRemoteGATTCharacteristic,
): void {
  writeQueue = writeQueue
    .then(() => {
      const encoder = new TextEncoder();
      const txBuf = encoder.encode(JSON.stringify(data));
      return txCharacteristic.writeValueWithoutResponse(txBuf);
    })
    .catch(() => {
      // 切断・失敗時もキューを詰まらせない
    });
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
