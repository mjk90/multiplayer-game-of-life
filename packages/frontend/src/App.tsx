import { ConnectionState, useGameSocket } from './hooks/useGameSocket';
import { GameBoard } from './components/GameBoard';
import { colorToCss } from '@life/shared';
import { Controls } from './components/Controls';

export default function App() {
  const {
    grid, 
    tick, 
    myColor, 
    status, 
    connectionState,
    toggleConnection,
    paint,
    clear,
    placePattern
  } = useGameSocket();

  return (
    <main className="app">
      <header className="app-header">
        <h1>Multiplayer Game of Life</h1>
        <div className="app-header-right">
          <span
            className="swatch"
            style={{ backgroundColor: colorToCss(myColor) }}
            title="Your color"
          />
          <span onClick={toggleConnection}
            className={`status-badge ${connectionState === ConnectionState.Connected ? 'is-online' : connectionState === ConnectionState.Connecting ? 'is-connecting' : 'is-offline'}`}>
            {connectionState === ConnectionState.Connecting ? 'connecting…' : connectionState}
          </span>
        </div>
      </header>
      
      <GameBoard grid={grid} onPaint={paint} />

      <div className="controls-container flex flex-row justify-between">
        <Controls onClear={clear} onPlacePattern={placePattern} />
      </div>
      
      <footer className="app-footer">
        <span>generation {tick}</span>
        <span>{status.online} online</span>
      </footer>
    </main>
  );
}
