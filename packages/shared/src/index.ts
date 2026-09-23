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

/** A single cell to paint (the server applies the sender's color so we don't need to send too much data). */
export interface PaintCell {
  x: number;
  y: number;
}

/** A batch of paint intents sent from a client. */
export interface PaintPacket {
  cells: PaintCell[];
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

/** Convert flat array index to grid (x, y) coordinates */
export function coordinatesToIndex(i: number): { x: number, y: number } {
  return {
    x: i % GRID_WIDTH,
    y: Math.floor(i / GRID_WIDTH),
  }
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

/** Get all changed cells with their x, y and color values */
export function calculateDelta(prev: Uint32Array, next: Uint32Array): CellChange[] {
  const changes: CellChange[] = [];

  for (let i = 0; i < GRID_SIZE; i++) {
    if (prev[i] !== next[i]) {
      const { x, y } = coordinatesToIndex(i);
      changes.push({ x, y, color: next[i] });
    }
  }

  return changes;
}

/**
 * Calculates which cells are intersected by a line between 2 points cheaply (only integer operations)
 * Uses Bresenham's algorithm: https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm
 * @param startX starting point x
 * @param startY starting point y 
 * @param endX ending point x
 * @param endY ending point y 
 * @returns array of cells with their x and y co-ordinates
 */
export function cellsInLine(startX: number, startY: number, endX: number, endY: number): PaintCell[] {
  const cells: PaintCell[] = [];

  // Get absolute diff (so we can handle negative values as well)
  const diffX = Math.abs(endX - startX);
  const diffY = Math.abs(endY - startY);

  // Get the step direction
  const stepX = startX < endX ? 1 : -1;
  const stepY = startY < endY ? 1 : -1;

  let x = startX;
  let y = startY;

  // Keep track of the drift between the exact center of the line and the center of the current cell. This allows us to correct when the drift gets too big
  // Horizontal movement subtracts from this and vertical movement will add to it. We use it to "steer" the value toward the goal
  let drift = diffX - diffY;

  while (true) {
    cells.push({ x, y });

    // stop when destination is reached
    if (x === endX && y === endY) {
      break;
    }

    // multiply by 2 so we only need to do integer calculations
    const d2 = drift * 2;

    // Is current drift small enough that we can step forward horizontally?
    if (d2 >= -diffY) {
      drift -= diffY; // adjust drift based on the horizontal move
      x += stepX; // move in direction of step
    }

    // Is current drift small enough that we can step forward vertically?
    if (d2 <= diffX) {
      drift += diffX; // adjust drift based on the vertical move
      y += stepY; // move in direction of step
    }
  }

  return cells;
}

// ---- Color helpers ----

/**
 * Packs 8-bit RGB channels into a single 24-bit integer
 * @param r red value
 * @param g green value
 * @param b blue value
 * @returns All 3 values encoded into a single 24 bit integer
 */
export function packColor(r: number, g: number, b: number): number {
  // Each value uses only the lowest 8 bits so we mask the values to opnly those lowest 8 bits using "val & 0xff"
  return ((r & 0xff) << 16) | // place red in bits 23-16
    ((g & 0xff) << 8) |       // place green in bits 15-8
    (b & 0xff);               // place blue in bits 7-0
}

/**
 * Unpack a 24-bit color integer into its RGB channels
 * The color is packed like this [ red ][ green ][ blue ] so we can access each color channel like this: 
 * - Red: (color >> 16) & 0xff - multiply by 65536 to isolate the red channel value, then bitwise AND with 0xff to keep only the last 8 bits (the red channel value).
 * - Green: (color >> 8) & 0xff - multiply by 256 to isolate the green channel value, then bitwise AND with 0xff to keep only the last 8 bits (the green channel value).
 * - Blue: color & 0xff - bitwise AND with 0xff to keep only the last 8 bits (the blue channel value).
 * >>
 * @param color The packed color integer.
 * @returns An object containing the red, green, and blue components.
 */
export function unpackColor(color: number): { r: number; g: number; b: number } {
  return {
    r: (color >> 16) & 0xff,
    g: (color >> 8) & 0xff,
    b: color & 0xff,
  };
}
