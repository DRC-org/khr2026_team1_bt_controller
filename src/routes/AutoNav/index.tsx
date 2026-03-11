import {
  BluetoothConnected,
  BluetoothOff,
  ChevronLeft,
  Maximize,
  Minimize,
  Play,
  RotateCcw,
  Square,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import FieldSvg from '@/assets/khr2026_field.svg';
import KumaSvg from '@/assets/kuma.svg';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';
import { useWebSocketConnect } from '@/hooks/useWebSocketConnect';
import { sendJsonData } from '@/logics/bluetooth';
import { CourtSelector } from '@/routes/AutoNav/CourtSelector';
import { useAutoNav } from './useAutoNav';

const WAYPOINTS = [
  'yagura_pickup_1',
  'ring_pickup_1',
  'yagura_release_1',
  'yagura_release_2',
  'ring_pickup_2',
  'yagura_pickup_2',
  'yagura_release_3',
  'honmaru',
];

const ALL_WAYPOINTS = [...WAYPOINTS, 'home'];

const STATUS_STYLES: Record<string, string> = {
  MANUAL: 'bg-gray-200 text-gray-700',
  AUTO_IDLE: 'bg-blue-200 text-blue-800',
  NAVIGATING: 'bg-yellow-200 text-yellow-800',
  ARRIVED: 'bg-green-200 text-green-800',
  ERROR: 'bg-red-200 text-red-800',
  CANCELLED: 'bg-orange-200 text-orange-800',
  RELOCATING: 'bg-purple-200 text-purple-800',
};

type ConnectionMode = 'ble' | 'ws';

export default function AutoNav() {
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('ble');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [flashVisible, setFlashVisible] = useState(false);

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

  const bt = useAppContext();
  const ws = useWebSocketConnect();

  // BLE 用の sendJson アダプター
  const btSendJson = (data: unknown) => {
    if (bt.bluetoothTxCharacteristic)
      sendJsonData(data as object, bt.bluetoothTxCharacteristic);
  };

  const sendJson = connectionMode === 'ws' ? ws.sendJson : btSendJson;
  const isConnected =
    connectionMode === 'ws' ? ws.isConnected : bt.isDeviceConnected;
  const onMessage = connectionMode === 'ws' ? ws.onMessage : bt.onMessage;

  const {
    navStatus,
    currentWaypoint,
    progress,
    log,
    robotPosX,
    robotPosY,
    robotAngle,
    isAlertFlashing,
    failedSeqIndex,
    relocatingCountdown,
    sendNavMode,
    sendNavGoal,
    sendSetCourt,
    sendStartAutoFrom,
    sendStopAuto,
  } = useAutoNav(onMessage, isConnected, sendJson, bt.setCourt);

  // ページ表示時に auto モードへ切り替え
  const sentAutoRef = useRef(false);
  useEffect(() => {
    if (isConnected && !sentAutoRef.current) {
      sendNavMode('auto');
      sentAutoRef.current = true;
    }
    if (!isConnected) sentAutoRef.current = false;
  }, [isConnected, sendNavMode]);

  // エラー時の赤白交互点滅（500ms 間隔）
  useEffect(() => {
    if (!isAlertFlashing) {
      setFlashVisible(false);
      return;
    }
    const interval = setInterval(() => setFlashVisible((v) => !v), 500);
    return () => clearInterval(interval);
  }, [isAlertFlashing]);

  const isAuto = navStatus !== 'MANUAL';
  const isNavigating = navStatus === 'NAVIGATING';
  const isRelocating = navStatus === 'RELOCATING';
  const isBusy = isNavigating || isRelocating;

  function handleConnect() {
    if (connectionMode === 'ws') {
      if (ws.isConnected) ws.disconnect();
      else ws.connect(wsUrl);
    } else {
      if (bt.isDeviceConnected) bt.disconnect();
      else bt.searchDevice();
    }
  }

  function handleStartAutoFrom(index: number) {
    if (index > 0) {
      const wpName = WAYPOINTS[index];
      const ok = window.confirm(
        `ロボットを ${wpName} の位置に置きましたか？\n\n確認後、3秒のカウントダウンでナビゲーションを開始します。`,
      );
      if (!ok) return;
    }
    sendStartAutoFrom(index);
  }

  return (
    <div className="flex h-svh overflow-hidden">
      {/* 赤白交互点滅オーバーレイ（エラー発生時） */}
      {isAlertFlashing && (
        <div
          className="pointer-events-none fixed inset-0 z-40"
          style={{
            backgroundColor: flashVisible
              ? 'rgba(239, 68, 68, 0.45)'
              : 'rgba(255, 255, 255, 0.55)',
            transition: 'background-color 80ms',
          }}
        />
      )}

      {/* 左側: フィールドマップ */}
      <div className="flex w-[60svh] flex-1 items-center justify-center bg-white">
        <div className="relative">
          <img src={FieldSvg} alt="Field" className="h-[80svh] w-[40svh]" />
          <img
            src={KumaSvg}
            alt="RoboKuma"
            className="translate-1/2 absolute size-[6svh]"
            style={{
              bottom: `calc(${robotPosY} / 7000 * 80svh)`,
              right: `calc((${robotPosX} + 3481) / 6962 * 40svh)`,
              transform: `rotate(${robotAngle}deg)`,
            }}
          />
        </div>
      </div>

      {/* 右側: コントロールパネル */}
      <div className="w-[calc(100%-60svh)] overflow-y-auto border-l p-4">
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
              className={`rounded-l-md px-3 py-1 text-sm ${connectionMode === 'ble' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              onClick={() => setConnectionMode('ble')}
            >
              BLE
            </button>
            <button
              type="button"
              className={`rounded-r-md px-3 py-1 text-sm ${connectionMode === 'ws' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              onClick={() => setConnectionMode('ws')}
            >
              WebSocket
            </button>
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleFullscreen}
            className="ml-auto"
          >
            {isFullscreen ? <Minimize /> : <Maximize />}
          </Button>
        </div>

        {/* Connection panel */}
        <div className="mb-4 rounded-lg border p-4">
          <h2 className="mb-3 font-bold text-muted-foreground text-sm">接続</h2>

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
        <CourtSelector
          court={bt.court}
          onSelect={sendSetCourt}
          disabled={!isConnected}
        />

        {/* Mode */}
        <section className="mb-4 rounded-lg border p-4">
          <h2 className="mb-3 font-bold text-muted-foreground text-sm">
            モード
          </h2>
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
          <h2 className="mb-3 font-bold text-muted-foreground text-sm">
            自動シーケンス
          </h2>

          {/* Control buttons */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button
              variant="default"
              onClick={() => handleStartAutoFrom(0)}
              disabled={!isAuto || isBusy}
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
              <span className="text-muted-foreground text-sm">
                進捗: {progress}
              </span>
            )}
          </div>

          {/* リローカライズ中のカウントダウン表示 */}
          {isRelocating && relocatingCountdown !== null && (
            <div className="mb-3 rounded-md bg-purple-100 px-3 py-2 text-purple-800 text-sm">
              {currentWaypoint} でリローカライズ中…{' '}
              <span className="font-bold">{relocatingCountdown} 秒</span>
              後にナビゲーションを開始します
            </div>
          )}

          {/* シーケンスリスト */}
          <div className="space-y-1">
            {WAYPOINTS.map((wp, i) => {
              const isFailed = failedSeqIndex === i;
              const isCurrent =
                currentWaypoint === wp && (isNavigating || isRelocating);
              const isVisited =
                navStatus !== 'MANUAL' &&
                failedSeqIndex !== null &&
                i < failedSeqIndex;

              return (
                <div
                  key={wp}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${
                    isFailed
                      ? 'bg-red-50 ring-1 ring-red-300'
                      : isCurrent
                        ? 'bg-yellow-50 ring-1 ring-yellow-300'
                        : isVisited
                          ? 'bg-gray-50'
                          : ''
                  }`}
                >
                  <span
                    className={`w-5 text-center font-mono text-sm ${
                      isVisited
                        ? 'text-gray-400'
                        : isFailed
                          ? 'text-red-500'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={`flex-1 text-sm ${isVisited ? 'text-gray-400 line-through' : ''}`}
                  >
                    {wp}
                  </span>
                  <Button
                    variant={isFailed ? 'default' : 'outline'}
                    size="sm"
                    className={
                      isFailed
                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                        : ''
                    }
                    onClick={() => handleStartAutoFrom(i)}
                    disabled={!isAuto || isBusy}
                  >
                    <RotateCcw className="size-3" />
                    ここから
                  </Button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Waypoints */}
        <section className="mb-4 rounded-lg border p-4">
          <h2 className="mb-3 font-bold text-muted-foreground text-sm">
            ウェイポイント（単発）
          </h2>
          <div className="flex flex-wrap gap-2">
            {ALL_WAYPOINTS.map((wp) => (
              <Button
                key={wp}
                variant={currentWaypoint === wp ? 'default' : 'outline'}
                onClick={() => sendNavGoal(wp)}
                disabled={!isAuto || isBusy}
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
          <h2 className="mb-3 font-bold text-muted-foreground text-sm">
            ステータス
          </h2>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 font-bold text-sm ${STATUS_STYLES[navStatus] ?? ''}`}
            >
              {navStatus}
            </span>
            {currentWaypoint && (
              <span className="text-muted-foreground text-sm">
                → {currentWaypoint}
              </span>
            )}
          </div>
        </section>

        {/* Log */}
        <section className="rounded-lg border p-4">
          <h2 className="mb-3 font-bold text-muted-foreground text-sm">
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
