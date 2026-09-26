import { createServer, Server as HttpServer } from 'node:http';
import { Server as SocketIoServer } from 'socket.io';
import { Game } from './game';
import { ColorRegistry } from './colorRegistry';
import { EVENTS, GameSnapshot, GameTickPacket, GRID_HEIGHT, GRID_WIDTH, inBounds, PaintPacket, PATTERNS, PlacePatternPacket, StatusPacket, wrapX, wrapY } from '@life/shared';

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

export function startServer(port = 3001): Promise<GameServer> {
  const httpServer = createServer();
  // TODO: Update CORS for prod to allow frontend to connect only
  const corsOptions = process.env.NODE_ENV === 'production' ? undefined : { origin: '*' };
  const io = new SocketIoServer(httpServer, { cors: corsOptions });
  const game = new Game();
  game.start();

  // Assigns and reclaims player colours across reconnects.
  const colors = new ColorRegistry();

  game.onTick = (result) => {
    const packet: GameTickPacket = { tick: result.tick, changes: result.changes };
    io.emit(EVENTS.delta, packet);
    io.emit(EVENTS.status, status(game, io.engine.clientsCount));
  };

  io.on('connection', (socket) => {
    console.log('Client connected', socket.id);

    const playerId =
      typeof socket.handshake.auth?.playerId === 'string' && socket.handshake.auth.playerId
        ? socket.handshake.auth.playerId
        : undefined;

    const color = colors.register(playerId);
    socket.data.color = color;

    // Send snapshot & status info of the current game state to the newly connected client
    socket.emit(EVENTS.snapshot, snapshot(game, color));
    socket.emit(EVENTS.status, status(game, io.engine.clientsCount));

    // Register paint event sent from clients. This is how users interact with the board
    socket.on(EVENTS.paint, (payload: PaintPacket) => {
      const cells = payload?.cells;
      if (!Array.isArray(cells)) return;

      for (const cell of cells) {
        const { x, y } = cell;

        if (typeof x !== 'number' || typeof y !== 'number') {
          continue;
        }

        if (!inBounds(x, y)) {
          continue;
        }

        game.queuePaint(x, y, color);
      }
    });

    socket.on(EVENTS.clear, () => {
      // Clear game state and emit new empty snapshot to all clients
      game.clear();
      for (const s of io.sockets.sockets.values()) {
        const color = (s.data.color as number | undefined) ?? 0;
        s.emit(EVENTS.snapshot, snapshot(game, color));
      }
      io.emit(EVENTS.status, status(game, io.engine.clientsCount));
    });

    socket.on(EVENTS.placePattern, (payload: PlacePatternPacket) => {
      // Validate that this is a supported pattern name
      const pattern = PATTERNS[payload?.name];
      if (!pattern) return;

      // Get a random x and y to place the pattern
      const originX = Math.floor(Math.random() * GRID_WIDTH);
      const originY = Math.floor(Math.random() * GRID_HEIGHT);
      
      for (const cell of pattern) {
        game.queuePaint(wrapX(originX + cell.x), wrapY(originY + cell.y), color);
      }
    });

    socket.on('disconnect', () => {
      colors.unregister(playerId, color);
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
