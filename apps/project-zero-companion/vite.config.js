import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const companionBase = process.env.PROJECT_ZERO_BASE || '/project-zero-companion/';

export default defineConfig({
  plugins: [react()],
  root: 'apps/project-zero-companion',
  base: companionBase,
  build: {
    outDir: '../../dist/project-zero-companion',
    emptyOutDir: true,
  },
  server: {
    host: '127.0.0.1',
    port: 5177,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4177,
    strictPort: true,
  },
});
