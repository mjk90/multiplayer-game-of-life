import { createEmptyGrid } from "@life/shared";

// default tick interval is 25ms (40 generations per second) if not set in env
export const TICK_INTERVAL_MS = process.env.TICK_INTERVAL_MS ? parseInt(process.env.TICK_INTERVAL_MS) : 25;

export class Game {
  /** Current board state (flat Uint32Array of packed colors, indexed by indexOf). */
  current: Uint32Array = createEmptyGrid();

  /** Current generation number (number of completed ticks). */
  tick = 0;

  private running = false;

  constructor() {
    console.log('Game initialized');
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.scheduleNext();
  }

  private scheduleNext(): void {
    // Game logic will go here
  }
}