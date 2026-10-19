import { sampleFrameToFold, auralFrameCue, auralFrameSweep, FRAME_TO_FOLD_MODELS, FRAME_TO_FOLD_SCHEMA } from '../frame-to-fold-model.js';
import { createFrameAudition } from '../frame-to-fold-audio.js';

const format = value => value == null ? 'Undefined' : Number.isFinite(value) ? Number(value).toLocaleString('en-US', { maximumFractionDigits: 5 }) : String(value);
const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

export async function mountFrameToFoldSurface(root) {
  const audition = createFrameAudition();
  let disposed = false;
  let latestSample = sampleFrameToFold('fold', 0);
  root.innerHTML = [
    '<section class="wg-surface wg-frame-lab" data-surface="wayglass:frame-to-fold">',
      '<header class="wg-surface-head glass-panel">',
        '<div><p class="eyebrow">WAYGLASS · MATHEMATICAL OBSERVATORY</p><h1>Frame to Fold</h1>',
        '<p class="lede">Bring the observation frame toward and through a coordinate plane. Hear proximity, inspect the Jacobian, and distinguish a certified mathematical fold from mere convergence.</p></div>',
        '<div class="wg-frame-evidence"><strong>Model experiment</strong><span>Local calculations only</span><span>Explicit audio · Feather Stop</span><span>No physical crossing claim</span></div>',
      '</header>',
      '<section class="wg-frame-console glass-panel" aria-label="Frame movement and audible coordinate position">',
        '<div class="wg-frame-controls">',
          '<label for="wg-fold-model">Mathematical model</label>',
          '<select id="wg-fold-model">',
            FRAME_TO_FOLD_MODELS.map(model => '<option value="' + esc(model.id) + '">' + esc(model.label) + '</option>').join(''),
          '</select>',
          '<label for="wg-fold-progress">Frame position <output id="wg-fold-progress-value">0%</output></label>',
          '<input id="wg-fold-progress" type="range" min="0" max="100" value="0" step="1" aria-describedby="wg-fold-plane-label" />',
          '<div class="wg-frame-action-row">',
            '<button class="glass-chip" id="wg-fold-hear" type="button">Hear coordinate</button>',
            '<button class="glass-chip" id="wg-fold-sweep" type="button">Hear approach and passage</button>',
            '<button class="glass-chip wg-frame-stop" id="wg-fold-stop" type="button">Feather Stop</button>',
          '</div>',
          '<label class="wg-frame-stereo"><input id="wg-fold-stereo" type="checkbox" /> Optional stereo drift (mono default)</label>',
          '<p class="tiny">A rising pitch signals approach. At a certified model fold, a second tone marks the plane. Optional stereo drifts right → centre → left; the essential cue stays audible in mono. This is an artistic mapping, not a measured acoustic field.</p>',
        '</div>',
        '<div class="wg-frame-plane" role="group" aria-label="Frame position relative to plane">',
          '<div class="wg-frame-axis"><span>−x</span><span id="wg-fold-plane-label">Plane x = 0</span><span>+x</span></div>',
          '<div class="wg-frame-travel"><span class="wg-frame-zero"></span><span class="wg-frame-cursor" id="wg-fold-cursor" style="left:100%" aria-hidden="true"><i></i></span></div>',
          '<p class="wg-frame-plane-state" id="wg-fold-plane-state" role="status">Positive side</p>',
          '<p class="tiny" id="wg-fold-description"></p>',
          '<dl class="wg-frame-metrics" aria-label="Frame transport diagnostics">',
            '<div><dt>σ minimum</dt><dd id="wg-fold-sigma"></dd></div>',
            '<div><dt>det J</dt><dd id="wg-fold-det"></dd></div>',
            '<div><dt>Condition</dt><dd id="wg-fold-condition"></dd></div>',
            '<div><dt>Fold index</dt><dd id="wg-fold-index"></dd></div>',
          '</dl>',
          '<p class="wg-frame-result" id="wg-fold-result" role="status"></p>',
          '<p class="tiny" id="wg-fold-audio-state" role="status">Silent. Your selected output device has not been verified.</p>',
        '</div>',
      '</section>',
      '<section class="wg-frame-record glass-panel">',
        '<div><p class="eyebrow">SOURCE & RETURN</p><h2>Observation receipt</h2>',
        '<p class="tiny">Read-only model result. It is not an authenticated source event, signed return marker, world-crossing receipt or calibration.</p></div>',
        '<button id="wg-fold-export" class="glass-chip" type="button">Export JSON snapshot</button>',
      '</section>',
    '</section>',
  ].join('');
  const select = root.querySelector('#wg-fold-model');
  const slider = root.querySelector('#wg-fold-progress');
  const stereo = root.querySelector('#wg-fold-stereo');
  const audioStatus = root.querySelector('#wg-fold-audio-state');
  const get = id => root.querySelector('#' + id);
  function render() {
    latestSample = sampleFrameToFold(select.value, Number(slider.value) / 100);
    get('wg-fold-progress-value').textContent = slider.value + '%';
    get('wg-fold-cursor').style.left = (100 - Number(slider.value)) + '%';
    get('wg-fold-plane-label').textContent = select.value === 'fold' ? 'Fold plane x = 0' : 'Reference plane x = 0 (not a fold)';
    get('wg-fold-plane-state').textContent = latestSample.plane_position.replaceAll('_',' ') + ' · x = ' + format(latestSample.plane_distance);
    get('wg-fold-description').textContent = FRAME_TO_FOLD_MODELS.find(item => item.id === select.value).note;
    get('wg-fold-sigma').textContent = format(latestSample.sigma_min);
    get('wg-fold-det').textContent = format(latestSample.determinant);
    get('wg-fold-condition').textContent = format(latestSample.condition_number);
    get('wg-fold-index').textContent = format(latestSample.fold_index);
    const result = latestSample.rank_loss_certified ? 'Certified fold of this mathematical normal form, not physical spacetime.'
      : latestSample.local_classification === 'NO_LOCAL_FOLD' ? 'No local fold in this model. High conditioning is not singularity.'
      : 'Moving relative to a certified model fold. The actual singularity is at x = 0.';
    get('wg-fold-result').textContent = result;
  }
  select.addEventListener('change', () => { void audition.stop(); audioStatus.textContent = 'Model changed. Audio stopped.'; slider.value = '0'; render(); });
  slider.addEventListener('input', render);
  get('wg-fold-stop').addEventListener('click', () => { void audition.stop(); audioStatus.textContent = 'Feather Stop. Silent.'; });
  async function listen(cues) {
    try {
      const response = await audition.play(cues, { stereo: stereo.checked });
      if (!disposed) audioStatus.textContent = 'Scheduled ' + response.cues + ' local audio cues (' + (stereo.checked ? 'stereo' : 'mono') + '). Output not device-verified.';
    } catch (error) { if (!disposed) audioStatus.textContent = 'Audio unavailable: ' + (error?.message || String(error)); }
  }
  get('wg-fold-hear').addEventListener('click', () => void listen([auralFrameCue(latestSample)]));
  get('wg-fold-sweep').addEventListener('click', () => void listen(auralFrameSweep(select.value)));
  get('wg-fold-export').addEventListener('click', () => {
    const receipt = { schema:'wayglass.frame-to-fold-observation/v0.1', created_at:new Date().toISOString(),
      sample:latestSample, aural_plan:auralFrameCue(latestSample),
      authority:{ mathematical_model_only:true, signed:false, provider_sent:false, physical_crossing:false, device_verified:false } };
    const blob = new Blob([JSON.stringify(receipt,null,2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = root.ownerDocument.createElement('a');
    anchor.href = url; anchor.download = 'wayglass-frame-to-fold-observation.json';
    root.append(anchor); anchor.click(); anchor.remove();
    URL.revokeObjectURL(url);
  });
  render();
  return Object.freeze({
    surface_id:'wayglass:frame-to-fold',
    currentSample:() => latestSample,
    destroy() { disposed = true; void audition.stop(); },
  });
}
