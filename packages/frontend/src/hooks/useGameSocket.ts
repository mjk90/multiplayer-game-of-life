import { EVENTS, GameSnapshot, GRID_SIZE, StatusPacket } from '@life/shared';
import { useEffect, useRef, useState } from 'react';

import { io, Socket } from 'socket.io-client';

export enum ConnectionState {
  Connected = 'connected',
  Connecting = 'connecting',
  Disconnected = 'disconnected',
}

export function useGameSocket() {
  const socketRef = useRef<Socket | null>(null);

  const [grid, setGrid] = useState<Uint32Array>(() => new Uint32Array(GRID_SIZE));
  const [tick, setTick] = useState(0);
  const [myColor, setMyColor] = useState(0);
  const [status, setStatus] = useState<StatusPacket>({ running: false, online: 0 });
  const [connectionState, setConnectionState] = useState(ConnectionState.Connecting);

  useEffect(() => {
    console.log('Connecting to game server...');
    const socket = io({ transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnectionState(ConnectionState.Connected));
    socket.on('disconnect', () => setConnectionState(ConnectionState.Disconnected));

    socket.on(EVENTS.snapshot, (snap: GameSnapshot) => {
      setGrid(Uint32Array.from(snap.cells));
      setTick(snap.tick);
      setMyColor(snap.clientColor);
    });

    socket.on(EVENTS.status, (status: StatusPacket) => setStatus({ running: status.running, online: status.online }));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return {  grid, tick, myColor, status, connectionState };
}
