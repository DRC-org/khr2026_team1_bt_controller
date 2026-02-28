import { useCallback, useEffect, useState } from 'react';
import { sendJsonData } from '@/logics/bluetooth';

type NavStatus = 'MANUAL' | 'AUTO_IDLE' | 'NAVIGATING' | 'ARRIVED' | 'ERROR' | 'CANCELLED';

interface LogEntry {
  time: string;
  text: string;
}

function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 8);
}

export function useAutoNav(
  onMessage: (callback: (message: string) => void) => void,
  isDeviceConnected: boolean,
  bluetoothTxCharacteristic: BluetoothRemoteGATTCharacteristic | undefined,
) {
  const [navStatus, setNavStatus] = useState<NavStatus>('MANUAL');
  const [currentWaypoint, setCurrentWaypoint] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);

  const addLog = useCallback((text: string) => {
    const entry: LogEntry = { time: formatTime(new Date()), text };
    setLog((prev) => [entry, ...prev].slice(0, 20));
  }, []);

  const handleMessage = useCallback(
    (msg: string) => {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(msg);
      } catch {
        return;
      }

      if (!('nav_status' in data)) return;

      const status = data.nav_status as string;
      const waypoint = (data.waypoint as string | undefined) ?? null;

      if (status === 'mode') {
        // rspi からの確認応答。楽観的更新済みのためログのみ追加
        const mode = data.mode as string;
        addLog(`[rspi確認] mode → ${mode}`);
      } else if (status === 'navigating') {
        setNavStatus('NAVIGATING');
        setCurrentWaypoint(waypoint);
        addLog(`navigating → ${waypoint ?? '?'}`);
      } else if (status === 'arrived') {
        setNavStatus('ARRIVED');
        setCurrentWaypoint(waypoint);
        addLog(`arrived ${waypoint ?? '?'}`);
      } else if (status === 'cancelled') {
        setNavStatus('AUTO_IDLE');
        setCurrentWaypoint(null);
        addLog('cancelled');
      } else if (status === 'error') {
        setNavStatus('ERROR');
        addLog('error');
      }
    },
    [addLog],
  );

  useEffect(() => {
    if (isDeviceConnected) {
      onMessage(handleMessage);
    }
  }, [isDeviceConnected, onMessage, handleMessage]);

  const sendNavMode = useCallback(
    async (mode: 'manual' | 'auto') => {
      if (!bluetoothTxCharacteristic) return;
      // rspi の応答（nav_status: mode）は race condition で届かない場合があるため楽観的更新
      setNavStatus(mode === 'auto' ? 'AUTO_IDLE' : 'MANUAL');
      if (mode === 'manual') setCurrentWaypoint(null);
      addLog(`mode → ${mode}`);
      await sendJsonData({ type: 'nav_mode', mode }, bluetoothTxCharacteristic);
    },
    [bluetoothTxCharacteristic, addLog],
  );

  const sendNavGoal = useCallback(
    async (waypoint: string) => {
      if (!bluetoothTxCharacteristic) return;
      await sendJsonData({ type: 'nav_goal', waypoint }, bluetoothTxCharacteristic);
    },
    [bluetoothTxCharacteristic],
  );

  return { navStatus, currentWaypoint, log, sendNavMode, sendNavGoal };
}
