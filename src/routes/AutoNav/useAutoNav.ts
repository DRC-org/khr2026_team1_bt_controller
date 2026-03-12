import { useCallback, useEffect, useState } from 'react';

type NavStatus =
  | 'MANUAL'
  | 'AUTO_IDLE'
  | 'NAVIGATING'
  | 'ARRIVED'
  | 'ERROR'
  | 'CANCELLED'
  | 'RELOCATING';
type Court = 'blue' | 'red';

interface LogEntry {
  time: string;
  text: string;
}

function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 8);
}

export function useAutoNav(
  addMessageListener: (
    callback: (message: string) => void,
  ) => (() => void) | void,
  isConnected: boolean,
  sendJson: (data: unknown) => void,
  setCourt: (c: Court) => void,
) {
  const [navStatus, setNavStatus] = useState<NavStatus>('MANUAL');
  const [currentWaypoint, setCurrentWaypoint] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [robotPosX, setRobotPosX] = useState(0);
  const [robotPosY, setRobotPosY] = useState(0);
  const [robotAngle, setRobotAngle] = useState(0);
  const [isAlertFlashing, setIsAlertFlashing] = useState(false);
  const [failedSeqIndex, setFailedSeqIndex] = useState<number | null>(null);
  const [relocatingCountdown, setRelocatingCountdown] = useState<number | null>(
    null,
  );

  const addLog = useCallback((text: string) => {
    const entry: LogEntry = { time: formatTime(new Date()), text };
    setLog((prev) => [entry, ...prev].slice(0, 20));
  }, []);

  const clearAlertState = useCallback(() => {
    setIsAlertFlashing(false);
    setFailedSeqIndex(null);
    setRelocatingCountdown(null);
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
      const seqIndex = data.seq_index as number | undefined;
      const seqTotal = data.seq_total as number | undefined;

      if (status === 'mode') {
        // rspi からの確認応答。楽観的更新済みのためログのみ追加
        addLog(`[rspi確認] mode → ${data.mode}`);
      } else if (status === 'navigating') {
        setNavStatus('NAVIGATING');
        setCurrentWaypoint(waypoint);
        clearAlertState();
        if (seqIndex !== undefined && seqTotal !== undefined) {
          setProgress(`${seqIndex + 1} / ${seqTotal}`);
        }
        addLog(
          `navigating → ${waypoint ?? '?'}${seqTotal !== undefined ? ` (${(seqIndex ?? 0) + 1}/${seqTotal})` : ''}`,
        );
      } else if (status === 'arrived') {
        setNavStatus('ARRIVED');
        setCurrentWaypoint(waypoint);
        if (seqIndex !== undefined && seqTotal !== undefined) {
          setProgress(`${seqIndex + 1} / ${seqTotal}`);
        }
        addLog(`arrived ${waypoint ?? '?'}`);
      } else if (status === 'relocating') {
        setNavStatus('RELOCATING');
        setCurrentWaypoint(waypoint);
        setRelocatingCountdown(data.countdown as number);
        if (seqIndex !== undefined && seqTotal !== undefined) {
          setProgress(`${seqIndex + 1} / ${seqTotal}`);
        }
        addLog(`relocating... ${data.countdown}秒後に開始`);
      } else if (status === 'cancelled') {
        setNavStatus('AUTO_IDLE');
        setCurrentWaypoint(null);
        setProgress(null);
        clearAlertState();
        addLog('cancelled');
      } else if (status === 'error') {
        setNavStatus('ERROR');
        setIsAlertFlashing(true);
        if (seqIndex !== undefined) setFailedSeqIndex(seqIndex);
        const message = (data.message as string | undefined) ?? '';
        addLog(`error: ${message}${waypoint ? ` (${waypoint})` : ''}`);
      } else if (status === 'court_set') {
        const c = data.court as Court;
        setCourt(c);
        addLog(`court → ${c}`);
      } else if (status === 'completed') {
        setNavStatus('AUTO_IDLE');
        setProgress(null);
        clearAlertState();
        addLog('auto sequence completed');
      }
    },
    [addLog, clearAlertState],
  );

  useEffect(() => {
    if (isConnected) {
      return addMessageListener(handleMessage) ?? undefined;
    }
  }, [isConnected, addMessageListener, handleMessage]);

  const sendNavMode = useCallback(
    (mode: 'manual' | 'auto') => {
      // rspi の応答（nav_status: mode）は race condition で届かない場合があるため楽観的更新
      setNavStatus(mode === 'auto' ? 'AUTO_IDLE' : 'MANUAL');
      if (mode === 'manual') {
        setCurrentWaypoint(null);
        setProgress(null);
        clearAlertState();
      }
      addLog(`mode → ${mode}`);
      sendJson({ type: 'nav_mode', mode });
    },
    [sendJson, addLog, clearAlertState],
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
    [sendJson, addLog, setCourt],
  );

  const sendStartAutoFrom = useCallback(
    (fromIndex: number) => {
      clearAlertState();
      setNavStatus('NAVIGATING');
      setProgress(null);
      addLog(
        fromIndex === 0 ? 'start_auto' : `start_auto from index ${fromIndex}`,
      );
      sendJson({ type: 'start_auto', from_index: fromIndex });
    },
    [sendJson, addLog, clearAlertState],
  );

  const sendStopAuto = useCallback(() => {
    setNavStatus('AUTO_IDLE');
    setProgress(null);
    clearAlertState();
    addLog('stop_auto');
    sendJson({ type: 'stop_auto' });
  }, [sendJson, addLog, clearAlertState]);

  return {
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
  };
}
