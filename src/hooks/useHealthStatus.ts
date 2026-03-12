import { useCallback, useEffect, useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';

export interface HealthStatus {
  cwmc: boolean;
  hwmc: boolean;
  ble: boolean;
  servoFront: boolean;
  servoRear: boolean;
  dcLiftFront: boolean;
  dcLiftRear: boolean;
  crab: boolean;
  hcRunning: boolean;
  hcElapsed: number;
  hcResult: 'ok' | 'fail' | 'timeout' | null;
}

const INITIAL_STATUS: HealthStatus = {
  cwmc: false,
  hwmc: false,
  ble: false,
  servoFront: false,
  servoRear: false,
  dcLiftFront: false,
  dcLiftRear: false,
  crab: false,
  hcRunning: false,
  hcElapsed: 0,
  hcResult: null,
};

export function useHealthStatus(): HealthStatus {
  const { isDeviceConnected, isWsConnected, addMessageListener } =
    useAppContext();
  const [status, setStatus] = useState<HealthStatus>(INITIAL_STATUS);
  const isAnyConnected = isDeviceConnected || isWsConnected;

  const handleMessage = useCallback(
    (msg: string) => {
      try {
        const data = JSON.parse(msg);
        if (!data.health) return;

        const h = data.health;
        setStatus({
          cwmc: !!h.cwmc,
          hwmc: !!h.hwmc,
          ble: isAnyConnected,
          servoFront: !!h.servo_front,
          servoRear: !!h.servo_rear,
          dcLiftFront: !!h.dc_lift_front,
          dcLiftRear: !!h.dc_lift_rear,
          crab: !!h.crab,
          hcRunning: !!h.hc_running,
          hcElapsed: h.hc_elapsed ?? 0,
          hcResult: h.hc_result ?? null,
        });
      } catch {
        // ignore parse errors
      }
    },
    [isAnyConnected],
  );

  useEffect(() => {
    return addMessageListener(handleMessage);
  }, [addMessageListener, handleMessage]);

  useEffect(() => {
    setStatus((prev) => ({ ...prev, ble: isAnyConnected }));
  }, [isAnyConnected]);

  return status;
}
