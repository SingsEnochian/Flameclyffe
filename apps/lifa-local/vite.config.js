import { defineConfig } from 'vite';

export default defineConfig({
  root: 'apps/lifa-local',
  base: './',
  build: {
    outDir: '../../dist/lifa-local',
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
