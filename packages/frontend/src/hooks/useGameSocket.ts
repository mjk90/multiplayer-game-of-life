import { EVENTS, GameSnapshot, GameTickPacket, GRID_SIZE, PaintPacket, StatusPacket } from '@life/shared';
import { useEffect, useRef, useState } from 'react';

import { io, Socket } from 'socket.io-client';

export enum ConnectionState {
  Connected = 'connected',
  Connecting = 'connecting',
  Disconnected = 'disconnected',
}

const PLAYER_ID_KEY = 'life-player-id';

function getPlayerId(): string {
  const existing = sessionStorage.getItem(PLAYER_ID_KEY);
  if (existing) return existing;

  const id = crypto.randomUUID();

  sessionStorage.setItem(PLAYER_ID_KEY, id);
  return id;
}

export interface GameSocketApi {
  grid: Uint32Array;
  tick: number;
  myColor: number;
  status: StatusPacket;
  connectionState: ConnectionState;
  toggleConnection: () => void;
  clear: () => void;
  placePattern: (name: string) => void;
}

export function useGameSocket() {
  const socketRef = useRef<Socket | null>(null);
  const lastTickRef = useRef(-1);

  const [grid, setGrid] = useState<Uint32Array>(() => new Uint32Array(GRID_SIZE));
  const [tick, setTick] = useState(0);
  const [myColor, setMyColor] = useState(0);
  const [status, setStatus] = useState<StatusPacket>({ running: false, online: 0 });
  const [connectionState, setConnectionState] = useState(ConnectionState.Connecting);

  useEffect(() => {
    console.log('Connecting to game server...');
    const socket = io({
      transports: ['websocket'],
      auth: { playerId: getPlayerId() },
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnectionState(ConnectionState.Connected));
    socket.on('disconnect', () => setConnectionState(ConnectionState.Disconnected));

    socket.on(EVENTS.snapshot, (snap: GameSnapshot) => {
      setGrid(Uint32Array.from(snap.cells));
      setTick(snap.tick);
      setMyColor(snap.clientColor);
      lastTickRef.current = snap.tick;
    });

    socket.on(EVENTS.status, (status: StatusPacket) => setStatus({ running: status.running, online: status.online }));

    socket.on(EVENTS.delta, (packet: GameTickPacket) => {
      if (packet.tick <= lastTickRef.current) return; // avoid stale or duplicate deltas

      lastTickRef.current = packet.tick;
      setTick(packet.tick);
      setGrid((prev) => {
        const next = new Uint32Array(prev);
        for (const change of packet.changes) {
          next[change.i] = change.color;
        }
        return next;
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const paint = (paintPacket: PaintPacket) => {
    socketRef.current?.emit(EVENTS.paint, paintPacket);
  };

  const clear = () => socketRef.current?.emit(EVENTS.clear);

  const placePattern = (name: string) => {
    socketRef.current?.emit(EVENTS.placePattern, { name });
  };

  const toggleConnection = () => {
    if (socketRef.current?.connected) {
      setConnectionState(ConnectionState.Disconnected);
      socketRef.current.disconnect();
    } else {
      setConnectionState(ConnectionState.Connecting);
      socketRef.current?.connect();
    }
  }

  return { grid, tick, myColor, status, connectionState, toggleConnection, paint, clear, placePattern };
}
