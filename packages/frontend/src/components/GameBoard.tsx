import { useEffect, useRef } from 'react';

import { PaintPacket, PaintCell, GRID_WIDTH, GRID_HEIGHT } from '@life/shared';
import { calculateGridSizes, drawBackground, drawLiveCells } from '../helpers/canvas';

interface GameBoardProps {
  grid: Uint32Array;
  onPaint: (cells: PaintPacket) => void;
}

export function GameBoard({ grid, onPaint }: GameBoardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const draw = () => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const { dpr = 0, size = 0, cellSize = 0 } = calculateGridSizes(container, GRID_WIDTH) || {};
    if(size <= 0) return;

    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawBackground(ctx, size, dpr);
    drawLiveCells(ctx, grid, cellSize);
  }

  draw();

  return (
    <div ref={containerRef} className="board">
      <canvas ref={canvasRef} />
    </div>
  );
}
