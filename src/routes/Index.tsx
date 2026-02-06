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
            <ItemTitle className="font-bold">Controller</ItemTitle>
            <ItemDescription>
              ロボットを半自動でコントロールする
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
            <ItemTitle className="font-bold">PID Tuning</ItemTitle>
            <ItemDescription>足回りの PID ゲインを調整する</ItemDescription>
          </ItemContent>
        </a>
      </Item>
    </div>
  );
}
