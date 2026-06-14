import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'apps/starwell',
  base: '/Flameclyffe/starwell-react-lab/',
  build: {
    outDir: '../../dist/starwell',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'apps/starwell/index.html'),
        materialQa: resolve(process.cwd(), 'apps/starwell/material-qa.html'),
      },
    },
  },
});
