import './video-atelier.css';
import { WayglassVideoAtelier, WAYGLASS_SCENES } from '../ltx-desktop-bridge.js';

export async function mountWayglassVideoAtelier(root) {
  const atelier = new WayglassVideoAtelier();
  const preset = WAYGLASS_SCENES['twilight-mirror'];
  root.innerHTML = [
    '<section class="wg-surface wg-video-atelier" data-surface="wayglass-video-atelier">',
    '<nav class="wg-deck-nav glass-panel" aria-label="Wayglass rooms">',
    '<button type="button" class="glass-chip" data-wayglass-room="arcsweep:writing-room">Writing Room</button>',
    '<button type="button" class="glass-chip" data-wayglass-room="wayglass:systems">Organs</button>',
    '<button type="button" class="glass-chip active" aria-current="page">Video Atelier</button>',
    '<button type="button" class="glass-chip" data-wayglass-room="wayglass:living-observer">Living Observer</button>',
    '</nav>',
    '<header class="wg-surface-head glass-panel"><div>',
    '<p class="eyebrow">Wayglass · creative engine room</p>',
    '<h1>Video Atelier</h1>',
    '<p class="lede">Shape a dimensional crossing, then hand the scene to LTX Desktop for local video generation. The scene is yours; the render engine does not become a participant.</p>',
    '</div><div class="atelier-refraction" aria-hidden="true"><div class="atelier-mirror"><span>↝</span></div></div></header>',
    '<section class="glass-panel atelier-workbench" aria-label="Crossing scene editor">',
    '<p class="eyebrow">Scene 001 · mirror crossing</p>',
    '<h2>Twilight · Through the Wayglass</h2>',
    '<label for="wg-video-prompt">Motion and transformation prompt</label>',
    '<textarea id="wg-video-prompt" rows="11" spellcheck="true"></textarea>',
    '<p class="tiny">5 seconds · 720p · 16:9 · Fast · no audio. LTX starts in text-to-video mode; optional image start/end frames are supported by the local runner.</p>',
    '<div class="atelier-actions">',
    '<button id="wg-video-export" type="button" class="send-jewel">Export LTX scene job</button>',
    '<button id="wg-video-copy" type="button" class="glass-chip">Copy prompt</button>',
    '</div><p id="wg-video-status" role="status" aria-live="polite" class="tiny">Prepared for export. No video has been rendered or uploaded.</p>',
    '</section>',
    '<section class="glass-panel atelier-workbench"><h2>How this connects</h2>',
    '<p>Export the job JSON, then run the documented local companion while LTX Desktop is open. The companion checks the local-generation policy before invoking the engine. It never falls back silently to a paid API.</p>',
    '<p><code>node apps/wayglass/scripts/ltx-desktop-render.mjs ./wayglass-twilight-mirror.ltx.json --render</code></p>',
    '<p class="tiny">Requires supported local hardware and the LTX Desktop session token in your terminal environment. The browser never sees the token. Video output is confirmed only by a returned engine receipt and a local file check.</p>',
    '</section></section>',
  ].join('');

  root.querySelectorAll('[data-wayglass-room]').forEach(button => {
    button.addEventListener('click', () => globalThis.__wayglassOS?.mount(button.dataset.wayglassRoom));
  });
  const prompt = root.querySelector('#wg-video-prompt');
  const status = root.querySelector('#wg-video-status');
  prompt.value = preset.prompt;

  root.querySelector('#wg-video-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(prompt.value);
      status.textContent = 'Prompt copied. No generation submitted.';
    } catch {
      status.textContent = 'Clipboard unavailable. Select and copy the prompt manually.';
    }
  });
  root.querySelector('#wg-video-export').addEventListener('click', () => {
    try {
      const handoff = atelier.prepare({ prompt: prompt.value });
      const blob = new Blob([JSON.stringify(handoff, null, 2) + '\n'], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'wayglass-twilight-mirror.ltx.json';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      status.textContent = 'Scene job exported. It is a prepared handoff, not a completed video.';
    } catch (error) {
      status.textContent = 'Export failed: ' + error.message;
    }
  });
}
