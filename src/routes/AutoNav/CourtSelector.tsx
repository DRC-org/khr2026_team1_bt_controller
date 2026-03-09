import { Button } from '@/components/ui/button';

type Court = 'blue' | 'red';

interface CourtSelectorProps {
  court: Court;
  onSelect: (court: Court) => void;
  disabled?: boolean;
}

export function CourtSelector({
  court,
  onSelect,
  disabled,
}: CourtSelectorProps) {
  return (
    <section className="mb-4 rounded-lg border p-4">
      <h2 className="mb-3 font-bold text-sm text-muted-foreground">コート</h2>
      <div className="flex gap-2">
        <Button
          variant={court === 'blue' ? 'default' : 'outline'}
          className={court === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : ''}
          onClick={() => onSelect('blue')}
          disabled={disabled}
        >
          青コート
        </Button>
        <Button
          variant={court === 'red' ? 'default' : 'outline'}
          className={court === 'red' ? 'bg-red-600 hover:bg-red-700' : ''}
          onClick={() => onSelect('red')}
          disabled={disabled}
        >
          赤コート
        </Button>
      </div>
    </section>
  );
}
