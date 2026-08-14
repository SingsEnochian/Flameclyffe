import { loadState, persistObservatoryStore } from './storage.js';
import { createRunaRendererCandidate, reviewRunaRendererCandidate } from './runa-renderer-candidate.js';

const MAX_CANDIDATES = 24;
const MAX_REVIEWS = 24;
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
  return { state, world, suggestion, candidate, review };
}

function parameterMarkup(candidate) {
  if (!candidate) return '';
  const p = candidate.compiler.parameters;
  return `<div class="runa-renderer-params"><article><b>World hum</b><span>${p.world_hum.transition_ms} ms</span><span>detune ceiling ${fixed(p.world_hum.detune_limit_cents, 2)} cents</span><span>mix Δ ceiling ${fixed(p.world_hum.mix_delta_limit, 3)}</span><small>root and destination unassigned</small></article><article><b>Keyboard harmonics</b><span>${p.keyboard_harmonics.transition_ms} ms</span><span>blend Δ ceiling ${fixed(p.keyboard_harmonics.harmonic_blend_delta_limit, 3)}</span><span>velocity mix Δ ${fixed(p.keyboard_harmonics.velocity_mix_delta_limit, 3)}</span><small>harmonic set unassigned</small></article><article><b>Environment</b><span>${p.environmental_soundscape.transition_ms} ms</span><span>layer mix Δ ${fixed(p.environmental_soundscape.layer_mix_delta_limit, 3)}</span><span>filter motion ≤ ${fixed(p.environmental_soundscape.filter_motion_octaves_limit, 3)} oct</span><small>source layers unassigned</small></article></div>`;
}

function render(c, message = '') {
  const { world, suggestion, candidate, review } = c;
  const key = `${world.id}:${suggestion?.suggestion_id || 'none'}:${candidate?.candidate_id || 'none'}:${review?.review_id || 'none'}`;
  return `<section class="panel runa-renderer-forge" data-runa-renderer-forge data-runa-renderer-key="${esc(key)}"><div class="section-heading compact-heading"><div><p class="eyebrow">Suggestion → bounded DSP candidate → explicit review</p><h2>Runa Renderer Forge</h2><p class="muted">Compile the semantic trajectory into bounded renderer parameters without assigning a world root, destination tone, source layer, haptic pattern, playback command, or autoplay authority.</p></div><span class="bai-topology-badge">${review ? esc(review.decision.toUpperCase()) : candidate ? 'CANDIDATE' : suggestion ? 'READY' : 'WAITING'}</span></div>${message ? `<p class="callout">${esc(message)}</p>` : ''}${suggestion ? `<p>Source suggestion: <b>${esc(suggestion.suggestion_id)}</b> · movement ${fixed(suggestion.semantic_intent?.transition_amount)} · ${esc(suggestion.semantic_intent?.transition_envelope)}</p>` : '<p class="muted">Create a Runa Trajectory Suggestion first.</p>'}${suggestion && !candidate ? '<button type="button" data-runa-renderer-action="compile">Compile bounded renderer candidate</button>' : ''}${candidate ? `<article class="runa-renderer-candidate"><p class="eyebrow">Compiler candidate</p><strong>${esc(candidate.candidate_id)}</strong><p class="muted">Policy ${esc(candidate.compiler.policy_id)} · executable: no · render authorised: no</p>${parameterMarkup(candidate)}${review ? `<div class="callout"><b>${esc(review.decision)}</b> by ${esc(review.reviewed_by)} · ${esc(review.review_id)}</div><p class="muted">${review.decision === 'approved' ? 'Approved for the next preview-compilation stage only. No sound or haptic output was started.' : 'No preview compilation is authorised from this review.'}</p>` : `<div class="runa-renderer-review"><label>Reviewer<input data-runa-renderer-reviewer value="Rowan" /></label><label>Review note<textarea data-runa-renderer-note rows="2" placeholder="Why this mapping is acceptable, needs adjustment, or should stop."></textarea></label><div class="button-row"><button type="button" data-runa-renderer-action="review" data-decision="approved">Approve for preview compilation</button><button type="button" class="quiet" data-runa-renderer-action="review" data-decision="adjust">Adjust</button><button type="button" class="quiet" data-runa-renderer-action="review" data-decision="rejected">Reject</button></div></div>`}</article>` : ''}</section>`;
}

function injectStyle() {
  if (document.querySelector('#runa-renderer-forge-style')) return;
  const style = document.createElement('style');
  style.id = 'runa-renderer-forge-style';
  style.textContent = `.runa-renderer-forge{margin-top:1rem}.runa-renderer-candidate{margin-top:.8rem;padding:.9rem 1rem;border:1px solid color-mix(in srgb,var(--gold) 22%,transparent);border-radius:12px}.runa-renderer-params{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.5rem;margin:.7rem 0}.runa-renderer-params article{display:flex;flex-direction:column;gap:.2rem;padding:.65rem .7rem;border:1px solid color-mix(in srgb,var(--text) 14%,transparent);border-radius:9px}.runa-renderer-params small{opacity:.7}.runa-renderer-review{display:grid;gap:.55rem;margin-top:.8rem}@media(max-width:760px){.runa-renderer-params{grid-template-columns:1fr}}`;
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

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-runa-renderer-action]');
  if (!button) return;
  try {
    const c = await context();
    if (!c?.suggestion) throw new Error('A Runa trajectory suggestion is required.');
    const obs = structuredClone(c.state.observatory || {});
    obs.runa_renderer_candidates ||= [];
    obs.runa_renderer_reviews ||= [];
    if (button.dataset.runaRendererAction === 'compile') {
      if (c.candidate) throw new Error('This suggestion already has a renderer candidate.');
      const candidate = await createRunaRendererCandidate({ suggestion: c.suggestion });
      obs.runa_renderer_candidates = [...obs.runa_renderer_candidates.filter((item) => item.candidate_id !== candidate.candidate_id), structuredClone(candidate)].slice(-MAX_CANDIDATES);
      await persistObservatoryStore(obs, { reason: 'runa-renderer-candidate', candidateId: candidate.candidate_id });
      await mount(`Renderer candidate receipted as ${candidate.candidate_id}. Nothing rendered.`);
      return;
    }
    if (button.dataset.runaRendererAction === 'review') {
      if (!c.candidate) throw new Error('Compile a renderer candidate before review.');
      if (c.review) throw new Error('This candidate already has a review receipt.');
      const panel = button.closest('[data-runa-renderer-forge]');
      const review = await reviewRunaRendererCandidate({
        candidate: c.candidate,
        decision: button.dataset.decision,
        reviewedBy: panel.querySelector('[data-runa-renderer-reviewer]')?.value,
        note: panel.querySelector('[data-runa-renderer-note]')?.value,
      });
      obs.runa_renderer_reviews = [...obs.runa_renderer_reviews.filter((item) => item.review_id !== review.review_id), structuredClone(review)].slice(-MAX_REVIEWS);
      await persistObservatoryStore(obs, { reason: 'runa-renderer-review', reviewId: review.review_id, decision: review.decision });
      await mount(`Renderer review receipted as ${review.review_id} · ${review.decision}. Render authority remains false.`);
    }
  } catch (error) { await mount(`Runa Renderer Forge stopped: ${error.message}`); }
});

globalThis.addEventListener?.('arcsweep:receipts-updated', () => { void mount(); });

const observer = new MutationObserver(() => { if (!document.querySelector('[data-runa-renderer-forge]')) void mount(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void mount(); }, { once: true });
else void mount();
