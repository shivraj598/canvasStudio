import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // node:sqlite (the development store) prints an ExperimentalWarning in every worker.
    execArgv: ['--disable-warning=ExperimentalWarning'],
  },
});
