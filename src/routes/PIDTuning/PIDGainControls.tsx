import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PID_GAIN_CONFIGS, type PIDGains } from './types';

interface PIDGainControlsProps {
  onGainsChange: (gains: PIDGains) => void;
  currentGains?: PIDGains;
  disabled?: boolean;
}

export function PIDGainControls({
  onGainsChange,
  currentGains,
  disabled = false,
}: PIDGainControlsProps) {
  const [localGains, setLocalGains] = useState<PIDGains>({
    kp: 0.5,
    ki: 0.05,
    kd: 0.0,
  });

  // useEffect(() => {
  //   if (currentGains) {
  //     setLocalGains(currentGains);
  //   }
  // }, [currentGains]);

  const handleGainChange = useCallback(
    (key: keyof PIDGains, value: number) => {
      const config = PID_GAIN_CONFIGS.find((c) => c.key === key);
      if (!config) return;

      const clampedValue = Math.max(config.min, Math.min(config.max, value));
      setLocalGains((prev) => ({ ...prev, [key]: clampedValue }));
    },
    [],
  );

  const handleApply = useCallback(() => {
    onGainsChange(localGains);
  }, [localGains, onGainsChange]);

  const handleReset = useCallback(() => {
    const defaults: PIDGains = {
      kp: PID_GAIN_CONFIGS.find((c) => c.key === 'kp')!.default,
      ki: PID_GAIN_CONFIGS.find((c) => c.key === 'ki')!.default,
      kd: PID_GAIN_CONFIGS.find((c) => c.key === 'kd')!.default,
    };
    setLocalGains(defaults);
    onGainsChange(defaults);
  }, [onGainsChange]);

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      <h3 className="font-bold text-sm">PID Gain Adjustment</h3>

      <div className="grid grid-cols-3 gap-4">
        {PID_GAIN_CONFIGS.map((config) => (
          <div key={config.key} className="flex flex-col gap-2">
            <label className="text-xs font-medium text-muted-foreground">
              {config.label}
            </label>
            <input
              type="number"
              min={config.min}
              max={config.max}
              step={config.step}
              value={localGains[config.key]}
              onChange={(e) =>
                handleGainChange(config.key, Number.parseFloat(e.target.value) || 0)
              }
              disabled={disabled}
              className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
            <input
              type="range"
              min={config.min}
              max={config.max}
              step={config.step}
              value={localGains[config.key]}
              onChange={(e) =>
                handleGainChange(config.key, Number.parseFloat(e.target.value))
              }
              disabled={disabled}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted disabled:opacity-50"
            />
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button onClick={handleApply} disabled={disabled} size="sm">
          Apply
        </Button>
        <Button
          onClick={handleReset}
          disabled={disabled}
          variant="outline"
          size="sm"
        >
          Reset to Default
        </Button>
      </div>

      {currentGains && (
        <div className="text-xs text-muted-foreground">
          Current (ESP32): Kp={currentGains.kp.toFixed(2)}, Ki=
          {currentGains.ki.toFixed(3)}, Kd={currentGains.kd.toFixed(3)}
        </div>
      )}
    </div>
  );
}
