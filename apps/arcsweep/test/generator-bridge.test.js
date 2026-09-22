import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  GENERATOR_BRIDGE_SCHEMA,
  GENERATOR_RESULT_SCHEMA,
  buildZImageI2IGraph,
  buildZImageT2IGraph,
  canvasToPngBlob,
  createComfyUIGeneratorClient,
  normaliseGeneratorEndpoint,
  normaliseGeneratorRequest,
  resolveZImageModels,
} from '../src/generator-bridge.js';
import { ARCSWEEP_OS_MANIFEST } from '../src/os/version.js';

const models = {
  diffusion_model: 'z_image_turbo_bf16.safetensors',
  text_encoder: 'qwen_3_4b.safetensors',
  vae: 'ae.safetensors',
};

test('Generator Bridge accepts bounded HTTP endpoints without embedded credentials', () => {
  assert.equal(normaliseGeneratorEndpoint('http://127.0.0.1:8188/'), 'http://127.0.0.1:8188');
  assert.equal(normaliseGeneratorEndpoint('https://forge.example.test/comfy/'), 'https://forge.example.test/comfy');
  assert.throws(() => normaliseGeneratorEndpoint('file:///tmp/forge'), /http/i);
  assert.throws(() => normaliseGeneratorEndpoint('https://user:secret@forge.example.test'), /credentials/i);
});

test('Z-Image request and graph preserve exact generation lineage', () => {
  const request = normaliseGeneratorRequest({
    prompt: 'a living copper codex beneath an aurora',
    negativePrompt: 'watermark',
    width: 960,
    height: 1280,
    steps: 9,
    cfg: 1.25,
    shift: 3.5,
    sampler: 'euler',
    scheduler: 'simple',
    seed: 369,
    requestedAt: '2026-09-21T22:00:00.000Z',
  });
  const graph = buildZImageT2IGraph(request, models);

  assert.equal(graph['CODEX:positive'].inputs.text, request.prompt);
  assert.equal(graph['CODEX:negative'].inputs.text, 'watermark');
  assert.equal(graph['CODEX:latent'].inputs.width, 960);
  assert.equal(graph['CODEX:sampler'].inputs.seed, 369);
  assert.equal(graph['CODEX:sampler'].inputs.steps, 9);
  assert.equal(graph['CODEX:unet'].inputs.unet_name, models.diffusion_model);
  assert.equal(graph['CODEX:clip'].inputs.clip_name, models.text_encoder);
  assert.equal(graph['CODEX:vae'].inputs.vae_name, models.vae);
  assert.match(graph['CODEX:save'].inputs.filename_prefix, /universal-codex/);
});

test('Z-Image image-to-image graph binds an uploaded glyph and bounded denoise', () => {
  assert.throws(() => normaliseGeneratorRequest({
    prompt: 'turn this glyph into a luminous wayfinder',
    mode: 'i2i',
  }), /source image/i);
  assert.throws(() => normaliseGeneratorRequest({
    prompt: 'turn this glyph into a luminous wayfinder',
    mode: 'i2i',
    source_image: '../outside.png',
  }), /relative ComfyUI input/i);

  const request = normaliseGeneratorRequest({
    prompt: 'turn this glyph into a luminous wayfinder',
    mode: 'i2i',
    sourceImage: 'arcsweep-universal-codex/glyph.png',
    width: 768,
    height: 512,
    denoise: 0.42,
    seed: 144,
  });
  const graph = buildZImageI2IGraph(request, models);

  assert.equal(request.mode, 'i2i');
  assert.equal(graph['CODEX:source'].inputs.image, request.source_image);
  assert.equal(graph['CODEX:source-scale'].inputs.width, 768);
  assert.equal(graph['CODEX:source-scale'].inputs.height, 512);
  assert.deepEqual(graph['CODEX:source-latent'].inputs.pixels, ['CODEX:source-scale', 0]);
  assert.deepEqual(graph['CODEX:sampler'].inputs.latent_image, ['CODEX:source-latent', 0]);
  assert.equal(graph['CODEX:sampler'].inputs.denoise, 0.42);
  assert.equal(graph['CODEX:latent'], undefined);
  assert.match(graph['CODEX:save'].inputs.filename_prefix, /transformation/);
});

test('Glyph canvas export flattens transparent marks onto parchment PNG', async () => {
  const operations = [];
  const context = {
    fillStyle: '',
    fillRect: (...args) => operations.push(['fill', ...args]),
    drawImage: (...args) => operations.push(['draw', ...args]),
  };
  const png = new Blob(['png'], { type: 'image/png' });
  const exportCanvas = {
    width: 0,
    height: 0,
    getContext: () => context,
    toBlob: (callback, type) => {
      operations.push(['blob', type]);
      callback(png);
    },
  };
  const sourceCanvas = { width: 512, height: 512 };
  const result = await canvasToPngBlob(sourceCanvas, {
    documentImpl: { createElement: () => exportCanvas },
  });

  assert.equal(result, png);
  assert.equal(context.fillStyle, '#fbf3e3');
  assert.deepEqual(operations[0], ['fill', 0, 0, 512, 512]);
  assert.deepEqual(operations[1], ['draw', sourceCanvas, 0, 0]);
  assert.deepEqual(operations[2], ['blob', 'image/png']);
});

test('Z-Image model resolution honours configured choices and refuses a decorative false-ready state', () => {
  assert.deepEqual(resolveZImageModels({
    selected_model: models.diffusion_model,
    selected_text_encoder: models.text_encoder,
    selected_vae: models.vae,
  }, {
    diffusion_models: [models.diffusion_model],
    text_encoders: [models.text_encoder],
    vaes: [models.vae],
  }), models);

  assert.throws(() => resolveZImageModels({}, {
    diffusion_models: [],
    text_encoders: [],
    vaes: [],
  }), /not configured/i);
});

test('Generator Bridge probes, queues, waits for history, and returns an addressable artifact', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    const parsed = new URL(url);
    calls.push({ path: parsed.pathname, options });
    let payload;
    if (parsed.pathname === '/system_stats') payload = { devices: [{ name: 'local-gpu' }] };
    else if (parsed.pathname === '/z_image_turbo/config') payload = {
      selected_model: models.diffusion_model,
      selected_text_encoder: models.text_encoder,
      selected_vae: models.vae,
    };
    else if (parsed.pathname === '/z_image_turbo/models') payload = {
      diffusion_models: [models.diffusion_model],
      text_encoders: [models.text_encoder],
      vaes: [models.vae],
    };
    else if (parsed.pathname === '/prompt') payload = { prompt_id: 'prompt-codex-1' };
    else if (parsed.pathname === '/history/prompt-codex-1') payload = {
      'prompt-codex-1': {
        status: { status_str: 'success' },
        outputs: {
          'CODEX:save': { images: [{ filename: 'vision_00001_.png', subfolder: 'arcsweep-universal-codex', type: 'output' }] },
        },
      },
    };
    else throw new Error(`Unexpected path ${parsed.pathname}`);
    return { ok: true, status: 200, json: async () => payload };
  };

  const client = createComfyUIGeneratorClient({
    endpoint: 'http://127.0.0.1:8188',
    fetchImpl,
    pollIntervalMs: 0,
    timeoutMs: 1000,
    clientId: 'codex-test-client',
  });
  const result = await client.generateZImage({ prompt: 'the book remembers', seed: 55 });

  assert.equal(client.schema, GENERATOR_BRIDGE_SCHEMA);
  assert.equal(result.schema, GENERATOR_RESULT_SCHEMA);
  assert.equal(result.prompt_id, 'prompt-codex-1');
  assert.equal(result.request.seed, 55);
  assert.equal(result.outputs[0].filename, 'vision_00001_.png');
  assert.match(result.outputs[0].url, /^http:\/\/127\.0\.0\.1:8188\/view\?/);
  const promptCall = calls.find((call) => call.path === '/prompt');
  const queued = JSON.parse(promptCall.options.body);
  assert.equal(queued.client_id, 'codex-test-client');
  assert.equal(queued.prompt['CODEX:positive'].inputs.text, 'the book remembers');
});

test('Generator Bridge uploads a glyph before queuing its transformation graph', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    const path = new URL(url).pathname;
    calls.push({ path, options });
    let payload;
    if (path === '/upload/image') payload = {
      name: 'glyph-source.png',
      subfolder: 'arcsweep-universal-codex',
      type: 'input',
    };
    else if (path === '/system_stats') payload = { devices: [{ name: 'local-gpu' }] };
    else if (path === '/z_image_turbo/config') payload = {
      selected_model: models.diffusion_model,
      selected_text_encoder: models.text_encoder,
      selected_vae: models.vae,
    };
    else if (path === '/z_image_turbo/models') payload = {
      diffusion_models: [models.diffusion_model],
      text_encoders: [models.text_encoder],
      vaes: [models.vae],
    };
    else if (path === '/prompt') payload = { prompt_id: 'prompt-codex-i2i' };
    else if (path === '/history/prompt-codex-i2i') payload = {
      'prompt-codex-i2i': {
        status: { status_str: 'success' },
        outputs: { 'CODEX:save': { images: [{ filename: 'transformation.png', type: 'output' }] } },
      },
    };
    else throw new Error(`Unexpected path ${path}`);
    return { ok: true, status: 200, json: async () => payload };
  };
  const client = createComfyUIGeneratorClient({
    fetchImpl,
    pollIntervalMs: 0,
    timeoutMs: 1000,
  });
  const uploaded = await client.uploadImage(new Blob(['glyph'], { type: 'image/png' }), 'glyph.png');
  const result = await client.generateZImage({
    prompt: 'make the glyph into a copper constellation',
    mode: 'i2i',
    source_image: uploaded.reference,
    denoise: 0.55,
    seed: 77,
  });

  assert.equal(uploaded.reference, 'arcsweep-universal-codex/glyph-source.png');
  assert.equal(result.request.mode, 'i2i');
  assert.equal(result.request.source_image, uploaded.reference);
  const uploadCall = calls.find((call) => call.path === '/upload/image');
  assert.equal(uploadCall.options.method, 'POST');
  assert.ok(uploadCall.options.body instanceof FormData);
  const queued = JSON.parse(calls.find((call) => call.path === '/prompt').options.body);
  assert.equal(queued.prompt['CODEX:source'].inputs.image, uploaded.reference);
  assert.equal(queued.prompt['CODEX:sampler'].inputs.denoise, 0.55);
});

test('Magic Book exposes the local forge as a receipted instrument, not a second authority', async () => {
  const [source, html] = await Promise.all([
    readFile(new URL('../src/magic-book-sidecar.js', import.meta.url), 'utf8'),
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
  ]);
  assert.match(source, /Render a Page Vision/);
  assert.match(source, /__arcsweepGeneratorBridge/);
  assert.match(source, /generator-request/);
  assert.match(source, /generator-complete/);
  assert.match(source, /generator-failed/);
  assert.match(source, /generator-source-upload/);
  assert.match(source, /Transform current glyph/);
  assert.match(source, /Universal Codex/);
  assert.match(source, /Generator Atelier/);
  assert.match(source, /data-generator-atelier-launch/);
  assert.match(source, /params\.get\('codex'\) === 'generator'/);
  assert.match(source, /scrollIntoView/);
  assert.match(source, /local forge/);
  assert.equal(ARCSWEEP_OS_MANIFEST.runtime.magicBookGeneratorBridge, true);
  assert.equal(ARCSWEEP_OS_MANIFEST.runtime.magicBookGlyphTransformation, true);
  assert.equal(ARCSWEEP_OS_MANIFEST.runtime.universalCodexVisibleLauncher, true);
  assert.equal(ARCSWEEP_OS_MANIFEST.runtime.universalCodexGeneratorDeepLink, '?codex=generator');
  assert.match(ARCSWEEP_OS_MANIFEST.runtime.magicBookGeneratorAuthority, /provider-renders/);
  assert.equal(ARCSWEEP_OS_MANIFEST.contracts.generatorBridge, GENERATOR_BRIDGE_SCHEMA);
  assert.match(html, /connect-src[^;]*http:\/\/127\.0\.0\.1:\*/);
  assert.match(html, /img-src[^;]*http:\/\/localhost:\*/);
  assert.doesNotMatch(html, /connect-src[^;]*https:\s/);
});
