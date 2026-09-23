import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
      'next/image': fileURLToPath(new URL('./tests/mocks/next-image.tsx', import.meta.url)),
      'next/link': fileURLToPath(new URL('./tests/mocks/next-link.tsx', import.meta.url)),
      'next/navigation': fileURLToPath(
        new URL('./tests/mocks/next-navigation.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'jsdom',
    exclude: [
      'tests/e2e/**',
      'tests/browser/**',
      '.wrangler/**',
      'tests/firebase/**',
      'node_modules/**',
    ],
    setupFiles: ['./tests/setup.ts'],
  },
});
