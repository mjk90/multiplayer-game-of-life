import { useEffect } from 'react';
import { ConnectionState, useGameSocket } from './hooks/useGameSocket';

export default function App() {
  const {
    grid, 
    tick, 
    myColor, 
    status, 
    connectionState,
    toggleConnection
  } = useGameSocket();

  useEffect(() => {
    console.log('Game state updated', { grid, tick, myColor, status, connectionState });
  }, [grid, tick, myColor, status, connectionState]);

  return (
    <main className="app">
      <header className="app-header">
        <h1>Multiplayer Game of Life</h1>
        <div className="app-header-right">
          <span onClick={toggleConnection}
            className={`status-badge ${connectionState === ConnectionState.Connected ? 'is-online' : connectionState === ConnectionState.Connecting ? 'is-connecting' : 'is-offline'}`}>
            {connectionState === ConnectionState.Connecting ? 'connecting…' : connectionState}
          </span>
        </div>
      </header>

      <footer className="app-footer">
        <span>generation {tick}</span>
        <span>{status.online} online</span>
      </footer>
    </main>
  );
}
