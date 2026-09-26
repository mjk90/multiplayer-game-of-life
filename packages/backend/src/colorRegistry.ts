import { PALETTE, packColor } from '@life/shared';

const DEFAULT_GRACE_MS = process.env.DEFAULT_GRACE_MS ? parseInt(process.env.DEFAULT_GRACE_MS) : 30_000;

interface HeldColor {
  color: number;
  releasedAt: number | null;
  timer: ReturnType<typeof setTimeout> | null;
}

/**
 * Assigns and reclaims player colours across Socket.IO reconnects.
 *
 * Colours are keyed by a client-supplied `playerId` (a sessionStorage UUID on the frontend). When a player disconnects, their colour is held for a grace period
 * so a quick reconnect gets the same colour back. Anonymous clients (no player id) release their colour immediately.
 */
export class ColorRegistry {
  /** player id -> colour held for that player */
  private readonly playerColors = new Map<string, HeldColor>();
  /** colours currently assigned to or held for someone */
  private readonly reserved = new Set<number>();

  constructor(private readonly graceMs: number = DEFAULT_GRACE_MS) {}

  /** Assign a colour, reclaiming a held colour for a known player. */
  register(playerId?: string): number {
    if (playerId) {
      const held = this.playerColors.get(playerId);

      if (held) {
        if (held.timer) {
          clearTimeout(held.timer);
          held.timer = null;
        }
        held.releasedAt = null;
        this.reserved.add(held.color);
        return held.color;
      }

      const color = this.allocateColor();
      this.reserved.add(color);
      this.playerColors.set(playerId, { color, releasedAt: null, timer: null });
      return color;
    }

    const color = this.allocateColor();
    this.reserved.add(color);
    return color;
  }

  /**
   * Release a colour. Known players get a grace period; anonymous clients
   * release their colour immediately.
   */
  unregister(playerId: string | undefined, color: number): void {
    if (!playerId) {
      this.reserved.delete(color);
      return;
    }

    const held = this.playerColors.get(playerId);
    if (!held) return;

    held.releasedAt = Date.now();
    held.timer = setTimeout(() => {
      const current = this.playerColors.get(playerId);
      if (current && current.releasedAt !== null) {
        this.reserved.delete(current.color);
        this.playerColors.delete(playerId);
      }
    }, this.graceMs);
  }

  /** Whether a colour is currently assigned to or held for someone. */
  isReserved(color: number): boolean {
    return this.reserved.has(color);
  }

  private allocateColor(): number {
    const free = PALETTE.find((color) => !this.reserved.has(color));
    if (free !== undefined) return free;

    // Palette exhausted: generate a bright random colour that isn't in use.
    let color = 0;
    do {
      color = packColor(
        80 + Math.floor(Math.random() * 176),
        80 + Math.floor(Math.random() * 176),
        80 + Math.floor(Math.random() * 176),
      );
    } while (this.reserved.has(color));

    return color;
  }
}
