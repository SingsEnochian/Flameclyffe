import { defineConfig } from 'vite';

export default defineConfig({
  root: 'apps/arcsweep',
  base: './',
  build: {
    outDir: '../../dist/arcsweep',
    emptyOutDir: true,
  },
  server: {
    host: '127.0.0.1',
    port: 5184,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4184,
    strictPort: true,
  },
});
