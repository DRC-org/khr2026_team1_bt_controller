import { useCallback, useEffect, useState } from 'react';

type NavStatus = 'MANUAL' | 'AUTO_IDLE' | 'NAVIGATING' | 'ARRIVED' | 'ERROR' | 'CANCELLED';
type Court = 'blue' | 'red';

interface LogEntry {
  time: string;
  text: string;
}

function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 8);
}

export function useAutoNav(
  onMessage: (callback: (message: string) => void) => void,
  isConnected: boolean,
  sendJson: (data: unknown) => void,
) {
  const [navStatus, setNavStatus] = useState<NavStatus>('MANUAL');
  const [currentWaypoint, setCurrentWaypoint] = useState<string | null>(null);
  const [court, setCourt] = useState<Court>('blue');
  const [progress, setProgress] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [robotPosX, setRobotPosX] = useState(0);
  const [robotPosY, setRobotPosY] = useState(0);
  const [robotAngle, setRobotAngle] = useState(0);

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

      if (data.type === 'robot_pos') {
        setRobotPosX(data.x as number);
        setRobotPosY(data.y as number);
        setRobotAngle(data.angle as number);
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
        setProgress(null);
        addLog('cancelled');
      } else if (status === 'error') {
        setNavStatus('ERROR');
        const message = (data.message as string | undefined) ?? '';
        addLog(`error: ${message}`);
      } else if (status === 'court_set') {
        const c = data.court as Court;
        setCourt(c);
        addLog(`court → ${c}`);
      } else if (status === 'completed') {
        setNavStatus('AUTO_IDLE');
        setProgress(null);
        addLog('auto sequence completed');
      } else if (status === 'progress') {
        const p = data.progress as string | undefined;
        if (p) setProgress(p);
      }
    },
    [addLog],
  );

  useEffect(() => {
    if (isConnected) {
      onMessage(handleMessage);
    }
  }, [isConnected, onMessage, handleMessage]);

  const sendNavMode = useCallback(
    (mode: 'manual' | 'auto') => {
      // rspi の応答（nav_status: mode）は race condition で届かない場合があるため楽観的更新
      setNavStatus(mode === 'auto' ? 'AUTO_IDLE' : 'MANUAL');
      if (mode === 'manual') {
        setCurrentWaypoint(null);
        setProgress(null);
      }
      addLog(`mode → ${mode}`);
      sendJson({ type: 'nav_mode', mode });
    },
    [sendJson, addLog],
  );

  const sendNavGoal = useCallback(
    (waypoint: string) => {
      sendJson({ type: 'nav_goal', waypoint });
    },
    [sendJson],
  );

  const sendSetCourt = useCallback(
    (c: Court) => {
      // 楽観的更新
      setCourt(c);
      addLog(`court → ${c}`);
      sendJson({ type: 'set_court', court: c });
    },
    [sendJson, addLog],
  );

  const sendStartAuto = useCallback(() => {
    setProgress(null);
    addLog('start_auto');
    sendJson({ type: 'start_auto' });
  }, [sendJson, addLog]);

  const sendStopAuto = useCallback(() => {
    setNavStatus('AUTO_IDLE');
    setProgress(null);
    addLog('stop_auto');
    sendJson({ type: 'stop_auto' });
  }, [sendJson, addLog]);

  return {
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
  };
}
