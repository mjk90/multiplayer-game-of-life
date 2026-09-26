import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PALETTE, packColor } from '@life/shared';

import { ColorRegistry } from './colorRegistry';

const GRACE_MS = 30_000;

describe('ColorRegistry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('assigns a palette colour to a new player', () => {
    const registry = new ColorRegistry(GRACE_MS);

    const color = registry.register('p1');

    expect(color).toBe(PALETTE[0]);
    expect(registry.isReserved(color)).toBe(true);
  });

  it('reassigns the same colour when a player reconnects within the grace period', () => {
    const registry = new ColorRegistry(GRACE_MS);

    const first = registry.register('p1');
    registry.unregister('p1', first);

    const second = registry.register('p1');

    expect(second).toBe(first);
  });

  it('releases the colour after the grace period expires', () => {
    const registry = new ColorRegistry(GRACE_MS);

    const first = registry.register('p1');
    registry.unregister('p1', first);

    vi.advanceTimersByTime(GRACE_MS);

    expect(registry.isReserved(first)).toBe(false);

    // A new player should be able to take the freed palette colour.
    expect(registry.register('p2')).toBe(first);
  });

  it('keeps a colour reserved for the disconnecting player during the grace period', () => {
    const registry = new ColorRegistry(GRACE_MS);

    const first = registry.register('p1');
    registry.unregister('p1', first);

    // p1's colour is still held, so p2 gets the next palette colour.
    expect(registry.register('p2')).toBe(PALETTE[1]);
  });

  it('releases an anonymous colour immediately', () => {
    const registry = new ColorRegistry(GRACE_MS);

    const first = registry.register();
    registry.unregister(undefined, first);

    expect(registry.isReserved(first)).toBe(false);
    expect(registry.register()).toBe(first);
  });

  it('generates a random colour when the palette is exhausted', () => {
    const registry = new ColorRegistry(GRACE_MS);

    // Exhaust the palette with anonymous registrations.
    for (let i = 0; i < PALETTE.length; i++) {
      registry.register();
    }

    vi.spyOn(Math, 'random').mockReturnValue(0);
    const color = registry.register();

    expect(PALETTE).not.toContain(color);
    expect(color).toBe(packColor(80, 80, 80));
  });
});
