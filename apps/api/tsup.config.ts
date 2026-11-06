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
  // Keep `node:` prefixes: `node:sqlite` has no unprefixed form.
  removeNodeProtocol: false,
});
