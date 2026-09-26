# Multiplayer Game of Life

A real-time, multiplayer implementation of Conway's Game of Life. Multiple players share a single board (which wraps on x and y axis) and paint cells in their own colour, while the server advances the simulation and streams only the cells that changed to every client.

## Contents

- [Problem and solution](#problem-and-solution)
- [Getting started](#getting-started)
- [Usage](#usage)
- [Testing](#testing)
- [Building](#building)
- [Deployment](#deployment)
- [Technical choices](#technical-choices)
- [Trade-offs and limitations](#trade-offs-and-limitations)
- [What I would do with more time](#what-i-would-do-with-more-time)

---

## Problem & solution

**Problem.** Create a multiplayer Web app version of Conway's Game of Life

**Solution.** A monorepo with three npm workspaces:

- `@life/shared` — types, constants, and helpers shared by the client and server
- `@life/backend` — a Node.js + Socket.IO server that owns the board, applies player paints, runs the simulation on a fixed tick, and broadcasts deltas to all clients
- `@life/frontend` — a React + Vite client that renders the board on a `<canvas>` and sends the player's paint/clear/pattern actions

The server is the single source of truth. On connection a client receives a full snapshot; after that it receives only per-tick **deltas** (the cells that changed). This keeps updates small and avoids resending the whole 200×200 board every generation.

### How the simulation works

- The board is `200 × 200` (40,000 cells) with **toroidal wrapping** (edges connect to the opposite edge).
- Each cell stores a packed 24-bit RGB colour in a `Uint32Array`; `0` means dead.
- Every tick (default `25 ms`, configurable via `TICK_INTERVAL_MS`) the server:
  1. applies queued paint/pattern actions,
  2. computes the next generation using Conway's rules,
  3. diffs old vs new board
  4. broadcasts only the changed cells
- A dead cell born from three neighbours takes the **average colour** of those neighbours; surviving cells keep their colour.

### Packages

| Package | Role | Key dependencies |
| --- | --- | --- |
| `@life/shared` | Types, events, grid/colour helpers, patterns | no runtime dependencies |
| `@life/backend` | Authoritative game state + Socket.IO server | `socket.io`, `tsx`, `tsup`, `vitest` |
| `@life/frontend` | React UI + canvas rendering | `react`, `vite`, `socket.io-client` |

### Communication model

| Event | Direction | Payload | Purpose |
| --- | --- | --- | --- |
| `snapshot` | server → client | full board + `clientColor` | initial state on connect |
| `delta` | server → client | changed cells | incremental updates each tick |
| `status` | server → client | `{ running, online }` | game status + player count |
| `paint` | client → server | list of cells | player paints cells |
| `clear` | client → server | — | player clears the board |
| `placePattern` | client → server | pattern name | server places a pattern at a random spot |

Event names are defined once in `@life/shared` and imported by both sides, so client and server cannot drift apart.

---

## Getting started

### Prerequisites

- Node.js 22+ (development)
- npm 10+
- Docker + Docker Compose (optional, for the one-command deployment)

### Install

```bash
npm install
```

### Run in development

```bash
npm run dev
```

This starts, concurrently:

- the backend with `tsx watch` on <http://localhost:3001>
- the Vite dev server on <http://localhost:5173>

Vite proxies `/socket.io` WebSocket traffic to the backend, so the frontend always talks to the same origin.

Open <http://localhost:5173>

---

## Usage

- Click and drag on the board to paint cells in your colour.
- Use the **Clear** button to empty the board.
- Use the pattern buttons (`beehive`, `blinker`, `mwss`, `pulsar`) to drop a predefined pattern at a random location.
- The header shows your assigned colour and connection status; the footer shows the current generation and the number of players online.
- The connection status badge can be clicked to disconnect/reconnect.

---

## Testing

All tests use [Vitest](https://vitest.dev/).

```bash
npm test
```

This runs the `test` script in every workspace that defines one.

Coverage includes:

- **`@life/shared`** — grid indexing/wrapping/bounds, colour packing/unpacking, `cellsInLine` (Bresenham), `calculateDelta`, and pattern validity.
- **`@life/backend`** — Conway rules (birth, survival, under/overpopulation), toroidal wrapping, colour averaging, delta generation, queued paints, clearing, the timer loop, and colour assignment/grace-period reclamation (`ColorRegistry`).

Run a single package:

```bash
npm run test --workspace @life/backend
npm run test --workspace @life/shared
```

### Continuous integration

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push to `main` and every pull request. It installs dependencies with `npm ci`, then runs `npm test` and `npm run build`.

> The check is informational on this private repository; blocking merges on it requires branch protection (a Team/Enterprise GitHub plan).

---

## Building

```bash
npm run build
```

This builds the packages in dependency order:

1. `@life/shared` — `tsc` (type declarations to `dist`).
2. `@life/backend` — `tsc --noEmit` (typecheck) then `tsup` (bundles `src/server.ts` + `@life/shared` into `dist/server.js`).
3. `@life/frontend` — `tsc --noEmit` then `vite build` (static assets to `dist`).

### Why the backend is bundled

Plain `tsc` output was not directly runnable by Node for two reasons:

1. Node ESM requires explicit extensions on relative imports (`./game.js`), but `tsc` under `bundler` resolution preserves extensionless imports (`./game`).
2. `@life/shared`'s package entry points at TypeScript source (`src/index.ts`), which plain Node cannot execute.

`tsup` resolves both at build time and emits a runnable `dist/server.js`, so production runs:

```bash
node packages/backend/dist/server.js
```

Development still uses `tsx watch src/server.ts`, which handles TypeScript directly.

---

## Deployment

The supported production deployment is Docker Compose.

```bash
docker compose up --build
```

The app is then available at <http://localhost:8080>.

### What it runs

| Service | Image/Stage | Notes |
| --- | --- | --- |
| `backend` | `node:22-alpine` + tsup bundle | Socket.IO server on internal port `3001` |
| `frontend` | `nginx:1.27-alpine` | Serves the static Vite build and proxies `/socket.io` to `backend` |

- The backend is **not published** to the host; only the frontend container can reach it over the private Docker network.
- nginx serves the SPA (`try_files ... /index.html`) and forwards WebSocket upgrades for Socket.IO.
- `.dockerignore` keeps `node_modules`, `dist`, and build state out of the build context.

Stop the stack:

```bash
docker compose down
```

For a detailed walkthrough of the Docker setup, see [`Docker.md`](Docker.md).

---

## Technical choices

### Monorepo with a shared package

The grid, event names, colour encoding, and patterns must be identical on both sides (a cell index on the client must mean the same cell on the server). Keeping them in `@life/shared` is a single source of truth and eliminates client/server drift.

### Socket.IO

Socket.IO provides:

- WebSocket transport (with fallback) for low-latency bidirectional updates.
- Automatic reconnection, which matters when the server restarts in dev or a client drops.
- Named events, so the protocol is explicit.

### Player identity and colour grace period

Each tab generates a random UUID stored in `sessionStorage` and sends it as Socket.IO `auth.playerId`. Because `sessionStorage` is scoped per tab, each tab is its own player, while a reload within the same tab reuses the id. The backend uses the id to remember the player's colour across reconnects: when the player disconnects, their colour is held for 30 seconds and reclaimed if they reconnect in time. Anonymous clients (no player id) release their colour immediately.

### Delta updates instead of full snapshots

Sending the full 40,000-cell board every tick is wasteful. The server computes the changed cells and broadcasts only those. Clients start from a snapshot and apply deltas.

### Packed colours and typed arrays

Each cell is one 24-bit integer in a `Uint32Array`. This is memory-efficient, cache-friendly for the per-tick scan, and trivially serializable for Socket.IO. A dead cell is `0`.
At 200×200, we could use a 2D array without noticeable performance impact, but this makes it more scalable with not much added complexity (just the `indexOf` helper function).

### React + Vite + Canvas

The board is a single `<canvas>` redrawn when the grid changes, rather than thousands of DOM nodes. Vite gives fast development and a small production bundle. React manages connection state, colour, and controls.

### Backend dev vs production

- **Dev:** `tsx watch` runs TypeScript directly, giving instant restarts.
- **Prod:** `tsup` bundles the server into runnable ESM (see [Building](#building)).

### nginx in production

nginx serves the static bundle efficiently and proxies the Socket.IO WebSocket to the backend on the same origin, avoiding CORS in production.

---

## Trade-offs and limitations

- **Single process, in-memory state.** The board lives in one Node process. Restarting the server clears the board, and the game cannot be scaled horizontally as-is. Multi-server support would require moving state to a shared store (e.g. Redis) and a Socket.IO adapter. For the requirements of this project, this kind of scalability is not needed.
- **Full-board scan each tick.** Computing the next generation scans all 40,000 cells every 25 ms. This is well within a single process's budget for the current board size, but it does not scale to much larger boards without optimisation (e.g. tracking only live cells and their neighbours).
    - A full board scan was the simplest working implementation for this demo. If we wanted to support much larger boards and even lower tick intervals, we could use a set of live cells and their neighbours.
- **No persistence.** Players' colours, board state, and generations are lost on restart.
- **No auth or rate limiting.** `paint` and `clear` are trusted after basic bounds validation. A production service would add identity, per-player quotas, and abuse protection, as well as using something like cloudflare to gate everything.
- **CORS is permissive in development.** Dev uses a wildcard because the Vite origin differs from the backend. Production relies on same-origin proxying through nginx; the backend's production CORS handling is still marked `TODO`.
- **Random pattern placement.** Patterns drop at random coordinates; there is no click-to-place UI.
- **Fixed pattern orientation.** Patterns spawn in a single hard-coded orientation, so they always point the same way. A future improvement would randomize (or allow rotating) the orientation at placement time.
- **No end-to-end tests.** The game logic and helpers are unit-tested, but the real socket wiring and browser interactions are not covered by an automated E2E suite.
- **Fixed board size.** `GRID_WIDTH`/`GRID_HEIGHT` are compile-time constants rather than server-provided, because the client and server must agree on them. This is intentional to avoid drift; making it dynamic would require the client to adopt the server's dimensions from the snapshot.

---

## What I would do with more time

- **Horizontal scaling:** a Socket.IO Redis adapter plus authoritative game state in a shared store, with one tick driver or a distributed consensus approach.
- **Smarter simulation:** maintain a set of live cells and only evaluate their neighbourhoods, enabling much larger boards.
- **Hardened networking:** authentication, per-socket rate limits, and a proper production CORS policy.
- **End-to-end tests** with Playwright: open two browsers, paint from both, and assert both converge to the same board.
- **Observability:** structured logs, metrics (ticks/sec, connected clients, delta sizes), and health endpoints. Set up prometheus/grafana to watch metrics.
- **Richer gameplay:** click-to-place patterns, multiple rooms/boards, persistence and replay of games, spectator mode, and adjustable speed. Add some kind of goal (eg. control x% of the board)
- **Dynamic board dimensions:** have the client adopt `width`/`height` from the snapshot so the board size is controlled only by the server. The dimensions could then be set from the backend config without code changes.
- **Extend CI:** build and publish the Docker images as part of the pipeline.

---

## Repository layout

```text
.
├── .github/
│   └── workflows/
│       └── ci.yml            # GitHub Actions CI
├── Dockerfile
├── docker-compose.yml
├── Docker.md                 # detailed Docker explanation
├── package.json              # workspaces + root scripts
└── packages/
    ├── backend/              # Socket.IO server + game engine
    │   └── src/
    │       ├── colorRegistry.ts  # player colour assignment/grace period
    │       ├── game.ts       # Game class (board, ticks, rules)
    │       └── server.ts     # HTTP + Socket.IO wiring
    ├── frontend/             # React client
    │   └── src/
    │       ├── App.tsx
    │       ├── components/   # GameBoard, Controls
    │       ├── hooks/        # useGameSocket
    │       └── helpers/      # canvas drawing
    └── shared/               # shared types, constants, helpers
        └── src/index.ts
```
