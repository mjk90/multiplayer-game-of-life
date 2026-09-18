import { useGameSocket } from './hooks/useGameSocket';

export default function App() {
  const { connected } = useGameSocket();

  return (
    <main className="app">
      <header className="app-header">
        <h1>Multiplayer Game of Life</h1>
        <div className="app-header-right">
          <span className={`status-badge ${connected ? 'is-online' : 'is-offline'}`}>
            {connected ? 'connected' : 'connecting…'}
          </span>
        </div>
      </header>
    </main>
  );
}
