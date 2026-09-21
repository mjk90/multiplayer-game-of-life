import { describe, expect, it } from 'vitest';

import {
  DEAD,
  GRID_HEIGHT,
  GRID_WIDTH,
  createEmptyGrid,
  inBounds,
  indexOf,
  setCell,
  wrapX,
  wrapY,
} from './index';

describe('grid helpers', () => {
  it('creates an empty grid of dead cells', () => {
    const grid = createEmptyGrid();
    expect(grid.length).toBe(GRID_WIDTH * GRID_HEIGHT);
    let liveCells = grid.filter((cell) => cell !== DEAD);
    expect(liveCells.length).toBe(0);
  });

  it('calculates the correct index for (x, y) coordinates', () => {
    expect(indexOf(0, 0)).toBe(0);
    expect(indexOf(1, 0)).toBe(1);
    expect(indexOf(0, 1)).toBe(GRID_WIDTH);
    expect(indexOf(3, 25)).toBe(25 * GRID_WIDTH + 3);
  });

  it('sets cells to a given color', () => {
    const grid = createEmptyGrid();
    setCell(grid, 0, 0, 0x22d3ee);
    setCell(grid, 1, 0, 0x34d399);
    setCell(grid, 50, 25, 0xfacc15);

    expect(grid[indexOf(0, 0)]).toBe(0x22d3ee);
    expect(grid[indexOf(1, 0)]).toBe(0x34d399);
    expect(grid[indexOf(50, 25)]).toBe(0xfacc15);
  });

  it('wraps x & y coordinates correctly', () => {
    expect(wrapX(-1)).toBe(GRID_WIDTH - 1);
    expect(wrapX(GRID_WIDTH)).toBe(0);
    expect(wrapY(-25)).toBe(GRID_HEIGHT - 25);
    expect(wrapY(GRID_HEIGHT)).toBe(0);
  });

  it('checks if coordinates are in bounds', () => {
    expect(inBounds(0, 0)).toBe(true);
    expect(inBounds(GRID_WIDTH - 1, GRID_HEIGHT - 1)).toBe(true);
    expect(inBounds(-1, 0)).toBe(false);
    expect(inBounds(0, -1)).toBe(false);
    expect(inBounds(GRID_WIDTH, 0)).toBe(false);
    expect(inBounds(0, GRID_HEIGHT)).toBe(false);
  });
});
