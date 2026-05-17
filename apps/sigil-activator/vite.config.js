import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'apps/sigil-activator',
  base: '/Flameclyffe/sigil-activator-react/',
  build: {
    outDir: '../../dist/sigil-activator',
    emptyOutDir: true,
  },
});
