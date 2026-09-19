import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Game } from './game';

describe('Game timer loop', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ticks on the configured interval', () => {
    const game = new Game(50);
    const ticks: number[] = [];
    game.onTick = (result) => ticks.push(result.tick);

    game.start();
    expect(game.isRunning).toBe(true);

    vi.advanceTimersByTime(150);
    expect(ticks).toEqual([1, 2, 3]);

    game.clear();
    expect(game.tick).toBe(0);
  });
});
