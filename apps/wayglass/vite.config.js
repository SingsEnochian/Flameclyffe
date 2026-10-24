import { defineConfig } from 'vite';

export default defineConfig({
  root: 'apps/wayglass',
  base: './',
  build: {
    outDir: '../../dist/wayglass',
    emptyOutDir: true,
  },
  server: {
    host: '127.0.0.1',
    port: 5186,
    strictPort: true,
    proxy: {
      '/api/v1': 'http://127.0.0.1:3000',
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 4186,
    strictPort: true,
  },
});
