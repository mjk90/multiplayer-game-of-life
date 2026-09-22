import { useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import { PaintPacket, PaintCell, GRID_WIDTH, GRID_HEIGHT, indexOf } from '@life/shared';
import { calculateGridSizes, cellFromEvent, drawBackground, drawLiveCells } from '../helpers/canvas';

interface GameBoardProps {
  grid: Uint32Array;
  onPaint: (cells: PaintPacket) => void;
}

export function GameBoard({ grid, onPaint }: GameBoardProps) {
  // HTML container and canvas elements
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Indicates the user's is currently "painting" the grid. Used to decide which events should be executed
  const paintingRef = useRef(false);
  // Set of cells "visited" as the user is clicking & dragging across the board. Allows the user to draw across multiple cells
  const visitedRef = useRef<Set<number> | null>(null);
  // The latest cell the user "visited" while painting. Used to calculate a line of cells between the last seen and the latest mouse position, so we don't miss anything while moving across the board
  const lastCellRef = useRef<PaintCell | null>(null);


  const draw = (container: HTMLElement, canvas: HTMLCanvasElement) => {
    const { dpr = 0, size = 0, cellSize = 0 } = calculateGridSizes(container, GRID_WIDTH) || {};
    if (size <= 0) return;

    // Set the canvas size to match the container size and device pixel ratio
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawBackground(ctx, size, dpr);
    drawLiveCells(ctx, grid, cellSize);
  }

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    draw(container, canvas);
  }, [grid]);

  function handlePointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    // Get cell cordinates where the user's mouse was clicked
    const cell = cellFromEvent(e.currentTarget, e.clientX, e.clientY);
    if (!cell) return;

    // Register that the user started painting on the board and save the current cell to the Set of cells to be painted
    paintingRef.current = true;
    visitedRef.current = new Set([indexOf(cell.x, cell.y)]);
    lastCellRef.current = cell;

    e.currentTarget.setPointerCapture(e.pointerId);

    // send the clicked cell to onPaint, to be sent to the WS server as a paint event
    onPaint({ cells: [cell] })
  }

  return (
    <div ref={containerRef} className="board">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
      />
    </div>
  );
}
