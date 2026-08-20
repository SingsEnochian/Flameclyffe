import { loadState, persistObservatoryStore } from './storage.js';
import { createRunaRendererCandidate, reviewRunaRendererCandidate } from './runa-renderer-candidate.js';
import { createRunaPreviewPaletteReceipt } from './runa-preview-palette.js';
import {
  createRunaPreviewEvidenceArm,
  createRunaPreviewPlan,
  createRunaPreviewRenderReceipt,
} from './runa-preview-render.js';
import { launchRunaPreviewPlan, previewIsActive, stopRunaPreview } from './runa-preview-player.js';

const MAX_CANDIDATES = 24;
const MAX_REVIEWS = 24;
const MAX_PREVIEWS = 24;
let mounting = false;

function esc(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
function fixed(value, digits = 3) { return Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '—'; }

async function context() {
  const state = await loadState();
  const world = state.worlds.find((item) => item.id === state.activeWorldId) || state.worlds[0] || null;
  if (!world) return null;
  const obs = state.observatory || {};
  const suggestion = [...(obs.runa_suggestions || [])].reverse().find((item) => item.world_id === world.id) || null;
  const candidate = suggestion
    ? [...(obs.runa_renderer_candidates || [])].reverse().find((item) => item.source?.suggestion_id === suggestion.suggestion_id) || null
    : null;
  const review = candidate
    ? [...(obs.runa_renderer_reviews || [])].reverse().find((item) => item.source?.candidate_id === candidate.candidate_id) || null
    : null;
  const palette = review
    ? [...(obs.runa_preview_palettes || [])].reverse().find((item) => item.source?.renderer_review_id === review.review_id) || null
    : null;
  const previewPlan = review
    ? [...(obs.runa_preview_plans || [])].reverse().find((item) => item.source?.renderer_review_id === review.review_id) || null
    : null;
  const previewRender = previewPlan
    ? [...(obs.runa_preview_renders || [])].reverse().find((item) => item.source?.plan_id === previewPlan.plan_id) || null
    : null;
  const evidenceArm = previewRender
    ? [...(obs.runa_preview_evidence_arms || [])].reverse().find((item) => item.source?.render_id === previewRender.render_id) || null
    : null;
  return { state, world, suggestion, candidate, review, palette, previewPlan, previewRender, evidenceArm };
}

function parameterMarkup(candidate) {
  if (!candidate) return '';
  const p = candidate.compiler.parameters;
  return `<div class="runa-renderer-params"><article><b>World hum</b><span>${p.world_hum.transition_ms} ms</span><span>detune ceiling ${fixed(p.world_hum.detune_limit_cents, 2)} cents</span><span>mix Δ ceiling ${fixed(p.world_hum.mix_delta_limit, 3)}</span><small>root and destination unassigned until preview compilation</small></article><article><b>Keyboard harmonics</b><span>${p.keyboard_harmonics.transition_ms} ms</span><span>blend Δ ceiling ${fixed(p.keyboard_harmonics.harmonic_blend_delta_limit, 3)}</span><span>velocity mix Δ ${fixed(p.keyboard_harmonics.velocity_mix_delta_limit, 3)}</span><small>harmonic set requires explicit palette selection</small></article><article><b>Environment</b><span>${p.environmental_soundscape.transition_ms} ms</span><span>layer mix Δ ${fixed(p.environmental_soundscape.layer_mix_delta_limit, 3)}</span><span>filter motion ≤ ${fixed(p.environmental_soundscape.filter_motion_octaves_limit, 3)} oct</span><small>source layer requires explicit palette selection</small></article></div>`;
}

function paletteMarkup(c) {
  const { review, palette } = c;
  if (review?.decision !== 'approved') return '';
  if (palette) {
    return `<div class="callout"><b>Preview palette receipted</b> · ${esc(palette.palette_id)} · harmonics ${esc(palette.selection.harmonic_set)} · environment ${esc(palette.selection.environment_source)}</div>`;
  }
  return `<article class="runa-preview-stage"><p class="eyebrow">Preview palette</p><p class="muted">Choose which still-unassigned sound materials may enter this temporary audition. “None” is a valid explicit choice. This receipt affects preview only.</p><div class="grid two compact-grid"><label>Keyboard harmonic set<select data-runa-palette-harmonics><option value="none">None</option><option value="root-fifth-octave">Root · fifth · octave</option><option value="root-third-fifth">Root · third · fifth</option><option value="root-octaves">Root · octaves</option></select></label><label>Environment source<select data-runa-palette-environment><option value="none">None</option><option value="filtered-noise">Filtered noise bed</option></select></label></div><label>Selected by<input data-runa-palette-selector value="Rowan" /></label><label>Palette note<input data-runa-palette-note placeholder="Optional reason for this audition palette." /></label><button type="button" data-runa-preview-action="palette">Receipt preview palette</button></article>`;
}

function previewMarkup(c) {
  const { review, palette, previewPlan, previewRender, evidenceArm } = c;
  if (review?.decision !== 'approved') return '';
  if (!palette) return paletteMarkup(c);
  if (!previewPlan) {
    return `${paletteMarkup(c)}<article class="runa-preview-stage"><p class="eyebrow">Preview compilation</p><p>The renderer mapping and palette are explicit. Planning still starts no audio.</p><button type="button" data-runa-preview-action="plan">Compile temporary preview plan</button></article>`;
  }
  const p = previewPlan.preview;
  const outputs = [
    'world hum',
    p.keyboard_harmonics?.assigned ? `keyboard ${p.keyboard_harmonics.harmonic_set}` : null,
    p.environmental_soundscape?.assigned ? p.environmental_soundscape.source : null,
  ].filter(Boolean).join(' · ');
  const plan = `${paletteMarkup(c)}<dl class="facts"><div><dt>Plan</dt><dd>${esc(previewPlan.plan_id)}</dd></div><div><dt>Base</dt><dd>${fixed(p.base_hz, 3)} Hz</dd></div><div><dt>Audition target</dt><dd>${fixed(p.target_hz, 3)} Hz</dd></div><div><dt>Excursion</dt><dd>${fixed(p.detune_cents, 2)} cents</dd></div><div><dt>Duration</dt><dd>${p.duration_ms} ms</dd></div><div><dt>Outputs</dt><dd>${esc(outputs)}</dd></div></dl>`;
  if (!previewRender) {
    return `<article class="runa-preview-stage"><p class="eyebrow">Executable preview plan</p>${plan}<p class="muted">All selected layers stay inside the reviewed modulation ceilings. The plan does not change the saved world root or bus levels and cannot emit haptic, MIDI, SoundFont, canon, PREMAQC, or autoplay actions.</p><label>Launched by<input data-runa-preview-launcher value="Rowan" /></label><div class="button-row"><button type="button" data-runa-preview-action="launch">Launch preview explicitly</button><button type="button" class="quiet" data-runa-preview-action="stop">Feather · stop preview</button></div></article>`;
  }
  const render = `<div class="callout"><b>Render receipted</b> · ${esc(previewRender.render_id)} · ${Math.round(previewRender.runtime.actual_duration_ms)} ms · persistent root ${fixed(previewRender.runtime.root_hz_before, 3)} → ${fixed(previewRender.runtime.root_hz_after, 3)} Hz${previewRender.runtime.stopped_early ? ` · stopped by ${esc(previewRender.runtime.stop_reason)}` : ''}</div>`;
  if (!evidenceArm) {
    return `<article class="runa-preview-stage"><p class="eyebrow">Preview completed</p>${plan}${render}<p class="muted">The render receipt records the intervention only. It does not infer what changed in you, the world, PREMAQC, or Qualia.</p><label>Attach evidence by<input data-runa-preview-armer value="Rowan" /></label><button type="button" data-runa-preview-action="arm">Use this render as context for the next Feedback observation</button></article>`;
  }
  return `<article class="runa-preview-stage"><p class="eyebrow">Observation bridge armed</p>${plan}${render}<div class="callout"><b>Next reviewable Feedback cycle only</b> · ${esc(evidenceArm.arm_id)}</div><p class="muted">The next eligible Feedback observation in this world may be linked to the render as intervention context. It must still record an observed response and pass the normal human review before DEEPTime can admit it.</p></article>`;
}

function render(c, message = '') {
  const { world, suggestion, candidate, review, palette, previewPlan, previewRender, evidenceArm } = c;
  const key = `${world.id}:${suggestion?.suggestion_id || 'none'}:${candidate?.candidate_id || 'none'}:${review?.review_id || 'none'}:${palette?.palette_id || 'none'}:${previewPlan?.plan_id || 'none'}:${previewRender?.render_id || 'none'}:${evidenceArm?.arm_id || 'none'}:${previewIsActive() ? 'playing' : 'idle'}`;
  const badge = previewIsActive() ? 'PLAYING' : evidenceArm ? 'OBSERVE NEXT' : previewRender ? 'RENDERED' : previewPlan ? 'PLAN READY' : palette ? 'PALETTE READY' : review ? esc(review.decision.toUpperCase()) : candidate ? 'CANDIDATE' : suggestion ? 'READY' : 'WAITING';
  return `<section class="panel runa-renderer-forge" data-runa-renderer-forge data-runa-renderer-key="${esc(key)}"><div class="section-heading compact-heading"><div><p class="eyebrow">Suggestion → bounded DSP → review → palette → explicit preview → observation</p><h2>Runa Renderer Forge</h2><p class="muted">Trajectory determines bounded motion. You determine which unassigned sound materials are admitted to the temporary audition. Playback remains a separate explicit act.</p></div><span class="bai-topology-badge">${badge}</span></div>${message ? `<p class="callout">${esc(message)}</p>` : ''}${suggestion ? `<p>Source suggestion: <b>${esc(suggestion.suggestion_id)}</b> · movement ${fixed(suggestion.semantic_intent?.transition_amount)} · ${esc(suggestion.semantic_intent?.transition_envelope)}</p>` : '<p class="muted">Create a Runa Trajectory Suggestion first.</p>'}${suggestion && !candidate ? '<button type="button" data-runa-renderer-action="compile">Compile bounded renderer candidate</button>' : ''}${candidate ? `<article class="runa-renderer-candidate"><p class="eyebrow">Compiler candidate</p><strong>${esc(candidate.candidate_id)}</strong><p class="muted">Policy ${esc(candidate.compiler.policy_id)} · executable: no · render authorised: no</p>${parameterMarkup(candidate)}${review ? `<div class="callout"><b>${esc(review.decision)}</b> by ${esc(review.reviewed_by)} · ${esc(review.review_id)}</div><p class="muted">${review.decision === 'approved' ? 'Approved for preview compilation only. No audio began at review time.' : 'No preview compilation is authorised from this review.'}</p>` : `<div class="runa-renderer-review"><label>Reviewer<input data-runa-renderer-reviewer value="Rowan" /></label><label>Review note<textarea data-runa-renderer-note rows="2" placeholder="Why this mapping is acceptable, needs adjustment, or should stop."></textarea></label><div class="button-row"><button type="button" data-runa-renderer-action="review" data-decision="approved">Approve for preview compilation</button><button type="button" class="quiet" data-runa-renderer-action="review" data-decision="adjust">Adjust</button><button type="button" class="quiet" data-runa-renderer-action="review" data-decision="rejected">Reject</button></div></div>`}</article>` : ''}${previewMarkup(c)}</section>`;
}

function injectStyle() {
  if (document.querySelector('#runa-renderer-forge-style')) return;
  const style = document.createElement('style');
  style.id = 'runa-renderer-forge-style';
  style.textContent = `.runa-renderer-forge{margin-top:1rem}.runa-renderer-candidate,.runa-preview-stage{margin-top:.8rem;padding:.9rem 1rem;border:1px solid color-mix(in srgb,var(--gold) 22%,transparent);border-radius:12px}.runa-renderer-params{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.5rem;margin:.7rem 0}.runa-renderer-params article{display:flex;flex-direction:column;gap:.2rem;padding:.65rem .7rem;border:1px solid color-mix(in srgb,var(--text) 14%,transparent);border-radius:9px}.runa-renderer-params small{opacity:.7}.runa-renderer-review,.runa-preview-stage{display:grid;gap:.55rem}@media(max-width:760px){.runa-renderer-params{grid-template-columns:1fr}}`;
  document.head.appendChild(style);
}

async function mount(message = '') {
  if (mounting) return;
  const title = document.querySelector('main.content h1')?.textContent?.trim();
  if (!['Relational Feedback Chamber', 'Field · DEEP Observer'].includes(title)) {
    document.querySelector('[data-runa-renderer-forge]')?.remove();
    return;
  }
  mounting = true;
  try {
    injectStyle();
    const c = await context();
    if (!c) return;
    const existing = document.querySelector('[data-runa-renderer-forge]');
    const html = render(c, message);
    if (existing) existing.outerHTML = html;
    else document.querySelector('main.content')?.insertAdjacentHTML('beforeend', html);
  } finally { mounting = false; }
}

async function persistPreviewArray(state, key, value, reason, meta = {}) {
  const obs = structuredClone(state.observatory || {});
  obs[key] ||= [];
  const idKey = value.palette_id ? 'palette_id' : value.plan_id ? 'plan_id' : value.render_id ? 'render_id' : value.arm_id ? 'arm_id' : null;
  const idValue = idKey ? value[idKey] : null;
  obs[key] = [...obs[key].filter((item) => !idKey || item[idKey] !== idValue), structuredClone(value)].slice(-MAX_PREVIEWS);
  await persistObservatoryStore(obs, { reason, ...meta });
}

document.addEventListener('click', async (event) => {
  const rendererButton = event.target.closest('[data-runa-renderer-action]');
  if (rendererButton) {
    try {
      const c = await context();
      if (!c?.suggestion) throw new Error('A Runa trajectory suggestion is required.');
      const obs = structuredClone(c.state.observatory || {});
      obs.runa_renderer_candidates ||= [];
      obs.runa_renderer_reviews ||= [];
      if (rendererButton.dataset.runaRendererAction === 'compile') {
        if (c.candidate) throw new Error('This suggestion already has a renderer candidate.');
        const candidate = await createRunaRendererCandidate({ suggestion: c.suggestion });
        obs.runa_renderer_candidates = [...obs.runa_renderer_candidates.filter((item) => item.candidate_id !== candidate.candidate_id), structuredClone(candidate)].slice(-MAX_CANDIDATES);
        await persistObservatoryStore(obs, { reason: 'runa-renderer-candidate', candidateId: candidate.candidate_id });
        await mount(`Renderer candidate receipted as ${candidate.candidate_id}. Nothing rendered.`);
        return;
      }
      if (rendererButton.dataset.runaRendererAction === 'review') {
        if (!c.candidate) throw new Error('Compile a renderer candidate before review.');
        if (c.review) throw new Error('This candidate already has a review receipt.');
        const panel = rendererButton.closest('[data-runa-renderer-forge]');
        const review = await reviewRunaRendererCandidate({
          candidate: c.candidate,
          decision: rendererButton.dataset.decision,
          reviewedBy: panel.querySelector('[data-runa-renderer-reviewer]')?.value,
          note: panel.querySelector('[data-runa-renderer-note]')?.value,
        });
        obs.runa_renderer_reviews = [...obs.runa_renderer_reviews.filter((item) => item.review_id !== review.review_id), structuredClone(review)].slice(-MAX_REVIEWS);
        await persistObservatoryStore(obs, { reason: 'runa-renderer-review', reviewId: review.review_id, decision: review.decision });
        await mount(`Renderer review receipted as ${review.review_id} · ${review.decision}. Render authority remains false.`);
      }
    } catch (error) { await mount(`Runa Renderer Forge stopped: ${error.message}`); }
    return;
  }

  const previewButton = event.target.closest('[data-runa-preview-action]');
  if (!previewButton) return;
  try {
    const c = await context();
    if (!c) throw new Error('No active world is available.');
    const action = previewButton.dataset.runaPreviewAction;
    if (action === 'palette') {
      if (c.review?.decision !== 'approved') throw new Error('An approved renderer review is required.');
      if (c.palette) throw new Error('This renderer review already has a preview palette receipt.');
      const panel = previewButton.closest('[data-runa-renderer-forge]');
      const palette = await createRunaPreviewPaletteReceipt({
        rendererReview: c.review,
        selectedBy: panel.querySelector('[data-runa-palette-selector]')?.value,
        harmonicSet: panel.querySelector('[data-runa-palette-harmonics]')?.value || 'none',
        environmentSource: panel.querySelector('[data-runa-palette-environment]')?.value || 'none',
        note: panel.querySelector('[data-runa-palette-note]')?.value || '',
      });
      await persistPreviewArray(c.state, 'runa_preview_palettes', palette, 'runa-preview-palette', { paletteId: palette.palette_id });
      await mount(`Preview palette receipted as ${palette.palette_id}. Nothing rendered.`);
      return;
    }
    if (action === 'plan') {
      if (c.review?.decision !== 'approved') throw new Error('An approved renderer review is required.');
      if (!c.palette) throw new Error('Receipt the preview palette first.');
      if (c.previewPlan) throw new Error('This renderer review already has a preview plan.');
      const plan = await createRunaPreviewPlan({ rendererReview: c.review, world: c.world, paletteReceipt: c.palette });
      await persistPreviewArray(c.state, 'runa_preview_plans', plan, 'runa-preview-plan', { planId: plan.plan_id, paletteId: c.palette.palette_id });
      await mount(`Preview plan receipted as ${plan.plan_id}. Audio remains idle until explicit launch.`);
      return;
    }
    if (action === 'stop') {
      const stopped = stopRunaPreview('Feather');
      await mount(stopped ? 'Feather received. The temporary Runa preview is stopping.' : 'No temporary Runa preview is active.');
      return;
    }
    if (action === 'launch') {
      if (!c.previewPlan) throw new Error('Compile a preview plan first.');
      if (c.previewRender) throw new Error('This preview plan already has a render receipt.');
      const panel = previewButton.closest('[data-runa-renderer-forge]');
      const launchedBy = panel.querySelector('[data-runa-preview-launcher]')?.value;
      if (!String(launchedBy || '').trim()) throw new Error('Launched by is required.');
      await mount('Temporary preview launched by explicit user action. Feather remains available.');
      const runtime = await launchRunaPreviewPlan(c.previewPlan);
      const renderReceipt = await createRunaPreviewRenderReceipt({ plan: c.previewPlan, runtime, launchedBy });
      const refreshed = await context();
      await persistPreviewArray(refreshed.state, 'runa_preview_renders', renderReceipt, 'runa-preview-render', { renderId: renderReceipt.render_id, planId: c.previewPlan.plan_id });
      await mount(`Preview render receipted as ${renderReceipt.render_id}. Persistent world root remained ${fixed(runtime.root_hz_after, 3)} Hz.`);
      return;
    }
    if (action === 'arm') {
      if (!c.previewRender) throw new Error('A completed preview render receipt is required.');
      if (c.evidenceArm) throw new Error('This render is already armed for observation evidence.');
      const panel = previewButton.closest('[data-runa-renderer-forge]');
      const armedBy = panel.querySelector('[data-runa-preview-armer]')?.value;
      const arm = await createRunaPreviewEvidenceArm({ renderReceipt: c.previewRender, armedBy });
      await persistPreviewArray(c.state, 'runa_preview_evidence_arms', arm, 'runa-preview-evidence-arm', { armId: arm.arm_id, renderId: c.previewRender.render_id });
      await mount(`Observation bridge armed as ${arm.arm_id}. The next reviewable Feedback cycle in ${c.world.name} can be linked as intervention context.`);
    }
  } catch (error) { await mount(`Runa preview stopped: ${error.message}`); }
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('[data-action="feather-feedback"]')) return;
  stopRunaPreview('Feather');
}, true);

globalThis.addEventListener?.('arcsweep:receipts-updated', () => { void mount(); });

const observer = new MutationObserver(() => { if (!document.querySelector('[data-runa-renderer-forge]')) void mount(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void mount(); }, { once: true });
else void mount();
