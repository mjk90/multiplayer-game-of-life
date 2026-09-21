/**
 * Shared types, constants, and helpers for multiplayer Conway's Game of Life.
*/

// ---- Board dimensions ----
export const GRID_WIDTH = 200;
export const GRID_HEIGHT = 200;
export const GRID_SIZE = GRID_WIDTH * GRID_HEIGHT;

//  ---- Websocket types ----

// Socket.IO event names
export const EVENTS = {
  paint: 'paint',
  snapshot: 'snapshot',
  delta: 'delta',
  clear: 'clear',
  placePattern: 'placePattern',
  status: 'status',
} as const;

/**
 * Full board state sent on connect/reconnect.
 * `cells` is a flat array of packed RGB colors (0 = dead) with length GRID_SIZE.
 * `yourColor` is the connected client's assigned color.
 */
export interface GameSnapshot {
  tick: number;
  width: number;
  height: number;
  cells: number[];
  clientColor: number;
}

/** A single cell change emitted in a delta. `color` is packed RGB; 0 = dead. */
export interface CellChange {
  x: number;
  y: number;
  color: number;
}

/** Per-tick delta: only the cells that changed this generation. We don't want to send the whole board on each tick */
export interface GameTickPacket {
  tick: number;
  changes: CellChange[];
}

/** Status info broadcast alongside each tick. */
export interface StatusPacket {
  running: boolean;
  online: number;
}

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

/** A single cell change delta. `color` is packed RGB; 0 = dead. */
export interface CellChange {
  x: number;
  y: number;
  color: number;
}

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

/** Wrap an x coordinate into [0, GRID_WIDTH). */
export function wrapX(x: number): number {
  const remainder = x % GRID_WIDTH;
  return remainder < 0 ? remainder + GRID_WIDTH : remainder;
}

/** Wrap a y coordinate into [0, GRID_HEIGHT). */
export function wrapY(y: number): number {
  const remainder = y % GRID_HEIGHT;
  return remainder < 0 ? remainder + GRID_HEIGHT : remainder;
}

/** Whether the given coordinates are inside the board. */
export function inBounds(x: number, y: number): boolean {
  return x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT;
}