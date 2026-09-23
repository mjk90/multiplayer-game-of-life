import { createServer, Server as HttpServer } from 'node:http';
import { Server as SocketIoServer } from 'socket.io';
import { Game } from './game';
import { EVENTS, GameSnapshot, GameTickPacket, GRID_HEIGHT, GRID_WIDTH, inBounds, packColor, PaintPacket, PALETTE, StatusPacket } from '@life/shared';

export interface GameServer {
  io: SocketIoServer;
  game: Game;
  httpServer: HttpServer;
  close: () => Promise<void>;
}

const snapshot = (game: Game, clientColor: number): GameSnapshot => ({
  tick: game.tick,
  width: GRID_WIDTH,
  height: GRID_HEIGHT,
  cells: Array.from(game.current),
  clientColor,
});

const status = (game: Game, clientCount: number): StatusPacket => ({
  running: game.isRunning,
  online: clientCount,
});

const getAvailableColor = (usedColors: Set<number>): number => {
  // Look for a free color in the pre set palette
  const free = PALETTE.find((color) => !usedColors.has(color));
  if (free !== undefined) {
    return free;
  }
  
  // More clients than palette entries: generate a random bright color.
  let color = 0;
  do {
    color = packColor(
      80 + Math.floor(Math.random() * 176),
      80 + Math.floor(Math.random() * 176),
      80 + Math.floor(Math.random() * 176),
    );
  } while (usedColors.has(color));

  return color;
};

export function startServer(port = 3001): Promise<GameServer> {
  const httpServer = createServer();
  // TODO: Update CORS for prod to allow frontend to connect only
  const corsOptions = process.env.NODE_ENV === 'PROD' ? undefined : { origin: '*' };
  const io = new SocketIoServer(httpServer, { cors: corsOptions });
  const game = new Game();
  game.start();

  // Keep track of user connection id to color
  const socketColors = new Map<string, number>();
  // Keep track of which colors are already in use
  const usedColors = new Set<number>();

  game.onTick = (result) => {
    const packet: GameTickPacket = { tick: result.tick, changes: result.changes };
    io.emit(EVENTS.delta, packet);
    io.emit(EVENTS.status, status(game, io.engine.clientsCount));
  };

  io.on('connection', (socket) => {
    console.log('Client connected', socket.id);

    // Get an available color. Register it for this socket id and register it as "in use"
    const color = getAvailableColor(usedColors);
    usedColors.add(color);
    socketColors.set(socket.id, color);

    // Send snapshot & status info of the current game state to the newly connected client
    socket.emit(EVENTS.snapshot, snapshot(game, color));
    socket.emit(EVENTS.status, status(game, io.engine.clientsCount));

    // Register paint event sent from clients. This is how users interact with the board
    socket.on(EVENTS.paint, (payload: PaintPacket) => {
      const cells = payload?.cells;
      console.log("paint event", { cells })
      if (!Array.isArray(cells)) return;
      for (const cell of cells) {
        const { x, y } = cell;

        if (typeof x !== 'number' || typeof y !== 'number') {
          return;
        }

        if (!inBounds(x, y)) {
          return;
        }

        game.queuePaint(x, y, color);
      }
    });
  });

  return new Promise((resolve) => {
    httpServer.listen(port, () => {
      resolve({
        io,
        game,
        httpServer,
        close: () =>
          new Promise<void>((resolveClose) => {
            io.close(() => resolveClose());
          }),
      });
    });
  });
}

const PORT = Number(process.env.PORT ?? 3001);

if (process.env.NODE_ENV !== 'test') {
  startServer(PORT).then(() => {
    console.log(`[life:backend] listening on http://localhost:${PORT}`);
  });
}
