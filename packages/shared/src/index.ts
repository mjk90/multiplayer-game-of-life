/**
 * Shared types, constants, and helpers for multiplayer Conway's Game of Life.
*/

// ---- Board dimensions ----
export const GRID_WIDTH = 200;
export const GRID_HEIGHT = 200;
export const GRID_SIZE = GRID_WIDTH * GRID_HEIGHT;

// ---- Cell Colors ----
export const PALETTE = [
  0x22d3ee, // cyan
  0x34d399, // green
  0xfacc15, // yellow
  0xfb923c, // orange
  0xef4444, // red
  0xec4899, // pink
  0xa78bfa, // purple
  0x60a5fa, // blue
];

// Sentinel color value for "dead"
export const DEAD = 0;

// ---- Grid helper functions ----
export function createEmptyGrid(): Uint32Array {
  return new Uint32Array(GRID_SIZE);
}

/** Convert grid (x, y) coordinates to a flat array index. */
export function indexOf(x: number, y: number): number {
  return y * GRID_WIDTH + x;
}

/** Set a single cell's color (0 = dead). */
export function setCell(grid: Uint32Array, x: number, y: number, color: number): void {
  grid[indexOf(x, y)] = color;
}