import type { CSSProperties } from 'react';

import { PATTERNS, colorToCss } from '@life/shared';

interface ControlsProps {
  myColor: number;
  onClear: () => void;
  onPlacePattern: (name: string) => void;
}

const names = Object.keys(PATTERNS) as string[];

export function Controls({ myColor, onClear, onPlacePattern }: ControlsProps) {
  const style = { '--player-color': colorToCss(myColor || 0x22d3ee) } as CSSProperties;

  return (
    <div className="controls" style={style}>
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
