import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import { getProductionAblyKey } from './src/config/ably-key.js';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  if (mode === 'production') {
    const environment = loadEnv(mode, process.cwd(), '');
    getProductionAblyKey(environment.ABLY_KEY);
  }

  return {
    envPrefix: ['VITE_', 'ABLY_'],
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './test/setup.ts',
    },
  };
});
