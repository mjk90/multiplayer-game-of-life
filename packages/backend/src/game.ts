import { CellChange, createEmptyGrid } from "@life/shared";

// default tick interval is 25ms (40 generations per second) if not set in env
export const TICK_INTERVAL_MS = process.env.TICK_INTERVAL_MS ? parseInt(process.env.TICK_INTERVAL_MS) : 25;

export interface TickResult {
  tick: number;
  changes: CellChange[];
}

export class Game {
  /** Current board state (flat Uint32Array of packed colors, indexed by indexOf). */
  current: Uint32Array = createEmptyGrid();

  /** Current generation number (number of completed ticks). */
  tick = 0;

  /** Called after each tick to get the resulting delta. Will be used to send delta updates to clients. */
  onTick: ((result: TickResult) => void) | null = null;

  private running = false;
  // timer for ticks
  private timer: ReturnType<typeof setTimeout> | null = null;
  // time the next tick should run
  private nextTickAt = 0;

  constructor(private readonly intervalMs: number = TICK_INTERVAL_MS) {
    console.log('Game initialized', { intervalMs });
  }

  get isRunning(): boolean {
    return this.running;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.nextTickAt = Date.now() + this.intervalMs;
    this.scheduleNextTick();
  }

  clear(): void {
    this.current = createEmptyGrid();
    this.tick = 0;
  }

  runTick(): TickResult {
    // Game logic will go here
    this.tick++;
    return { tick: this.tick, changes: [] };
  }

  private scheduleNextTick(): void {
    // get the delay until the next tick, compensating for any drift (e.g. if the last tick took longer than expected)
    const delay = Math.max(0, this.nextTickAt - Date.now());
    this.timer = setTimeout(() => {
      if (!this.running) return;

      this.nextTickAt += this.intervalMs;
      if (this.nextTickAt <= Date.now()) {
        // Fell behind (busy event loop); resync to avoid a burst of catch-up ticks.
        this.nextTickAt = Date.now() + this.intervalMs;
      }

      const result = this.runTick();
      this.onTick?.(result);
      this.scheduleNextTick();
    }, delay);
  }
}