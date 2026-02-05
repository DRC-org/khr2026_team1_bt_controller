import { Gamepad2, SlidersVertical } from 'lucide-react';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';

export default function Index() {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-xl flex-col justify-center gap-3 p-5">
      <Item variant="outline" asChild>
        <a href="#/controller">
          <ItemMedia variant="icon">
            <Gamepad2 />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Controller</ItemTitle>
            <ItemDescription>
              Control the robot's movements and actions in real-time.
            </ItemDescription>
          </ItemContent>
        </a>
      </Item>

      <Item variant="outline" asChild>
        <a href="#/pid-tuning">
          <ItemMedia variant="icon">
            <SlidersVertical />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>PID Tuning</ItemTitle>
            <ItemDescription>
              Monitor and adjust the PID parameters for optimal motor
              performance.
            </ItemDescription>
          </ItemContent>
        </a>
      </Item>
    </div>
  );
}
