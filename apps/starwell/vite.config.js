import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const STARWELL_BASE = process.env.STARWELL_BASE || '/';

export default defineConfig({
  plugins: [react()],
  root: 'apps/starwell',
  base: STARWELL_BASE,
  build: {
    outDir: '../../dist/starwell',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'apps/starwell/index.html'),
        livingRoom: resolve(process.cwd(), 'apps/starwell/living-room.html'),
        concordance: resolve(process.cwd(), 'apps/starwell/concordance/index.html'),
        materialQa: resolve(process.cwd(), 'apps/starwell/material-qa.html'),
        unitResonanceLab: resolve(process.cwd(), 'apps/starwell/unit-resonance-lab.html'),
      },
    },
  },
});
