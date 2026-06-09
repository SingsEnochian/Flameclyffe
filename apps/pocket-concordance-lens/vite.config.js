import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'apps/pocket-concordance-lens',
  base: '/Flameclyffe/pocket-concordance-lens/',
  build: {
    outDir: '../../dist/pocket-concordance-lens',
    emptyOutDir: true,
  },
});
