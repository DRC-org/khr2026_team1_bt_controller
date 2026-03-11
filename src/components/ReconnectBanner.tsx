import { BluetoothSearching, Loader2, X } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';

export function ReconnectBanner() {
  const {
    canReconnect,
    isReconnecting,
    bluetoothDevice,
    reconnect,
    disconnect,
  } = useAppContext();

  if (!canReconnect && !isReconnecting) return null;

  const deviceName = bluetoothDevice?.name || bluetoothDevice?.id || '不明';

  if (isReconnecting) {
    return (
      <div className="fixed inset-x-0 top-0 z-50 flex items-center gap-3 border-blue-300 border-b bg-blue-100 px-4 py-2">
        <Loader2 className="size-5 animate-spin text-blue-700" />
        <span className="flex-1 font-medium text-blue-900 text-sm">
          再接続中... ({deviceName})
        </span>
        <button
          type="button"
          onClick={disconnect}
          className="rounded p-1 text-blue-700 hover:bg-blue-200"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex items-center gap-3 border-amber-300 border-b bg-amber-100 px-4 py-2">
      <BluetoothSearching className="size-5 text-amber-700" />
      <span className="flex-1 font-medium text-amber-900 text-sm">
        BLE 切断 ({deviceName})
      </span>
      <Button size="sm" variant="default" onClick={reconnect}>
        再接続
      </Button>
      <button
        type="button"
        onClick={disconnect}
        className="rounded p-1 text-amber-700 hover:bg-amber-200"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
