# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Shared dependency install (npm workspaces)
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app

# Copy workspace manifests first so npm ci is cached unless dependencies change.
COPY package.json package-lock.json ./
COPY packages/backend/package.json packages/backend/package.json
COPY packages/frontend/package.json packages/frontend/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci

# ---------------------------------------------------------------------------
# Backend: bundle the TypeScript source into runnable ESM with tsup
# ---------------------------------------------------------------------------
FROM deps AS backend

COPY packages/backend packages/backend
COPY packages/shared packages/shared

RUN npm run build --workspace @life/shared && npm run build --workspace @life/backend

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["node", "packages/backend/dist/server.js"]

# ---------------------------------------------------------------------------
# Frontend: build the static bundle with Vite
# ---------------------------------------------------------------------------
FROM deps AS frontend-build

COPY packages packages

RUN npm run build --workspace @life/frontend

# ---------------------------------------------------------------------------
# Frontend runtime: nginx serving the bundle and proxying socket.io
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS frontend

COPY --from=frontend-build /app/packages/frontend/dist /usr/share/nginx/html
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
