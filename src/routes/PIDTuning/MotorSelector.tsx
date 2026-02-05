import { Button } from '@/components/ui/button';
import { MOTOR_COLORS, MOTOR_LABELS } from './constants';
import { MOTOR_KEYS, type MotorKey } from './types';

interface MotorSelectorProps {
  selectedMotor: MotorKey;
  onMotorChange: (motor: MotorKey) => void;
}

export function MotorSelector({
  selectedMotor,
  onMotorChange,
}: MotorSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {MOTOR_KEYS.map((motor) => (
          <Button
            key={motor}
            variant={selectedMotor === motor ? 'default' : 'outline'}
            size="sm"
            onClick={() => onMotorChange(motor)}
            style={{
              borderColor: MOTOR_COLORS[motor],
              backgroundColor:
                selectedMotor === motor ? MOTOR_COLORS[motor] : 'transparent',
              color: selectedMotor === motor ? 'white' : MOTOR_COLORS[motor],
            }}
          >
            {motor.toUpperCase()}
          </Button>
        ))}
      </div>
      <span className="text-muted-foreground text-sm">
        {MOTOR_LABELS[selectedMotor]}
      </span>
    </div>
  );
}
