import { calculateDelta, CellChange, createEmptyGrid, DEAD, GRID_HEIGHT, GRID_WIDTH, indexOf, PALETTE, wrapX, wrapY } from "@life/shared";

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
  // next board state (used to calculate the next generation based on the current state)
  private next: Uint32Array = createEmptyGrid();
  // map of pending cells to be painted in the next tick (cell index -> color)
  private pendingPaints = new Map<number, number>();
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

  /** Queue a paint: the cell takes `color` at the start of the next tick. */
  queuePaint(x: number, y: number, color: number): void {
    this.pendingPaints.set(indexOf(x, y), color);
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

  private applyPendingPaints(): void {
    // apply all pending paints to the current board state and clear the queue
    for (const [i, color] of this.pendingPaints) {
      this.current[i] = color;
    }
    this.pendingPaints.clear();
  }

  computeNextGeneration(grid: Uint32Array): Uint32Array {
    const next = createEmptyGrid();

    // iterate through the grid cells and apply conway's rules
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const i = indexOf(x, y);
        const cell = grid[i];

        let neighbors = 0;

        // loop through all 8 neighbours of the cell
        for (let ny = -1; ny <= 1; ny++) {
          for (let nx = -1; nx <= 1; nx++) {
            if (nx === 0 && ny === 0) continue; // skip current cell
            const color = grid[indexOf(wrapX(x + nx), wrapY(y + ny))];
            if (color !== DEAD) {
              neighbors += 1;
            }
          }
        }

        // Apply rules based on the state of the cell and its neighbors
        if (cell !== DEAD) {
          // if cell is alive and has 2 or 3 live neighbors, no change needed. If it does not not have 2 or 3 live neighbors, it dies
          next[i] = neighbors === 2 || neighbors === 3 ? cell : DEAD;
        } else if (neighbors === 3) {
          // if cell is dead but has 3 live neighbors, it comes back to life (TODO: with the average color of the neighbors)
          next[i] = PALETTE[0];
        } else {
          // if cell is dead and has any other number of neighbors, it stays dead
          next[i] = DEAD;
        }
      }
    }

    return next;
  }

  runTick(): TickResult {
    // If there are new paints to apply, take a snapshot of the array before applying them. This way we can include them in the delta even when they form a still life shape.
    // If we don't do this, the still life shapes don't appear as diffs and get lost.
    const prev = this.pendingPaints.size > 0 ? 
      this.current.slice() : 
      this.current;
      
    // Apply pending updates from users, compute next grid generation based on rules and update the board
    this.applyPendingPaints();
    this.next = this.computeNextGeneration(this.current);
    
    // Get changes from the previous state
    const changes = calculateDelta(prev, this.next);
    
    this.current = this.next;
    this.tick++;

    return { tick: this.tick, changes };
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