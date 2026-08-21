import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: 'apps/arcsweep',
  base: './',
  build: {
    outDir: '../../dist/arcsweep',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        arcsweep: `${rootDir}index.html`,
        varutoraGate: `${rootDir}varutora-gate.html`,
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5184,
    strictPort: true,
    proxy: {
      '/api/v1': 'http://127.0.0.1:3000',
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 4184,
    strictPort: true,
  },
});
