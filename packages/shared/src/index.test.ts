import { describe, expect, it } from 'vitest';

import {
  DEAD,
  GRID_HEIGHT,
  GRID_SIZE,
  GRID_WIDTH,
  PATTERNS,
  calculateDelta,
  cellsInLine,
  colorToCss,
  createEmptyGrid,
  inBounds,
  indexOf,
  packColor,
  setCell,
  unpackColor,
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

describe('cellsInLine', () => {
  it('returns a single cell for a zero-length line', () => {
    expect(cellsInLine(3, 3, 3, 3)).toEqual([{ x: 3, y: 3 }]);
  });

  it('traces a horizontal line left to right', () => {
    expect(cellsInLine(0, 0, 4, 0)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
    ]);
  });

  it('traces a horizontal line right to left', () => {
    expect(cellsInLine(4, 0, 0, 0)).toEqual([
      { x: 4, y: 0 },
      { x: 3, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 0 },
    ]);
  });

  it('traces a vertical line top to bottom', () => {
    expect(cellsInLine(2, 0, 2, 3)).toEqual([
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 2, y: 3 },
    ]);
  });

  it('traces a perfect diagonal', () => {
    expect(cellsInLine(0, 0, 4, 4)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
      { x: 4, y: 4 },
    ]);
  });

  it('traces a shallow diagonal (more horizontal than vertical)', () => {
    expect(cellsInLine(0, 0, 5, 2)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
    ]);
  });

  it('traces a steep diagonal (more vertical than horizontal)', () => {
    expect(cellsInLine(0, 0, 2, 5)).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 2 },
      { x: 1, y: 3 },
      { x: 2, y: 4 },
      { x: 2, y: 5 },
    ]);
  });

  it('handles negative slope in both axes', () => {
    expect(cellsInLine(5, 5, 0, 0)).toEqual([
      { x: 5, y: 5 },
      { x: 4, y: 4 },
      { x: 3, y: 3 },
      { x: 2, y: 2 },
      { x: 1, y: 1 },
      { x: 0, y: 0 },
    ]);
  });

  it('starts and ends at the given endpoints', () => {
    const cells = cellsInLine(10, 20, 30, 35);
    expect(cells[0]).toEqual({ x: 10, y: 20 });
    expect(cells[cells.length - 1]).toEqual({ x: 30, y: 35 });
  });

  it('never steps more than one cell per axis between consecutive cells', () => {
    const cells = cellsInLine(-5, -3, 8, 12);
    expect(cells.length).toBeGreaterThan(0);

    for (let i = 1; i < cells.length; i++) {
      const prev = cells[i - 1];
      const curr = cells[i];
      expect(Math.abs(curr.x - prev.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(curr.y - prev.y)).toBeLessThanOrEqual(1);
    }
  });
});

describe('color helpers', () => {
  it('packs 8-bit RGB channels into a 24-bit integer', () => {
    expect(packColor(255, 0, 0)).toBe(0xff0000);
    expect(packColor(0, 255, 0)).toBe(0x00ff00);
    expect(packColor(0, 0, 255)).toBe(0x0000ff);
  });

  it('packs black and white correctly', () => {
    expect(packColor(0, 0, 0)).toBe(0x000000);
    expect(packColor(255, 255, 255)).toBe(0xffffff);
  });

  it('packs an arbitrary color into its hex representation', () => {
    expect(packColor(0x22, 0xd3, 0xee)).toBe(0x22d3ee);
    expect(packColor(0x12, 0x34, 0x56)).toBe(0x123456);
  });

  it('masks each channel to its lowest 8 bits', () => {
    expect(packColor(256, 257, 258)).toBe(0x000102);
    expect(packColor(0x123, 0x234, 0x345)).toBe(0x233445);
  });

  it('unpacks a 24-bit integer into its RGB channels', () => {
    expect(unpackColor(0xff0000)).toEqual({ r: 255, g: 0, b: 0 });
    expect(unpackColor(0x00ff00)).toEqual({ r: 0, g: 255, b: 0 });
    expect(unpackColor(0x0000ff)).toEqual({ r: 0, g: 0, b: 255 });
  });

  it('unpacks an arbitrary color', () => {
    expect(unpackColor(0x123456)).toEqual({ r: 0x12, g: 0x34, b: 0x56 });
    expect(unpackColor(0x22d3ee)).toEqual({ r: 0x22, g: 0xd3, b: 0xee });
  });

  it('ignores bits above the 24-bit color when unpacking', () => {
    expect(unpackColor(0x01234567)).toEqual({ r: 0x23, g: 0x45, b: 0x67 });
  });

  it('pack and unpack are inverses of each other', () => {
    const cases = [
      { r: 0, g: 0, b: 0 },
      { r: 255, g: 255, b: 255 },
      { r: 0x22, g: 0xd3, b: 0xee },
      { r: 0x12, g: 0x34, b: 0x56 },
    ];

    for (const { r, g, b } of cases) {
      expect(unpackColor(packColor(r, g, b))).toEqual({ r, g, b });
    }
  });
});

describe('calculateDelta', () => {
  it('returns no changes when the boards are identical', () => {
    const grid = createEmptyGrid();
    setCell(grid, 1, 1, 0x123456);

    expect(calculateDelta(grid, grid)).toEqual([]);
  });

  it('reports a born cell with its coordinates and color', () => {
    const prev = createEmptyGrid();
    const next = createEmptyGrid();
    setCell(next, 2, 3, 0xabcdef);

    expect(calculateDelta(prev, next)).toEqual([{ x: 2, y: 3, color: 0xabcdef }]);
  });

  it('reports a dead cell with color 0', () => {
    const prev = createEmptyGrid();
    setCell(prev, 4, 5, 0xffffff);
    const next = createEmptyGrid();

    expect(calculateDelta(prev, next)).toEqual([{ x: 4, y: 5, color: DEAD }]);
  });
});

describe('colorToCss', () => {
  it('formats packed colors as rgb() strings', () => {
    expect(colorToCss(packColor(255, 0, 0))).toBe('rgb(255, 0, 0)');
    expect(colorToCss(0x22d3ee)).toBe('rgb(34, 211, 238)');
    expect(colorToCss(0)).toBe('rgb(0, 0, 0)');
  });
});

describe('PATTERNS', () => {
  it('defines the four expected pattern names', () => {
    expect(Object.keys(PATTERNS).sort()).toEqual(['beehive', 'blinker', 'mwss', 'pulsar']);
  });

  it('contains only unique, in-bounds, non-negative cells', () => {
    for (const [name, cells] of Object.entries(PATTERNS)) {
      const seen = new Set<string>();

      for (const { x, y } of cells) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(inBounds(x, y)).toBe(true);

        const key = `${x},${y}`;
        expect(seen.has(key), `${name} has duplicate cell (${x}, ${y})`).toBe(false);
        seen.add(key);
      }
    }
  });
});
