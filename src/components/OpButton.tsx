import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { useBluetoothConnect } from '@/hooks/useBluetoothConnect';
import { cn } from '@/lib/utils';
import { sendJsonData } from '@/logics/bluetooth';

const opButtonVariants = cva('h-24 w-full pointer-events-auto', {
  variants: {
    target: {
      yagura: 'text-green-900 bg-green-600/30 hover:bg-green-600/50',
      ring: 'text-amber-900 bg-amber-600/30 hover:bg-amber-600/50',
    },
  },
});

export default function OpButton({
  target,
  hid,
  control_type,
  action,
  className,
  ...props
}: ComponentProps<typeof Button> &
  VariantProps<typeof opButtonVariants> & {
    target: 'yagura' | 'ring';
    hid: number;
    control_type: 'pos' | 'state';
    action: string;
  }) {
  const { bluetoothTxCharacteristic } = useBluetoothConnect();

  async function sendHandCommand(
    target: string,
    control_type: string,
    action: string,
  ) {
    if (bluetoothTxCharacteristic === undefined) return;

    const command = {
      type: 'hand_control',
      target,
      control_type,
      action,
    };

    await sendJsonData(command, bluetoothTxCharacteristic);
  }

  return (
    <Button
      variant="secondary"
      className={cn(opButtonVariants({ target, className }))}
      onClick={() => sendHandCommand(target, control_type, action)}
      {...props}
    />
  );
}
