import { DEAD, GRID_HEIGHT, GRID_WIDTH, indexOf } from "@life/shared";

export const COLOR_BG = '#0f172a';

/**
 * Calculates the grid size, cell size & pixel ratio for the grid based on the container element and the grid width.
 * @param container 
 * @param gridWidth
 * @returns device pixel ratio, grid size, and cell size
 */
export const calculateGridSizes = (container: HTMLElement, gridWidth: number) => {
  const width = container.clientWidth;
  const height = container.clientHeight || width;
  const size = Math.min(width, height);
  if (size <= 0) return;

  const dpr = window.devicePixelRatio || 1;
  const cellSize = size / gridWidth;

  return { dpr, size, cellSize };
}


// ---- Drawing functions ----

export const drawBackground = (ctx: CanvasRenderingContext2D, size: number, dpr: number) => {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, size, size);
}

export const drawLiveCells = (ctx: CanvasRenderingContext2D, grid: Uint32Array, cellSize: number) => {
  // Alive cells (with a small inset so cells look like a grid)
  const inset = cellSize >= 8 ? 1 : 0;

  console.log('Drawing live cells', { cellSize, inset, grid });

  // set a few cells to alive for testing
  grid[indexOf(10, 10)] = 0x22d3ee;
  grid[indexOf(11, 10)] = 0x34d399;
  grid[indexOf(12, 10)] = 0xfacc15;
  grid[indexOf(13, 10)] = 0xfb923c;
  grid[indexOf(14, 10)] = 0xef4444;

  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const color = grid[indexOf(x, y)];
      if (color !== DEAD) {
        // ctx.fillStyle = colorToCss(color);
        const r = 255;
        const g = 255;
        const b = 255;
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x * cellSize + inset, y * cellSize + inset, cellSize - inset * 2, cellSize - inset * 2);
      }
    }
  }
}