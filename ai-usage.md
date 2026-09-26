# AI Usage

This project used AI assistance (GitHub Copilot) for parts of the implementation and documentation. This file documents what was used, how it was used, and what was written by hand versus delegated.

## Tools used

| What | Details |
| --- | --- |
| Harness | GitHub Copilot Chat in VS Code |
| Model | DeepSeek V4 Pro |
| Skills / agents | None — only the standard Copilot file-editing, search, and terminal tools were used |
| Verification | `npm test`, `npm run build`, `docker compose build/up`, and manual browser/curl checks |

## Overall workflow

The work happened in roughly this order:

1. **`plan.md` (me)** — I wrote the project plan: monorepo structure, stack choices (TypeScript, Vitest, Socket.IO, Vite), architecture/assumptions, the Socket.IO event protocol, and implementation steps.

2. **Initial scaffold (Copilot)** — I had Copilot create the npm-workspaces monorepo and the three packages from that plan: a basic Node + Socket.IO server, a blank `Game` class, and the React/Vite frontend with the empty `useGameSocket` hook and canvas component.

3. **Core game and frontend logic (me)** — I then filled in the implementation by hand: the Conway rules, tick loop, queued paints, and delta computation in `Game`, the Socket.IO connection/event handlers, the initial shared types/constants/helpers, and the frontend logic.

4. **Building around that core (Copilot)** — Copilot also helped with additions and fixes around the core:

   - Diagnosing and fixing build/type issues (e.g. duplicate Vite versions).
   - Writing and expanding unit tests.
   - Assisting in up Docker setup (Dockerfile, nginx config).
   - Introducing the tsup bundler for the production backend build.
   - Adding the GitHub Actions CI workflow.

Each AI-produced change was reviewed, often simplified or corrected, and verified with the test/build commands before committing.

## Key prompts (summarized)

These are summarized by topic rather than verbatim. The bulk of the work happened across several Copilot chat sessions.

**Project Setup**

- "Create a monorepo based on plan.md. Start with implementation step 1"
- "Proceed to step 3. Also add basic unit test setup for the game class"

**Build and tooling**

- "No overload matches this call" (Vite `Plugin` type mismatch) → diagnosed duplicate Vite installs and aligned the workspace on Vite 7.3.6.
- "In `package.json`, we need to build shared before the other packages" → made the root build script build `@life/shared` first.
- "The compiled ESM output uses extensionless imports…" discussion → moved the backend build to `tsup` so `node dist/server.js` runs without `tsx`.

**Testing**

- "Create initial blank unit tests for game class and shared module"
- "Based on existing game class tests for computeNextGeneration, add cases for each of the new player patterns"
- "Take a look at our unit tests. Are we missing anything?" → added coverage for shared helpers, Conway edge cases, and a `clear()` bug fix.

**Deployment and docs**

- "Let's add a dockerfile based on the docker-compose to build backend and frontend services. They should use lightweight images and share a network"
- "Add github CI to run unit tests and report status"
- "Verify my changes to README. Correct any incorrect spellings. Let me know if I left any old information in there"
