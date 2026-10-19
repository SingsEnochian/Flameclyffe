// Wayglass Video Atelier: local LTX Desktop adapter, not a participant/identity store.
// Source API: Lightricks/LTX-Desktop backend/_routes/generation.py and api_types.py.
// Source code Apache-2.0; model weights subject to separate upstream terms.

export const VIDEO_HANDOFF_SCHEMA = 'wayglass.video-handoff/v0.1';
export const VIDEO_RECEIPT_SCHEMA = 'wayglass.video-render-receipt/v0.1';
export const DEFAULT_LTX_ENDPOINT = 'http://127.0.0.1:41954';

export const WAYGLASS_SCENES = Object.freeze({
  'twilight-mirror': Object.freeze({
    title: 'Twilight · Through the Wayglass',
    prompt: 'One continuous cinematic shot, no cuts. In a luminous illustrated magical library, Twilight Sparkle, a lavender unicorn with violet hair and a magenta streak, approaches an ornate standing mirror. Her reflection moves a fraction early. She touches the glass; refractive depth and chromatic displacement develop inside it. An illustrated library and a realistic warmly lit living room coexist briefly in the thickness of the glass. As she steps through, her pony silhouette progressively resolves into a human woman with the same violet and magenta hair, bookish navy blazer and glasses. Her character identity, colours and movement remain consistent. On the far side she discovers her hands, adjusts her glasses and looks back in scholarly amazement. The transformation is physically continuous in the mirror, never a hard scene cut. Expressive but restrained acting, optical refraction and believable overlapping worlds, elegant lighting.',
    world_ref: 'wayglass:mirror-crossing-demo',
    source_ref: 'Rowan-approved creative concept, 2026-10-08',
  }),
});

function requiredText(value, label, limit = 4000) {
  if (typeof value !== 'string' || !value.trim() || value.length > limit) {
    throw new Error(label + ' must be nonempty text of at most ' + limit + ' characters.');
  }
  return value.trim();
}

export class WayglassVideoAtelier {
  constructor({ now = () => new Date().toISOString() } = {}) {
    this.now = now;
  }

  prepare({ sceneId = 'twilight-mirror', prompt, title, sourceRef } = {}) {
    const scene = WAYGLASS_SCENES[sceneId];
    if (!scene) throw new Error('Unknown Video Atelier scene.');
    const instruction = requiredText(prompt ?? scene.prompt, 'Video prompt');
    const caption = requiredText(title ?? scene.title, 'Scene title', 180);
    return Object.freeze({
      schema: VIDEO_HANDOFF_SCHEMA,
      provider: 'ltx-desktop-local',
      scene_id: sceneId,
      title: caption,
      world_ref: scene.world_ref,
      source_ref: sourceRef || scene.source_ref,
      created_at: this.now(),
      authority: 'creative-render-only; no identity, relationship, or canon mutation',
      render_request: Object.freeze({
        prompt: instruction,
        resolution: '720p',
        model: 'fast',
        duration: 5,
        fps: 24,
        audio: false,
        aspectRatio: '16:9',
        cameraMotion: 'none',
        negativePrompt: 'hard scene cuts, sudden background replacement, character identity drift, duplicated legs, distorted fingers, flickering glasses',
      }),
      state: 'prepared-not-rendered',
    });
  }
}

export function validateVideoHandoff(job) {
  if (!job || job.schema !== VIDEO_HANDOFF_SCHEMA || job.provider !== 'ltx-desktop-local') {
    throw new Error('Unrecognised Wayglass video handoff schema/provider.');
  }
  requiredText(job.title, 'Scene title', 180);
  requiredText(job.render_request?.prompt, 'Video prompt');
  if (job.render_request?.model !== 'fast' || job.render_request?.duration !== 5 ||
      job.render_request?.resolution !== '720p' || job.render_request?.fps !== 24 ||
      job.render_request?.audio !== false || job.render_request?.aspectRatio !== '16:9') {
    throw new Error('Unsupported render configuration; no automatic cloud or paid fallback.');
  }
  return job;
}

export function normaliseLtxEndpoint(endpoint = DEFAULT_LTX_ENDPOINT) {
  let url;
  try { url = new URL(endpoint); } catch { throw new Error('Invalid LTX Desktop endpoint.'); }
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
      url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('LTX Desktop endpoint must be a plain loopback HTTP origin with no credentials.');
  }
  return url.origin;
}

// LTX's official app exposes a per-launch bearer token through its own Logs UI.
// Wayglass never reads another app's credential storage and never sends this
// token to a browser or to a remote Wayglass host.
export class LtxDesktopLocalClient {
  constructor({ endpoint = DEFAULT_LTX_ENDPOINT, token, fetchImpl = globalThis.fetch } = {}) {
    this.endpoint = normaliseLtxEndpoint(endpoint);
    this.token = requiredText(token, 'LTX session token', 4096);
    if (typeof fetchImpl !== 'function') throw new Error('Local Fetch is required.');
    this.fetchImpl = fetchImpl;
  }

  async request(path, options = {}) {
    let response;
    try {
      response = await this.fetchImpl(this.endpoint + path, {
        ...options,
        headers: {
          Authorization: 'Bearer ' + this.token,
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        },
        signal: options.signal ?? AbortSignal.timeout(30 * 60 * 1000),
      });
    } catch {
      throw new Error('LTX Desktop local backend is unreachable. Open the desktop app and check its backend port.');
    }
    if (!response.ok) throw new Error('LTX Desktop returned HTTP ' + response.status + ' for ' + path + '.');
    return response.json();
  }

  async probe() {
    const policy = await this.request('/api/runtime-policy');
    // On unsupported hardware LTX Desktop can silently enter paid API mode.
    // Fail closed rather than spending money without a separate approval.
    if (policy.force_api_generations !== false) {
      throw new Error('LTX Desktop is not in confirmed local-generation mode. Paid API fallback is blocked.');
    }
    const settings = await this.request('/api/settings');
    const apiPreference = settings.userPrefersLtxApiVideoGenerations ?? settings.user_prefers_ltx_api_video_generations;
    if (apiPreference !== false) {
      throw new Error('LTX Desktop cloud video preference is enabled or unknown. Local generation required.');
    }
    const health = await this.request('/health');
    if (health.status !== 'ok') throw new Error('LTX Desktop health check did not report ready.');
    return Object.freeze({ local: true, gpu: health.gpu_info?.name || 'unreported' });
  }

  async render(handoff, { startImagePath, endImagePath } = {}) {
    validateVideoHandoff(handoff);
    await this.probe();
    if (endImagePath && !startImagePath) throw new Error('An end frame requires a start frame.');
    const renderRequest = {
      prompt: handoff.render_request.prompt,
      resolution: '720p',
      model: 'fast',
      duration: 5,
      fps: 24,
      audio: false,
      aspectRatio: '16:9',
      cameraMotion: 'none',
      negativePrompt: handoff.render_request.negativePrompt,
      ...(startImagePath ? { imagePath: startImagePath } : {}),
      ...(endImagePath ? { lastImagePath: endImagePath } : {}),
    };
    const result = await this.request('/api/generate', { method: 'POST', body: JSON.stringify(renderRequest) });
    if (result.status !== 'complete' || typeof result.video_path !== 'string' || !result.video_path) {
      throw new Error(result.status === 'cancelled' ? 'LTX Desktop cancelled the render.' : 'LTX Desktop did not return a completed video path.');
    }
    return Object.freeze({
      schema: VIDEO_RECEIPT_SCHEMA,
      provider: 'ltx-desktop-local',
      scene_id: handoff.scene_id,
      source_ref: handoff.source_ref,
      requested_at: handoff.created_at,
      completed_at: new Date().toISOString(),
      status: 'engine-reported-complete',
      video_path: result.video_path,
      filesystem_verified: false,
      canon_commit: false,
    });
  }
}
