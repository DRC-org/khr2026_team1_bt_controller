import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const opButtonVariants = cva('pointer-events-auto', {
  variants: {
    target: {
      yagura: 'size-20 text-green-900 bg-green-600/30 hover:bg-green-600/50',
      ring: 'size-20 text-amber-900 bg-amber-600/30 hover:bg-amber-600/50',
    },
  },
});

export default function OpButton({
  target,
  className,
  ...props
}: ComponentProps<typeof Button> &
  VariantProps<typeof opButtonVariants> & {
    target: 'yagura' | 'ring';
  }) {
  return (
    <Button
      variant="secondary"
      className={cn(opButtonVariants({ target, className }))}
      {...props}
    />
  );
}
