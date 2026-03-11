import { Activity } from 'lucide-react';
import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';
import { useHealthStatus } from '@/hooks/useHealthStatus';
import { sendJsonData } from '@/logics/bluetooth';

function StatusDot({
  label,
  active,
}: {
  label: string;
  active: boolean | undefined;
}) {
  const color =
    active === true
      ? 'bg-green-500'
      : active === false
        ? 'bg-red-500'
        : 'bg-gray-400';

  return (
    <div className="flex items-center gap-1">
      <span className={`inline-block size-2.5 rounded-full ${color}`} />
      <span className="font-medium text-xs">{label}</span>
    </div>
  );
}

export function HealthBar() {
  const { bluetoothTxCharacteristic } = useAppContext();
  const health = useHealthStatus();

  const handleHealthCheck = useCallback(() => {
    if (!bluetoothTxCharacteristic) return;
    sendJsonData({ type: 'health_check' }, bluetoothTxCharacteristic);
  }, [bluetoothTxCharacteristic]);

  const resultLabel =
    health.hcResult === 'ok'
      ? 'OK'
      : health.hcResult === 'fail'
        ? 'FAIL'
        : health.hcResult === 'timeout'
          ? 'TIMEOUT'
          : null;

  const resultColor =
    health.hcResult === 'ok' ? 'text-green-700' : 'text-red-700';

  return (
    <div className="flex items-center gap-3 border-gray-200 border-b bg-gray-50 px-3 py-1.5">
      <StatusDot label="CWMC" active={health.cwmc} />
      <StatusDot label="HWMC" active={health.hwmc} />
      <StatusDot label="BLE" active={health.ble} />

      <div className="ml-auto flex items-center gap-2">
        {health.hcRunning && (
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{
                  width: `${Math.min(100, (health.hcElapsed / 7) * 100)}%`,
                }}
              />
            </div>
            <span className="text-gray-500 text-xs tabular-nums">
              {health.hcElapsed.toFixed(1)}s
            </span>
          </div>
        )}

        {resultLabel && !health.hcRunning && (
          <span className={`font-bold text-xs ${resultColor}`}>
            {resultLabel}
          </span>
        )}

        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 px-2 text-xs"
          onClick={handleHealthCheck}
          disabled={health.hcRunning || !bluetoothTxCharacteristic}
        >
          <Activity className="size-3.5" />
          HC
        </Button>
      </div>
    </div>
  );
}
