import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  target: 'node22',
  // Bundle the shared workspace package from source so the output is self-contained for that code. Other npm dependencies (e.g. socket.io) stay external.
  noExternal: ['@life/shared'],
});
