import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      BOT_MIN_DELAY_MS: '0',
      BOT_MAX_DELAY_MS: '0',
    },
  },
});
