import { BluetoothConnected, BluetoothOff, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBluetoothConnect } from '@/hooks/useBluetoothConnect';
import { useAutoNav } from './useAutoNav';

const WAYPOINTS = [
  'waypoint_1',
  'waypoint_2',
  'waypoint_3',
  'waypoint_4',
  'waypoint_5',
];

const STATUS_STYLES: Record<string, string> = {
  MANUAL: 'bg-gray-200 text-gray-700',
  AUTO_IDLE: 'bg-blue-200 text-blue-800',
  NAVIGATING: 'bg-yellow-200 text-yellow-800',
  ARRIVED: 'bg-green-200 text-green-800',
  ERROR: 'bg-red-200 text-red-800',
  CANCELLED: 'bg-orange-200 text-orange-800',
};

export default function AutoNav() {
  const {
    bluetoothDevice,
    isDeviceConnected,
    bluetoothTxCharacteristic,
    onMessage,
    searchDevice,
    disconnect,
  } = useBluetoothConnect();

  const { navStatus, currentWaypoint, log, sendNavMode, sendNavGoal } =
    useAutoNav(onMessage, isDeviceConnected, bluetoothTxCharacteristic);

  const isAuto = navStatus !== 'MANUAL';
  const isNavigating = navStatus === 'NAVIGATING';

  return (
    <div className="mx-auto max-w-xl p-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <a href="#/">
            <ChevronLeft />
          </a>
        </Button>
        <Button
          variant="secondary"
          className="font-normal"
          onClick={isDeviceConnected ? disconnect : searchDevice}
        >
          {isDeviceConnected ? (
            <BluetoothConnected className="text-green-600" />
          ) : (
            <BluetoothOff className="size-5 text-destructive" />
          )}
          <p className="-mr-1 font-bold">
            {isDeviceConnected ? 'Connected' : 'Disconnected'}
          </p>
          <p>
            (
            {bluetoothDevice
              ? bluetoothDevice.name || bluetoothDevice.id
              : 'N/A'}
            )
          </p>
        </Button>
      </div>

      {/* Mode */}
      <section className="mb-4 rounded-lg border p-4">
        <h2 className="mb-3 font-bold text-sm text-muted-foreground">モード</h2>
        <div className="flex gap-2">
          <Button
            variant={isAuto ? 'outline' : 'default'}
            onClick={() => sendNavMode('manual')}
            disabled={!isDeviceConnected}
          >
            Manual
          </Button>
          <Button
            variant={isAuto ? 'default' : 'outline'}
            onClick={() => sendNavMode('auto')}
            disabled={!isDeviceConnected}
          >
            Auto
          </Button>
        </div>
      </section>

      {/* Waypoints */}
      <section className="mb-4 rounded-lg border p-4">
        <h2 className="mb-3 font-bold text-sm text-muted-foreground">
          ウェイポイント
        </h2>
        <div className="flex flex-wrap gap-2">
          {WAYPOINTS.map((wp) => (
            <Button
              key={wp}
              variant={currentWaypoint === wp ? 'default' : 'outline'}
              onClick={() => sendNavGoal(wp)}
              disabled={!isAuto || isNavigating}
            >
              {wp}
            </Button>
          ))}
        </div>
        {isNavigating && (
          <div className="mt-3">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => sendNavMode('manual')}
            >
              キャンセル
            </Button>
          </div>
        )}
      </section>

      {/* Status */}
      <section className="mb-4 rounded-lg border p-4">
        <h2 className="mb-3 font-bold text-sm text-muted-foreground">
          ステータス
        </h2>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 font-bold text-sm ${STATUS_STYLES[navStatus] ?? ''}`}
          >
            {navStatus}
          </span>
          {currentWaypoint && (
            <span className="text-sm text-muted-foreground">
              → {currentWaypoint}
            </span>
          )}
        </div>
      </section>

      {/* Log */}
      <section className="rounded-lg border p-4">
        <h2 className="mb-3 font-bold text-sm text-muted-foreground">
          ログ（最新 20 件）
        </h2>
        {log.length === 0 ? (
          <p className="text-muted-foreground text-sm">なし</p>
        ) : (
          <ul className="space-y-1">
            {log.map((entry, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: log entries are prepended in order
              <li key={i} className="flex gap-3 font-mono text-sm">
                <span className="text-muted-foreground">{entry.time}</span>
                <span>{entry.text}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
