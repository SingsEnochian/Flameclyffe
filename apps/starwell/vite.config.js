import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'apps/starwell',
  base: '/Flameclyffe/starwell/',
  build: {
    outDir: '../../dist/starwell',
    emptyOutDir: true,
    rollupOptions: {
      input: 'apps/starwell/index.html',
    },
  },
});
