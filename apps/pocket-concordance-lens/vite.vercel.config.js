import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'apps/pocket-concordance-lens',
  base: '/concordance/',
  build: {
    outDir: '../../dist/starwell/concordance',
    emptyOutDir: false,
  },
});
