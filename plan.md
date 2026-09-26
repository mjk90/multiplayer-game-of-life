# Project Plan: Multiplayer Conway's Game of Life

- Monorepo using NPM workspaces, containing 3 packages: shared, backend, frontend. All using TypeScript.
    - shared: TypeScript only package containing shared interfaces, types, constants, functions
    - backend: Nodejs server, containing server setup, websocket functionality with user events and centralized game logic in a dedicated class
    - frontend: Reactjs UI with a canvas for displaying the game board

## Stack
- TypeScript for all packages
- vitest for unit tests (shared & backend)
- socket.io for websocket functionality (backend server & frontend client)
- vite as build tool & dev server for frontend

## Architecture / decisions / assumptions
- Backend is the centralized source of truth. Each tick of the game is computed here and communicated to all connected clients. Frontend only sends player actions and receives game state
    - When client connects, backend sends a snapshot of the game, after that is sends only deltas
- Game board is a grid of x by x dimensions (defined in shared as constants). The board wraps on x and y, so if a shape moves beyond BOARD_WIDTH, it appears back at 0
- This will support a single board which all players access at the same time. No rooms or player auth, this is an MVP. The board starts in a blank state
- Player input is done by clicking/dragging. When a player clicks/drags across the board, their celeted cells are send to the backend and queued up for the next game tick
- Game state is stored in memory as a flat int array, showing the color of each cell
- No player identity for now. Limited to color only for simplicity

## Socket.io events
- backend to frontend
    - snapshot(tick, width, height, cells, color)
    - tick(tick, changes)
- frontend to backend
    - Paint(cells)

## Implementation
1. Create monorepo project structure, install dependencies mentioned above
2. Create basic nodejs server in backend, initialize socke.io server
3. Create blank Game class in backend. Include empty int array for game state and empty tick loop
4. Create react frontend with vite. Add basic useGameSocket hook which initializes socket.io connection
5. Add empty canvas component with mouse down and mouse up events