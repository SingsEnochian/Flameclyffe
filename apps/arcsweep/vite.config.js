import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { auditCanonicalSpine } from '../../lib/canonical-spine-core.js';

const ARCSWEEP_ROOT = fileURLToPath(new URL('./', import.meta.url));
const CANONICAL_SPINE_PATH = fileURLToPath(new URL('../../data/canonical-spine.seed.json', import.meta.url));
const SPESSASYNTH_WORKLET_PATH = fileURLToPath(new URL('../../node_modules/spessasynth_lib/dist/spessasynth_processor.min.js', import.meta.url));
const STORY_SOUNDSCAPE_PATH = '/apps/arcsweep/src/story-soundscape.js';
const SOURCE_WORKLET_DECLARATION = "const SPESSASYNTH_WORKLET_URL = new URL('../../../node_modules/spessasynth_lib/dist/spessasynth_processor.min.js', import.meta.url).href;";
const BUILT_WORKLET_DECLARATION = "const SPESSASYNTH_WORKLET_URL = `${import.meta.url.slice(0, import.meta.url.lastIndexOf('/') + 1)}spessasynth_processor.min.js`;";

function canonicalSpinePayload() {
  const raw = readFileSync(CANONICAL_SPINE_PATH, 'utf8');
  const graph = JSON.parse(raw);
  const audit = auditCanonicalSpine(graph);
  if (audit.errors.length) throw new Error(`Canonical Spine invalid:\n- ${audit.errors.join('\n- ')}`);
  const sourceFingerprint = `sha256:${createHash('sha256').update(raw).digest('hex')}`;
  return `${JSON.stringify({
    ...graph,
    _mirror: {
      source: 'data/canonical-spine.seed.json',
      sourceFingerprint,
      authority: 'generated directly from root authority at dev/build time',
      generatedBy: 'apps/arcsweep/vite.config.js',
    },
  }, null, 2)}\n`;
}

function arcsweepCanonicalSpine() {
  return {
    name: 'arcsweep-canonical-spine',
    enforce: 'pre',
    buildStart() {
      canonicalSpinePayload();
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0] !== '/canonical-spine.seed.json') return next();
        try {
          response.statusCode = 200;
          response.setHeader('content-type', 'application/json; charset=utf-8');
          response.setHeader('cache-control', 'no-store');
          response.end(canonicalSpinePayload());
        } catch (error) {
          next(error);
        }
      });
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'canonical-spine.seed.json',
        source: canonicalSpinePayload(),
      });
    },
  };
}

function arcsweepSpessaSynthWorklet() {
  const readProcessor = () => readFileSync(SPESSASYNTH_WORKLET_PATH);
  return {
    name: 'arcsweep-spessasynth-worklet',
    enforce: 'pre',
    transform(code, id) {
      const normalised = id.replaceAll('\\', '/');
      if (!normalised.endsWith(STORY_SOUNDSCAPE_PATH)) return null;
      if (!code.includes(SOURCE_WORKLET_DECLARATION)) {
        throw new Error('Arcsweep SoundFont worklet URL contract changed; update the Vite packaging adapter before shipping.');
      }
      return { code: code.replace(SOURCE_WORKLET_DECLARATION, BUILT_WORKLET_DECLARATION), map: null };
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0] !== '/src/spessasynth_processor.min.js') return next();
        try {
          response.statusCode = 200;
          response.setHeader('content-type', 'application/javascript; charset=utf-8');
          response.setHeader('cache-control', 'no-store');
          response.end(readProcessor());
        } catch (error) {
          next(error);
        }
      });
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'assets/spessasynth_processor.min.js',
        source: readProcessor(),
      });
    },
  };
}

export default defineConfig({
  root: 'apps/arcsweep',
  base: './',
  plugins: [arcsweepCanonicalSpine(), arcsweepSpessaSynthWorklet()],
  build: {
    outDir: '../../dist/arcsweep',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(ARCSWEEP_ROOT, 'index.html'),
        spine: resolve(ARCSWEEP_ROOT, 'spine/index.html'),
        observer: resolve(ARCSWEEP_ROOT, 'observer/index.html'),
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
