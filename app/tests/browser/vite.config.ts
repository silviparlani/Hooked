import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { fileURLToPath } from 'node:url';

const path = (value: string) => fileURLToPath(new URL(value, import.meta.url));

export default defineConfig({
  root: path('./fixtures'),
  plugins: [react()],
  css: { postcss: { plugins: [tailwindcss()] } },
  resolve: {
    alias: [
      { find: './use-projects', replacement: path('./fixtures/repository.ts') },
      { find: '@/lib/firebase/project-repository', replacement: path('./fixtures/repository.ts') },
      {
        find: '@/lib/firebase/project-parts-repository',
        replacement: path('./fixtures/repository.ts'),
      },
      { find: 'next/link', replacement: path('../mocks/next-link.tsx') },
      { find: '@', replacement: path('../../') },
    ],
  },
  server: { host: '127.0.0.1', port: 4174, strictPort: true },
});
