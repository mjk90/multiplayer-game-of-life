import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Game } from './game';
import { DEAD, GRID_HEIGHT, GRID_WIDTH, indexOf, PALETTE } from '@life/shared';

type Coord = [number, number];

function aliveCoords(grid: Uint32Array): Coord[] {
  const coords: Coord[] = [];
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      if (grid[indexOf(x, y)] !== DEAD) coords.push([x, y]);
    }
  }
  return coords;
}

describe('Game', () => {
  it('applies queued paints and computes the next generation', () => {
    const game = new Game();
    // / set up a horizontal blinker
    game.queuePaint(10, 10, PALETTE[0]);
    game.queuePaint(11, 10, PALETTE[0]);
    game.queuePaint(12, 10, PALETTE[0]);

    game.runTick();

    expect(game.tick).toBe(1);
    expect(aliveCoords(game.current)).toEqual([
      [11, 9],
      [11, 10],
      [11, 11],
    ]);
  });

  it('applies a queued paint once regardless of duplicates', () => {
    const game = new Game();
    game.queuePaint(10, 10, PALETTE[0]);
    game.queuePaint(11, 10, PALETTE[0]);
    // duplicate overwrites, same result
    game.queuePaint(12, 10, PALETTE[0]);
    game.queuePaint(12, 10, PALETTE[0]);

    game.runTick();

    expect(game.tick).toBe(1);
    expect(aliveCoords(game.current)).toEqual([
      [11, 9],
      [11, 10],
      [11, 11],
    ]);
  });
});

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
