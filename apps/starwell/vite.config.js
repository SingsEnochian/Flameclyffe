import { cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const STARWELL_BASE = process.env.STARWELL_BASE || '/';
const REPO_ROOT = process.cwd();
const OUT_DIR = resolve(REPO_ROOT, 'dist/starwell');

const legacyPages = [
  ['observer-deep.html', 'observer-deep.html'],
  ['starwell/mobius-audio-bus.html', 'starwell/mobius-audio-bus.html'],
  ['starwell/elara-codex.html', 'starwell/elara-codex.html'],
  ['starwell/groundwire.html', 'starwell/groundwire.html'],
  ['starwell/deep-groundwire-mobius.html', 'starwell/deep-groundwire-mobius.html'],
];

function publishLegacyObservatoryPages() {
  return {
    name: 'publish-legacy-observatory-pages',
    apply: 'build',
    async closeBundle() {
      for (const [sourcePath, outputPath] of legacyPages) {
        const source = resolve(REPO_ROOT, sourcePath);
        const destination = resolve(OUT_DIR, outputPath);
        await mkdir(dirname(destination), { recursive: true });
        await cp(source, destination, { force: true });
      }

      await cp(resolve(REPO_ROOT, 'assets'), resolve(OUT_DIR, 'assets'), {
        recursive: true,
        force: true,
      });

      await cp(resolve(REPO_ROOT, 'resonance'), resolve(OUT_DIR, 'resonance'), {
        recursive: true,
        force: true,
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), publishLegacyObservatoryPages()],
  root: 'apps/starwell',
  base: STARWELL_BASE,
  build: {
    outDir: '../../dist/starwell',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(REPO_ROOT, 'apps/starwell/index.html'),
        livingRoom: resolve(REPO_ROOT, 'apps/starwell/living-room.html'),
        concordance: resolve(REPO_ROOT, 'apps/starwell/concordance/index.html'),
        bridgeRegistry: resolve(REPO_ROOT, 'apps/starwell/bridge-registry/index.html'),
        materialQa: resolve(REPO_ROOT, 'apps/starwell/material-qa.html'),
        unitResonanceLab: resolve(REPO_ROOT, 'apps/starwell/unit-resonance-lab.html'),
        scfeLab: resolve(REPO_ROOT, 'apps/starwell/scfe-lab.html'),
        temporalTwistRenderer: resolve(REPO_ROOT, 'apps/starwell/temporal-twist-renderer.html'),
        glyphStudio: resolve(REPO_ROOT, 'apps/starwell/glyph-studio/index.html'),
        signalWell: resolve(REPO_ROOT, 'apps/starwell/signal-well/index.html'),
      },
    },
  },
});