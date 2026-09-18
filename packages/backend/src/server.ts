import { createServer, Server as HttpServer } from 'node:http';
import { Server as SocketIoServer } from 'socket.io';
import { Game } from './game';

export interface GameServer {
  io: SocketIoServer;
  game: Game;
  httpServer: HttpServer;
  close: () => Promise<void>;
}

export function startServer(port = 3001): Promise<GameServer> {
  const httpServer = createServer();
  const corsOptions = process.env.NODE_ENV === 'PROD' ? undefined : { origin: '*' };
  const io = new SocketIoServer(httpServer, { cors: corsOptions });
  const game = new Game();

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
