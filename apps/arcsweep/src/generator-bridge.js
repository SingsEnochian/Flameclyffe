export const GENERATOR_BRIDGE_SCHEMA = 'arcsweep.generator-bridge/v0.1';
export const GENERATOR_REQUEST_SCHEMA = 'arcsweep.generator-request/v0.1';
export const GENERATOR_RESULT_SCHEMA = 'arcsweep.generator-result/v0.1';
export const GENERATOR_ENDPOINT_KEY = 'hearthgate.arcsweep.generator-bridge.endpoint.v0.1';
export const DEFAULT_COMFYUI_ENDPOINT = 'http://127.0.0.1:8188';

const ZIMAGE_API = '/z_image_turbo';
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_POLL_INTERVAL_MS = 900;

function text(value, max = 4096) {
  return String(value ?? '').trim().slice(0, max);
}

function integer(value, fallback, min, max) {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function finite(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function sourceImageReference(value) {
  const reference = text(value, 1024);
  const segments = reference.split('/');
  if (reference && (
    reference.startsWith('/')
    || reference.includes('\\')
    || segments.includes('..')
    || /^[a-z][a-z0-9+.-]*:/i.test(reference)
  )) {
    throw new Error('Source image must be a relative ComfyUI input reference.');
  }
  return reference;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function normaliseGeneratorEndpoint(value = DEFAULT_COMFYUI_ENDPOINT) {
  const candidate = text(value, 512) || DEFAULT_COMFYUI_ENDPOINT;
  let url;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error('Generator endpoint must be a complete http:// or https:// URL.');
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Generator endpoint must use http:// or https://.');
  }
  if (url.username || url.password) {
    throw new Error('Generator endpoint credentials must not be embedded in the URL.');
  }
  url.search = '';
  url.hash = '';
  url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString().replace(/\/$/, '');
}

export function normaliseGeneratorRequest(input = {}) {
  const prompt = text(input.prompt, 4000);
  if (!prompt) throw new Error('A prompt is required before the page can render a vision.');
  const mode = text(input.mode, 20).toLowerCase() === 'i2i' ? 'i2i' : 't2i';
  const sourceImage = sourceImageReference(input.source_image ?? input.sourceImage);
  if (mode === 'i2i' && !sourceImage) {
    throw new Error('Image-to-image generation requires an uploaded source image.');
  }
  return Object.freeze({
    schema: GENERATOR_REQUEST_SCHEMA,
    provider: 'tj-studio-zimage',
    mode,
    source_image: mode === 'i2i' ? sourceImage : '',
    prompt,
    negative_prompt: text(input.negative_prompt ?? input.negativePrompt, 2000),
    width: integer(input.width, 1024, 256, 2048),
    height: integer(input.height, 1024, 256, 2048),
    steps: integer(input.steps, 8, 1, 100),
    cfg: finite(input.cfg, 1, 0, 30),
    shift: finite(input.shift, 3, 0, 30),
    sampler: text(input.sampler, 80) || 'euler',
    scheduler: text(input.scheduler, 80) || 'simple',
    denoise: finite(input.denoise, mode === 'i2i' ? 0.65 : 1, 0, 1),
    seed: integer(input.seed, Math.floor(Math.random() * 2_147_483_647), 0, Number.MAX_SAFE_INTEGER),
    requested_at: input.requested_at || input.requestedAt || new Date().toISOString(),
  });
}

export function canvasToPngBlob(sourceCanvas, {
  documentImpl = globalThis.document,
  background = '#fbf3e3',
} = {}) {
  if (!sourceCanvas?.width || !sourceCanvas?.height) {
    return Promise.reject(new Error('A rendered glyph canvas is required.'));
  }
  const exportCanvas = documentImpl?.createElement?.('canvas');
  const context = exportCanvas?.getContext?.('2d');
  if (!exportCanvas || !context || typeof exportCanvas.toBlob !== 'function') {
    return Promise.reject(new Error('This browser cannot export the glyph canvas as PNG.'));
  }
  exportCanvas.width = sourceCanvas.width;
  exportCanvas.height = sourceCanvas.height;
  context.fillStyle = background;
  context.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  context.drawImage(sourceCanvas, 0, 0);
  return new Promise((resolve, reject) => {
    exportCanvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('The glyph canvas did not produce a PNG.'));
    }, 'image/png');
  });
}

function list(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item !== 'none') : [];
}

function configuredModel(configValue, available, hints = []) {
  const configured = text(configValue, 512);
  if (configured && available.includes(configured)) return configured;
  const lowerHints = hints.map((hint) => hint.toLowerCase());
  return available.find((name) => lowerHints.some((hint) => name.toLowerCase().includes(hint))) || '';
}

export function resolveZImageModels(config = {}, models = {}) {
  const diffusionModels = list(models.diffusion_models);
  const textEncoders = list(models.text_encoders);
  const vaes = list(models.vaes);
  const resolved = Object.freeze({
    diffusion_model: configuredModel(config.selected_model, diffusionModels, ['z_image', 'z-image']),
    text_encoder: configuredModel(config.selected_text_encoder, textEncoders, ['qwen_3_4b', 'qwen3_4b', 'qwen3-4b']),
    vae: configuredModel(config.selected_vae, vaes, ['ae.safetensors', '/ae.', '\\ae.']),
  });
  const missing = Object.entries(resolved).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) {
    throw new Error(`TJ Studio is reachable, but Z-Image is not configured (${missing.join(', ')} missing).`);
  }
  return resolved;
}

function modelLoader(name) {
  if (name.toLowerCase().endsWith('.gguf')) {
    return { class_type: 'UnetLoaderGGUF', inputs: { unet_name: name } };
  }
  return { class_type: 'UNETLoader', inputs: { unet_name: name, weight_dtype: 'default' } };
}

function textEncoderLoader(name) {
  if (name.toLowerCase().endsWith('.gguf')) {
    return { class_type: 'CLIPLoaderGGUF', inputs: { clip_name: name, type: 'lumina2' } };
  }
  return { class_type: 'CLIPLoader', inputs: { clip_name: name, type: 'lumina2', device: 'default' } };
}

export function buildZImageT2IGraph(requestInput, modelInput) {
  const request = requestInput?.schema === GENERATOR_REQUEST_SCHEMA
    ? requestInput
    : normaliseGeneratorRequest(requestInput);
  const models = {
    diffusion_model: text(modelInput?.diffusion_model, 512),
    text_encoder: text(modelInput?.text_encoder, 512),
    vae: text(modelInput?.vae, 512),
  };
  if (!models.diffusion_model || !models.text_encoder || !models.vae) {
    throw new Error('A resolved diffusion model, text encoder, and VAE are required.');
  }
  return Object.freeze({
    'CODEX:unet': modelLoader(models.diffusion_model),
    'CODEX:clip': textEncoderLoader(models.text_encoder),
    'CODEX:vae': { class_type: 'VAELoader', inputs: { vae_name: models.vae } },
    'CODEX:model-sampling': {
      class_type: 'ModelSamplingAuraFlow',
      inputs: { model: ['CODEX:unet', 0], shift: request.shift },
    },
    'CODEX:positive': {
      class_type: 'CLIPTextEncode',
      inputs: { clip: ['CODEX:clip', 0], text: request.prompt },
    },
    'CODEX:negative': {
      class_type: 'CLIPTextEncode',
      inputs: { clip: ['CODEX:clip', 0], text: request.negative_prompt },
    },
    'CODEX:latent': {
      class_type: 'EmptySD3LatentImage',
      inputs: { width: request.width, height: request.height, batch_size: 1 },
    },
    'CODEX:sampler': {
      class_type: 'KSampler',
      inputs: {
        model: ['CODEX:model-sampling', 0],
        positive: ['CODEX:positive', 0],
        negative: ['CODEX:negative', 0],
        latent_image: ['CODEX:latent', 0],
        seed: request.seed,
        steps: request.steps,
        cfg: request.cfg,
        sampler_name: request.sampler,
        scheduler: request.scheduler,
        denoise: 1,
      },
    },
    'CODEX:decode': {
      class_type: 'VAEDecode',
      inputs: { samples: ['CODEX:sampler', 0], vae: ['CODEX:vae', 0] },
    },
    'CODEX:save': {
      class_type: 'SaveImage',
      inputs: { images: ['CODEX:decode', 0], filename_prefix: 'arcsweep-universal-codex/vision' },
    },
  });
}

export function buildZImageI2IGraph(requestInput, modelInput) {
  const request = requestInput?.schema === GENERATOR_REQUEST_SCHEMA
    ? requestInput
    : normaliseGeneratorRequest({ ...requestInput, mode: 'i2i' });
  if (request.mode !== 'i2i' || !request.source_image) {
    throw new Error('A normalised image-to-image request is required.');
  }
  const graph = { ...buildZImageT2IGraph(request, modelInput) };
  delete graph['CODEX:latent'];
  graph['CODEX:source'] = {
    class_type: 'LoadImage',
    inputs: { image: request.source_image },
  };
  graph['CODEX:source-scale'] = {
    class_type: 'ImageScale',
    inputs: {
      image: ['CODEX:source', 0],
      upscale_method: 'lanczos',
      width: request.width,
      height: request.height,
      crop: 'disabled',
    },
  };
  graph['CODEX:source-latent'] = {
    class_type: 'VAEEncode',
    inputs: { pixels: ['CODEX:source-scale', 0], vae: ['CODEX:vae', 0] },
  };
  graph['CODEX:sampler'].inputs.latent_image = ['CODEX:source-latent', 0];
  graph['CODEX:sampler'].inputs.denoise = request.denoise;
  graph['CODEX:save'].inputs.filename_prefix = 'arcsweep-universal-codex/transformation';
  return Object.freeze(graph);
}

function outputImages(historyEntry = {}) {
  return Object.values(historyEntry.outputs || {})
    .flatMap((output) => Array.isArray(output?.images) ? output.images : [])
    .filter((image) => image?.filename);
}

export function imageViewUrl(endpoint, image = {}) {
  const query = new URLSearchParams({
    filename: text(image.filename, 512),
    subfolder: text(image.subfolder, 512),
    type: text(image.type, 40) || 'output',
  });
  return `${normaliseGeneratorEndpoint(endpoint)}/view?${query}`;
}

export function createComfyUIGeneratorClient({
  endpoint = DEFAULT_COMFYUI_ENDPOINT,
  fetchImpl = globalThis.fetch?.bind(globalThis),
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  clientId = `arcsweep-codex-${Math.random().toString(36).slice(2, 10)}`,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('Generator bridge requires Fetch.');
  const baseUrl = normaliseGeneratorEndpoint(endpoint);

  async function requestJson(path, options = {}) {
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const response = await fetchImpl(`${baseUrl}${path}`, {
      mode: 'cors',
      cache: 'no-store',
      ...options,
      headers: options.body && !isFormData
        ? { 'Content-Type': 'application/json', ...(options.headers || {}) }
        : options.headers,
    });
    if (!response.ok) throw new Error(`Generator returned HTTP ${response.status} for ${path}.`);
    return response.json();
  }

  async function uploadImage(blob, filename = `arcsweep-glyph-${Date.now()}.png`) {
    if (typeof FormData === 'undefined') throw new Error('Generator image upload requires FormData.');
    const form = new FormData();
    form.append('image', blob, text(filename, 240) || 'arcsweep-glyph.png');
    form.append('subfolder', 'arcsweep-universal-codex');
    form.append('type', 'input');
    const uploaded = await requestJson('/upload/image', { method: 'POST', body: form });
    const name = text(uploaded?.name, 512);
    const subfolder = text(uploaded?.subfolder, 512);
    if (!name) throw new Error('ComfyUI did not return an uploaded image name.');
    return Object.freeze({
      name,
      subfolder,
      type: text(uploaded?.type, 40) || 'input',
      reference: subfolder ? `${subfolder}/${name}` : name,
    });
  }

  async function probe() {
    const [system, config, models] = await Promise.all([
      requestJson('/system_stats'),
      requestJson(`${ZIMAGE_API}/config`),
      requestJson(`${ZIMAGE_API}/models`),
    ]);
    const resolvedModels = resolveZImageModels(config, models);
    return Object.freeze({
      schema: GENERATOR_BRIDGE_SCHEMA,
      endpoint: baseUrl,
      connected: true,
      provider: 'tj-studio-zimage',
      models: resolvedModels,
      devices: Array.isArray(system.devices) ? system.devices.length : null,
    });
  }

  async function waitForHistory(promptId) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const history = await requestJson(`/history/${encodeURIComponent(promptId)}`);
      const entry = history?.[promptId];
      if (entry) {
        const images = outputImages(entry);
        const status = entry.status?.status_str || entry.status?.status || '';
        if (images.length) return { entry, images };
        if (status === 'error') throw new Error('ComfyUI reported a failed generation.');
      }
      await sleep(Math.max(0, pollIntervalMs));
    }
    throw new Error('Generator timed out while waiting for ComfyUI history.');
  }

  async function generateZImage(requestInput) {
    const request = normaliseGeneratorRequest(requestInput);
    const availability = await probe();
    const graph = request.mode === 'i2i'
      ? buildZImageI2IGraph(request, availability.models)
      : buildZImageT2IGraph(request, availability.models);
    const queued = await requestJson('/prompt', {
      method: 'POST',
      body: JSON.stringify({ prompt: graph, client_id: clientId }),
    });
    if (!queued?.prompt_id) {
      const message = queued?.error?.message || queued?.error || 'ComfyUI did not return a prompt id.';
      throw new Error(message);
    }
    const completed = await waitForHistory(queued.prompt_id);
    const images = completed.images.map((image) => Object.freeze({
      filename: text(image.filename, 512),
      subfolder: text(image.subfolder, 512),
      type: text(image.type, 40) || 'output',
      url: imageViewUrl(baseUrl, image),
    }));
    return Object.freeze({
      schema: GENERATOR_RESULT_SCHEMA,
      provider: request.provider,
      endpoint: baseUrl,
      prompt_id: queued.prompt_id,
      request,
      models: availability.models,
      outputs: Object.freeze(images),
      completed_at: new Date().toISOString(),
    });
  }

  return Object.freeze({
    schema: GENERATOR_BRIDGE_SCHEMA,
    endpoint: baseUrl,
    probe,
    uploadImage,
    generateZImage,
  });
}
