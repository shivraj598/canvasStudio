import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  clean: true,
  sourcemap: true,
  // @canvas/shared ships TypeScript source, so bundle it into the server build.
  noExternal: ['@canvas/shared'],
});
