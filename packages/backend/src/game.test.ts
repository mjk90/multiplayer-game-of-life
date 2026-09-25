import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Game } from './game';
import { createEmptyGrid, DEAD, GRID_HEIGHT, GRID_WIDTH, indexOf, packColor, setCell } from '@life/shared';

type Coord = [number, number];

const CYAN = packColor(0, 255, 255);

function gridFrom(cells: Coord[]): Uint32Array {
  const grid = createEmptyGrid();
  for (const [x, y] of cells) setCell(grid, x, y, CYAN);
  return grid;
}

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
    setCell(game.current, 10, 10, CYAN);
    setCell(game.current, 11, 10, CYAN);
    game.queuePaint(12, 10, CYAN); // completes the horizontal blinker

    game.runTick();

    expect(aliveCoords(game.current)).toEqual([
      [11, 9],
      [11, 10],
      [11, 11],
    ]);
  });

  it('applies a queued paint once regardless of duplicates', () => {
    const game = new Game();
    setCell(game.current, 10, 10, CYAN);
    setCell(game.current, 11, 10, CYAN);
    game.queuePaint(12, 10, CYAN);
    game.queuePaint(12, 10, CYAN); // duplicate overwrites, same result

    game.runTick();

    expect(aliveCoords(game.current)).toEqual([
      [11, 9],
      [11, 10],
      [11, 11],
    ]);
  });

  it('steps a horizontal blinker deterministically across 5 generations', () => {
    const game = new Game();
    setCell(game.current, 10, 10, CYAN);
    setCell(game.current, 11, 10, CYAN);
    setCell(game.current, 12, 10, CYAN);

    for (let i = 0; i < 5; i++) game.runTick();

    expect(game.tick).toBe(5);
    expect(aliveCoords(game.current)).toEqual([
      [11, 9],
      [11, 10],
      [11, 11],
    ]);
  });

  it('emits births in the delta when painting a still life', () => {
    const game = new Game();
    game.queuePaint(10, 10, CYAN);
    game.queuePaint(11, 10, CYAN);
    game.queuePaint(10, 11, CYAN);
    game.queuePaint(11, 11, CYAN);

    const result = game.runTick();

    expect(result.changes).toHaveLength(4);
    expect(result.changes.every((change) => change.color === CYAN)).toBe(true);
  });

  it('emits births and deaths in the delta for a blinker tick', () => {
    const game = new Game();
    setCell(game.current, 10, 10, CYAN);
    setCell(game.current, 11, 10, CYAN);
    setCell(game.current, 12, 10, CYAN);

    const result = game.runTick();

    const births = result.changes.filter((change) => change.color !== DEAD).map((change) => [change.i]);
    const deaths = result.changes.filter((change) => change.color === DEAD).map((change) => [change.i]);

    expect(births).toEqual([[1811], [2211]]);
    expect(deaths).toEqual([[2010], [2012]]);
  });

  it('recolors an alive cell via a queued paint', () => {
    const game = new Game();
    setCell(game.current, 10, 10, CYAN);
    setCell(game.current, 11, 10, CYAN);
    setCell(game.current, 10, 11, CYAN);
    setCell(game.current, 11, 11, CYAN);
    game.queuePaint(11, 11, packColor(255, 0, 0));

    game.runTick();

    expect(game.current[indexOf(11, 11)]).toBe(packColor(255, 0, 0));
    expect(game.current[indexOf(10, 10)]).toBe(CYAN);
    expect(game.current[indexOf(11, 10)]).toBe(CYAN);
    expect(game.current[indexOf(10, 11)]).toBe(CYAN);
  });

  it('clears the board, tick counter, and pending paints', () => {
    const game = new Game();
    setCell(game.current, 3, 3, CYAN);
    game.queuePaint(4, 4, CYAN);
    game.runTick();

    game.clear();

    expect(game.tick).toBe(0);
    expect(aliveCoords(game.current)).toEqual([]);
  });

  it('clears queued paints so they do not apply on the next tick', () => {
    const game = new Game();
    setCell(game.current, 3, 3, CYAN);
    game.queuePaint(4, 4, CYAN);

    game.clear();
    game.runTick();

    expect(game.tick).toBe(1);
    expect(aliveCoords(game.current)).toEqual([]);
  });

  it('reports isRunning false before start', () => {
    const game = new Game();
    expect(game.isRunning).toBe(false);
  });
});

describe('computeNextGeneration (core game functionality)', () => {
  it('keeps a 2x2 block stable', () => {
    const game = new Game();
    const block = gridFrom([
      [10, 10],
      [11, 10],
      [10, 11],
      [11, 11],
    ]);
    expect(aliveCoords(game.computeNextGeneration(block))).toEqual([
      [10, 10],
      [11, 10],
      [10, 11],
      [11, 11],
    ]);
  });

  it('oscillates a horizontal blinker to vertical', () => {
    const game = new Game();
    const blinker = gridFrom([
      [10, 10],
      [11, 10],
      [12, 10],
    ]);
    expect(aliveCoords(game.computeNextGeneration(blinker))).toEqual([
      [11, 9],
      [11, 10],
      [11, 11],
    ]);
  });

  it('advances a glider by one generation', () => {
    const game = new Game();
    const glider = gridFrom([
      [6, 5],
      [7, 6],
      [5, 7],
      [6, 7],
      [7, 7],
    ]);
    expect(aliveCoords(game.computeNextGeneration(glider))).toEqual([
      [5, 6],
      [7, 6],
      [6, 7],
      [7, 7],
      [6, 8],
    ]);
  });

  it('wraps around the toroidal edges', () => {
    const game = new Game();
    const wrapBlinker = gridFrom([
      [GRID_WIDTH - 1, 10],
      [0, 10],
      [1, 10],
    ]);
    expect(aliveCoords(game.computeNextGeneration(wrapBlinker))).toEqual([
      [0, 9],
      [0, 10],
      [0, 11],
    ]);
  });

  it('wraps around the vertical toroidal edges', () => {
    const game = new Game();
    const wrapBlinker = gridFrom([
      [10, GRID_HEIGHT - 1],
      [10, 0],
      [10, 1],
    ]);
    expect(aliveCoords(game.computeNextGeneration(wrapBlinker))).toEqual([
      [9, 0],
      [10, 0],
      [11, 0],
    ]);
  });

  it('kills a cell with fewer than two live neighbors', () => {
    const game = new Game();
    setCell(game.current, 5, 5, CYAN);

    const next = game.computeNextGeneration(game.current);

    expect(next[indexOf(5, 5)]).toBe(DEAD);
  });

  it('kills a cell with more than three live neighbors', () => {
    const game = new Game();
    setCell(game.current, 10, 10, CYAN);
    setCell(game.current, 9, 10, CYAN);
    setCell(game.current, 11, 10, CYAN);
    setCell(game.current, 10, 9, CYAN);
    setCell(game.current, 10, 11, CYAN);

    const next = game.computeNextGeneration(game.current);

    expect(next[indexOf(10, 10)]).toBe(DEAD);
  });

  it('gives a newborn cell the average color of its three live neighbors', () => {
    const game = new Game();
    setCell(game.current, 1, 0, packColor(255, 0, 0));
    setCell(game.current, 0, 1, packColor(0, 255, 0));
    setCell(game.current, 1, 1, packColor(0, 0, 255));

    const next = game.computeNextGeneration(game.current);

    expect(next[indexOf(0, 0)]).toBe(packColor(85, 85, 85));
  });

  it('surviving cells keep their color', () => {
    const game = new Game();
    setCell(game.current, 10, 10, packColor(255, 0, 0));
    setCell(game.current, 11, 10, packColor(0, 255, 0));
    setCell(game.current, 10, 11, packColor(0, 0, 255));
    setCell(game.current, 11, 11, packColor(255, 255, 0));

    const next = game.computeNextGeneration(game.current);

    expect(next[indexOf(10, 10)]).toBe(packColor(255, 0, 0));
    expect(next[indexOf(11, 10)]).toBe(packColor(0, 255, 0));
    expect(next[indexOf(10, 11)]).toBe(packColor(0, 0, 255));
    expect(next[indexOf(11, 11)]).toBe(packColor(255, 255, 0));
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

  it('does not double-schedule ticks when start is called twice', () => {
    const game = new Game(50);
    const ticks: number[] = [];
    game.onTick = (result) => ticks.push(result.tick);

    game.start();
    game.start();

    vi.advanceTimersByTime(100);
    expect(ticks).toEqual([1, 2]);
  });
});
