import { colorToCss, DEAD, GRID_HEIGHT, GRID_WIDTH, indexOf, PaintCell } from "@life/shared";

export const COLOR_BG = '#0f172a';

/**
 * Calculates the grid size, cell size & pixel ratio for the grid based on the container element and the grid width.
 * @param container 
 * @param gridWidth
 * @returns device pixel ratio, grid size, and cell size
 */
export const calculateGridSizes = (container: HTMLElement, gridWidth: number, gridHeight: number) => {
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight || containerWidth;

  if (containerWidth <= 0 || containerHeight <= 0) return;

  const dpr = window.devicePixelRatio || 1;

  // Fit the board into the container while preserving the grid's aspect ratio
  // (cells stay square).
  const cellSize = Math.min(containerWidth / gridWidth, containerHeight / gridHeight);
  if (cellSize <= 0) return;

  const width = cellSize * gridWidth;
  const height = cellSize * gridHeight;

  return { dpr, width, height, cellSize };
}


// ---- Drawing functions ----

export const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number, dpr: number) => {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(0, 0, width, height);
}

export const drawLiveCells = (ctx: CanvasRenderingContext2D, grid: Uint32Array, cellSize: number) => {
  // Alive cells (with a small inset so cells look like a grid)
  const inset = cellSize >= 8 ? 1 : 0;

  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const color = grid[indexOf(x, y)];
      if (color !== DEAD) {
        ctx.fillStyle = colorToCss(color);
        ctx.fillRect(x * cellSize + inset, y * cellSize + inset, cellSize - inset * 2, cellSize - inset * 2);
      }
    }
  }
}

// ---- Controller functions ----

export const cellFromEvent = (canvas: HTMLCanvasElement | null, clientX: number, clientY: number): PaintCell | null => {
  if (!canvas) return null;

  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  // Get the cell coordinates based on mouse position relative to the canvas
  const x = Math.floor(((clientX - rect.left) / rect.width) * GRID_WIDTH);
  const y = Math.floor(((clientY - rect.top) / rect.height) * GRID_HEIGHT);

  // Check if the calculated cell coordinates are within the bounds of the grid
  if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return null;
  
  return { x, y };
}