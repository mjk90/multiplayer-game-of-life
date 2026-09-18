export class Game {
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