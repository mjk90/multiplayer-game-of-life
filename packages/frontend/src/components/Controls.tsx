import { PATTERNS } from '@life/shared';

interface ControlsProps {
  onClear: () => void;
  onPlacePattern: (name: string) => void;
}

const names = Object.keys(PATTERNS) as string[];

export function Controls({ onClear, onPlacePattern }: ControlsProps) {
  return (
    <div className="controls">
      <button type="button" className='button-xs' onClick={onClear}>
        Clear
      </button>
      {names.map((name) => (
        <button key={name} type="button" onClick={() => onPlacePattern(name)}>
          {name}
        </button>
      ))}
    </div>
  );
}
