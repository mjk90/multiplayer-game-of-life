import { createServer, Server as HttpServer } from 'node:http';
import { Server as SocketIoServer } from 'socket.io';
import { Game } from './game';
import { EVENTS, GameSnapshot, GRID_HEIGHT, GRID_WIDTH, PALETTE, StatusPacket } from '@life/shared';

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
  const corsOptions = process.env.NODE_ENV === 'PROD' ? undefined : { origin: '*' };
  const io = new SocketIoServer(httpServer, { cors: corsOptions });
  const game = new Game();
  game.start();

  io.on('connection', (socket) => {
    console.log('Client connected', socket.id);
    const color = PALETTE[0]; // TODO: assign a unique color to each client

    // Send snapshot & status info of the current game state to the newly connected client
    socket.emit(EVENTS.snapshot, snapshot(game, color));
    socket.emit(EVENTS.status, status(game, io.engine.clientsCount));
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
