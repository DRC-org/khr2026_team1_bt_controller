import { BluetoothConnected, BluetoothOff, ChevronLeft, Maximize, Minimize, Play, Square, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import FieldSvg from '@/assets/khr2026_field.svg';
import KumaSvg from '@/assets/kuma.svg';
import { Button } from '@/components/ui/button';
import { useBluetoothConnect } from '@/hooks/useBluetoothConnect';
import { useWebSocketConnect } from '@/hooks/useWebSocketConnect';
import { sendJsonData } from '@/logics/bluetooth';
import { CourtSelector } from './CourtSelector';
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

type ConnectionMode = 'ble' | 'ws';

export default function AutoNav() {
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('ble');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  }
  const [wsUrl, setWsUrl] = useState(
    // HTTPS 環境では Vite proxy 経由の wss:// を使用（Mixed Content 回避）
    `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`,
  );

  const bt = useBluetoothConnect();
  const ws = useWebSocketConnect();

  // BLE 用の sendJson アダプター
  const btSendJson = (data: unknown) => {
    if (bt.bluetoothTxCharacteristic)
      sendJsonData(data as object, bt.bluetoothTxCharacteristic);
  };

  const sendJson = connectionMode === 'ws' ? ws.sendJson : btSendJson;
  const isConnected = connectionMode === 'ws' ? ws.isConnected : bt.isDeviceConnected;
  const onMessage = connectionMode === 'ws' ? ws.onMessage : bt.onMessage;

  const {
    navStatus,
    currentWaypoint,
    court,
    progress,
    log,
    robotPosX,
    robotPosY,
    robotAngle,
    sendNavMode,
    sendNavGoal,
    sendSetCourt,
    sendStartAuto,
    sendStopAuto,
  } = useAutoNav(onMessage, isConnected, sendJson);

  const isAuto = navStatus !== 'MANUAL';
  const isNavigating = navStatus === 'NAVIGATING';

  function handleConnect() {
    if (connectionMode === 'ws') {
      if (ws.isConnected) ws.disconnect();
      else ws.connect(wsUrl);
    } else {
      if (bt.isDeviceConnected) bt.disconnect();
      else bt.searchDevice();
    }
  }

  return (
    <div className="flex h-svh overflow-hidden">

      {/* 左側: フィールドマップ */}
      <div className="flex flex-1 items-center justify-center bg-white">
        <div className="relative">
          <img src={FieldSvg} alt="Field" className="h-[80svh] w-auto" />
          <img
            src={KumaSvg}
            alt="RoboKuma"
            className="translate-1/2 absolute size-[6svh]"
            style={{
              bottom: `calc(${robotPosY} / 7000 * 80svh)`,
              right: `calc(${robotPosX} / 3500 * 40svh)`,
              transform: `rotate(${robotAngle}deg)`,
            }}
          />
        </div>
      </div>

      {/* 右側: コントロールパネル */}
      <div className="w-80 overflow-y-auto border-l p-4">

        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" asChild>
            <a href="#/">
              <ChevronLeft />
            </a>
          </Button>

          {/* Connection mode tabs */}
          <div className="flex rounded-md border">
            <button
              type="button"
              className={`px-3 py-1 text-sm rounded-l-md ${connectionMode === 'ble' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              onClick={() => setConnectionMode('ble')}
            >
              BLE
            </button>
            <button
              type="button"
              className={`px-3 py-1 text-sm rounded-r-md ${connectionMode === 'ws' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              onClick={() => setConnectionMode('ws')}
            >
              WebSocket
            </button>
          </div>

          <Button variant="ghost" size="icon-sm" onClick={toggleFullscreen} className="ml-auto">
            {isFullscreen ? <Minimize /> : <Maximize />}
          </Button>
        </div>

        {/* Connection panel */}
        <div className="mb-4 rounded-lg border p-4">
          <h2 className="mb-3 font-bold text-sm text-muted-foreground">接続</h2>

          {connectionMode === 'ws' && (
            <input
              type="text"
              value={wsUrl}
              onChange={(e) => setWsUrl(e.target.value)}
              placeholder="ws://192.168.1.101:8080/ws"
              className="mb-2 w-full rounded border px-3 py-1.5 font-mono text-sm"
            />
          )}

          <Button
            variant="secondary"
            className="font-normal"
            onClick={handleConnect}
          >
            {connectionMode === 'ws' ? (
              ws.isConnected ? (
                <Wifi className="text-green-600" />
              ) : (
                <WifiOff className="size-5 text-destructive" />
              )
            ) : bt.isDeviceConnected ? (
              <BluetoothConnected className="text-green-600" />
            ) : (
              <BluetoothOff className="size-5 text-destructive" />
            )}
            <p className="-mr-1 font-bold">
              {isConnected ? 'Connected' : 'Disconnected'}
            </p>
            {connectionMode === 'ble' && (
              <p>
                (
                {bt.bluetoothDevice
                  ? bt.bluetoothDevice.name || bt.bluetoothDevice.id
                  : 'N/A'}
                )
              </p>
            )}
          </Button>
        </div>

        {/* Court selector */}
        <CourtSelector court={court} onSelect={sendSetCourt} disabled={!isConnected} />

        {/* Mode */}
        <section className="mb-4 rounded-lg border p-4">
          <h2 className="mb-3 font-bold text-sm text-muted-foreground">モード</h2>
          <div className="flex gap-2">
            <Button
              variant={isAuto ? 'outline' : 'default'}
              onClick={() => sendNavMode('manual')}
              disabled={!isConnected}
            >
              Manual
            </Button>
            <Button
              variant={isAuto ? 'default' : 'outline'}
              onClick={() => sendNavMode('auto')}
              disabled={!isConnected}
            >
              Auto
            </Button>
          </div>
        </section>

        {/* Auto sequence controls */}
        <section className="mb-4 rounded-lg border p-4">
          <h2 className="mb-3 font-bold text-sm text-muted-foreground">自動シーケンス</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              onClick={sendStartAuto}
              disabled={!isAuto || isNavigating}
            >
              <Play className="size-4" />
              自動開始
            </Button>
            <Button
              variant="destructive"
              onClick={sendStopAuto}
              disabled={!isConnected || !isAuto}
            >
              <Square className="size-4" />
              停止
            </Button>
            {progress && (
              <span className="text-sm text-muted-foreground">進捗: {progress}</span>
            )}
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
    </div>
  );
}
