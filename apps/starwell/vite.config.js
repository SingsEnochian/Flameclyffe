import { cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const STARWELL_BASE = process.env.STARWELL_BASE || '/';
const STARWELL_BASE_SLASH = STARWELL_BASE.endsWith('/') ? STARWELL_BASE : `${STARWELL_BASE}/`;
const REPO_ROOT = process.cwd();
const OUT_DIR = resolve(REPO_ROOT, 'dist/starwell');

const legacyPages = [
  ['observer-deep.html', 'observer-deep.html'],
  ['starwell/mobius-audio-bus.html', 'starwell/mobius-audio-bus.html'],
  ['starwell/elara-codex.html', 'starwell/elara-codex.html'],
  ['starwell/groundwire.html', 'starwell/groundwire.html'],
  ['starwell/deep-groundwire-mobius.html', 'starwell/deep-groundwire-mobius.html'],
];

function injectArcsweepShell() {
  return {
    name: 'inject-arcsweep-global-shell',
    transformIndexHtml() {
      return [
        {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: `${STARWELL_BASE_SLASH}shell/arcsweep-shell.css`,
            'data-arcsweep-shell-asset': 'style',
          },
          injectTo: 'head',
        },
        {
          tag: 'script',
          attrs: {
            type: 'module',
            src: `${STARWELL_BASE_SLASH}shell/arcsweep-shell.js`,
            'data-arcsweep-shell-asset': 'runtime',
          },
          injectTo: 'head',
        },
      ];
    },
  };
}

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

      await cp(
        resolve(REPO_ROOT, 'starwell/deep-observer'),
        resolve(OUT_DIR, 'starwell/deep-observer'),
        {
          recursive: true,
          force: true,
        },
      );

      await cp(resolve(REPO_ROOT, 'assets'), resolve(OUT_DIR, 'assets'), {
        recursive: true,
        force: true,
      });

      await cp(resolve(REPO_ROOT, 'resonance'), resolve(OUT_DIR, 'resonance'), {
        recursive: true,
        force: true,
      });

      await cp(
        resolve(REPO_ROOT, 'starwell/deep-observer/schemas'),
        resolve(OUT_DIR, 'schemas'),
        {
          recursive: true,
          force: true,
        },
      );

      // Deep Observer (The Laboratory) — served at /starwell/deep-observer/
      await mkdir(resolve(OUT_DIR, 'deep-observer'), { recursive: true });
      await cp(resolve(REPO_ROOT, 'starwell', 'deep-observer'), resolve(OUT_DIR, 'deep-observer'), {
        recursive: true,
        force: true,
      });

      // Hearthgate house landing — served at /starwell/hearthgate/
      await mkdir(resolve(OUT_DIR, 'hearthgate'), { recursive: true });
      await cp(resolve(REPO_ROOT, 'starwell', 'hearthgate'), resolve(OUT_DIR, 'hearthgate'), {
        recursive: true,
        force: true,
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), injectArcsweepShell(), publishLegacyObservatoryPages()],
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
        bifrost: resolve(REPO_ROOT, 'apps/starwell/bifrost/index.html'),
        arcsweepContinuity: resolve(REPO_ROOT, 'apps/starwell/arcsweep-continuity/index.html'),
        hearthgateSensory: resolve(REPO_ROOT, 'apps/starwell/hearthgate-sensory/index.html'),
        worldToneApproval: resolve(REPO_ROOT, 'apps/starwell/world-tone-approval/index.html'),
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
