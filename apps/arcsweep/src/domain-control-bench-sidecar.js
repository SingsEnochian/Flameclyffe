import {
  BUILT_IN_DOMAIN_CONTROL_PROFILES,
  compareDomainControlSweeps,
  domainControlProfiles,
  normaliseDomainControlProfile,
  runBidirectionalDomainSweep,
} from './domain-control-bench.js';

const STORE_KEY = 'hearthgate.arcsweep.domain-control-bench.v1';
const MAX_SWEEPS = 12;
let mounting = false;
let memoryFallback = { version: 1, custom_profiles: [], sweeps: [], active_profile_id: BUILT_IN_DOMAIN_CONTROL_PROFILES[0]?.profile_id || null };

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function fixed(value, digits = 3) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '—';
}

function readStore() {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(STORE_KEY) || 'null');
    if (parsed?.version === 1 && Array.isArray(parsed.custom_profiles) && Array.isArray(parsed.sweeps)) return parsed;
  } catch {}
  return structuredClone(memoryFallback);
}

function writeStore(store) {
  memoryFallback = structuredClone(store);
  try { globalThis.localStorage?.setItem(STORE_KEY, JSON.stringify(store)); } catch {}
}

function profilesFor(store) {
  return domainControlProfiles(store.custom_profiles || []);
}

function activeProfile(store) {
  const profiles = profilesFor(store);
  return profiles.find((profile) => profile.profile_id === store.active_profile_id) || profiles[0] || null;
}

function latestSweepFor(store, profileId) {
  return [...(store.sweeps || [])].reverse().find((sweep) => sweep.profile?.profile_id === profileId) || null;
}

function renderSemantics(profile) {
  return ['a', 'b'].map((key) => {
    const semantic = profile.control_semantics[key];
    return `<article class="domain-semantic-card"><span>control ${key}</span><strong>${esc(semantic.label)}</strong><small>${esc(semantic.role)}${semantic.unit ? ` · ${esc(semantic.unit)}` : ''}</small><em>${semantic.intentional ? 'intentional control' : 'non-intentional control'}</em></article>`;
  }).join('');
}

function sweepChart(sweep) {
  if (!sweep) return '<p class="muted">Run a forward/reverse sweep to draw the path.</p>';
  const width = 620;
  const height = 250;
  const padding = 24;
  const all = [...sweep.forward, ...sweep.reverse].filter((point) => Number.isFinite(point.selected_value));
  if (!all.length) return '<p class="muted">No selected equilibrium was available to plot.</p>';
  const xs = all.map((point) => point.swept_value);
  const ys = all.map((point) => point.selected_value);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const xSpan = Math.max(1e-9, maxX - minX);
  const ySpan = Math.max(1e-9, maxY - minY);
  const x = (value) => padding + ((value - minX) / xSpan) * (width - padding * 2);
  const y = (value) => height - padding - ((value - minY) / ySpan) * (height - padding * 2);
  const path = (points) => points
    .filter((point) => Number.isFinite(point.selected_value))
    .map((point) => `${x(point.swept_value).toFixed(2)},${y(point.selected_value).toFixed(2)}`)
    .join(' ');
  const witnesses = sweep.hysteresis.witnesses.slice(0, 24).map((item) => `<circle cx="${x(item.swept_value).toFixed(2)}" cy="${y(item.forward_state).toFixed(2)}" r="3.5" class="domain-witness"><title>${esc(item.swept_label)} ${fixed(item.swept_value)} · separation ${fixed(item.state_separation)}</title></circle>`).join('');
  return `<svg class="domain-sweep-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Forward and reverse cusp sweep"><polyline class="domain-forward" points="${path(sweep.forward)}"/><polyline class="domain-reverse" points="${path(sweep.reverse)}"/>${witnesses}</svg><p class="muted domain-chart-key"><span>Forward</span> · <span>Reverse</span> · witness dots mark branch separation.</p>`;
}

function renderSweepSummary(sweep) {
  if (!sweep) return '<p class="muted">No sweep has been receipted for this profile yet.</p>';
  return `<div class="domain-sweep-result"><div class="section-heading compact-heading"><div><p class="eyebrow">Latest bidirectional sweep</p><h3>${esc(sweep.configuration.swept_label)}</h3></div><span class="bai-topology-badge" data-state="${esc(sweep.summary.topology_state)}">${esc(sweep.summary.topology_state)}</span></div>${sweepChart(sweep)}<dl class="facts"><div><dt>Forward → reverse</dt><dd>${fixed(sweep.configuration.start)} → ${fixed(sweep.configuration.end)} → ${fixed(sweep.configuration.start)}</dd></div><div><dt>Fixed control</dt><dd>${esc(sweep.configuration.fixed_label)} ${fixed(sweep.configuration.fixed_value)}</dd></div><div><dt>Samples</dt><dd>${sweep.configuration.steps} each direction</dd></div><div><dt>Max branches</dt><dd>${sweep.summary.max_equilibrium_count}</dd></div><div><dt>Branch transitions</dt><dd>${sweep.summary.branch_transition_count}</dd></div><div><dt>Hysteresis</dt><dd>${sweep.hysteresis.detected ? `WITNESSED · ${sweep.hysteresis.witness_count}` : 'not witnessed'}</dd></div><div><dt>Loop area</dt><dd>${fixed(sweep.hysteresis.loop_area, 6)}</dd></div><div><dt>Receipt</dt><dd>${esc(sweep.sweep_id)}</dd></div></dl></div>`;
}

function renderComparison(store) {
  const comparison = compareDomainControlSweeps((store.sweeps || []).slice(-8));
  if (!comparison.rows.length) return '<p class="muted">Run sweeps in more than one domain and Arcsweep will compare their topology without pretending the control semantics are interchangeable.</p>';
  return `<div class="domain-comparison-table">${comparison.rows.slice().reverse().map((row) => `<div class="domain-comparison-row"><span><b>${esc(row.profile_name)}</b><small>${esc(row.domain)} · ${esc(row.swept_label)}</small></span><strong>${esc(row.topology_state)}</strong><small>${row.control_b_intentional ? 'b intentional' : 'b non-intentional'} · loop ${fixed(row.hysteresis_loop_area, 4)}</small></div>`).join('')}</div>`;
}

function renderProfileOptions(profiles, activeId) {
  return profiles.map((profile) => `<option value="${esc(profile.profile_id)}" ${profile.profile_id === activeId ? 'selected' : ''}>${esc(profile.name)} · ${esc(profile.domain)}</option>`).join('');
}

function render(store, message = '') {
  const profiles = profilesFor(store);
  const profile = activeProfile(store);
  if (!profile) return '<section class="panel" data-domain-control-bench>No domain profiles are available.</section>';
  const latest = latestSweepFor(store, profile.profile_id);
  const aRange = profile.ranges.a;
  const bRange = profile.ranges.b;
  const custom = !profile.built_in;
  const signature = `${profile.profile_id}:${latest?.sweep_id || 'none'}:${store.custom_profiles.length}:${store.sweeps.length}`;

  return `<section class="panel domain-control-bench" data-domain-control-bench data-domain-bench-key="${esc(signature)}">
    <div class="section-heading compact-heading"><div><p class="eyebrow">Domain-semantic normal form · forward / reverse</p><h2>Domain Control Bench</h2><p class="muted">Give the cusp controls their actual domain meaning, then sweep either axis without manufacturing agency.</p></div></div>
    ${message ? `<p class="callout">${esc(message)}</p>` : ''}
    <div class="grid two compact-grid domain-profile-head"><label>Control profile<select data-domain-action="profile">${renderProfileOptions(profiles, profile.profile_id)}</select></label><div class="domain-profile-meta"><strong>${esc(profile.name)}</strong><span>${esc(profile.domain)} · ${esc(profile.calibration.state)}</span>${custom ? '<button type="button" class="quiet danger" data-domain-action="delete-profile">Delete custom profile</button>' : ''}</div></div>
    <p>${esc(profile.description)}</p>
    ${profile.calibration.note ? `<p class="muted">${esc(profile.calibration.note)}</p>` : ''}
    <div class="grid two compact-grid domain-semantics">${renderSemantics(profile)}</div>
    <form data-domain-sweep-form class="stack">
      <div class="grid three compact-grid"><label>Sweep control<select name="sweptControl"><option value="b">b · ${esc(profile.control_semantics.b.label)}</option><option value="a">a · ${esc(profile.control_semantics.a.label)}</option></select></label><label>Samples each way<input name="steps" type="number" min="5" max="241" step="2" value="61" /></label><label>Initial order parameter x<input name="initialX" type="number" step="0.01" value="${esc(profile.order_parameter)}" /></label></div>
      <div class="grid three compact-grid"><label>Start<input name="start" type="number" step="0.01" value="${esc(bRange.minimum)}" data-domain-sweep-bound="start" /></label><label>End<input name="end" type="number" step="0.01" value="${esc(bRange.maximum)}" data-domain-sweep-bound="end" /></label><label>Fixed a<input name="fixedControl" type="number" step="0.01" value="${esc(aRange.default)}" data-domain-fixed-label /></label></div>
      <button type="submit">Run forward ↔ reverse sweep</button>
    </form>
    ${renderSweepSummary(latest)}
    <details class="domain-custom-profile"><summary>Create a domain profile</summary><form data-domain-profile-form class="stack"><div class="grid two compact-grid"><label>Name<input name="name" required placeholder="e.g. Weather front transition" /></label><label>Domain<input name="domain" required placeholder="meteorology" /></label></div><label>Description<textarea name="description" rows="2" placeholder="What do these controls mean in this domain?"></textarea></label><div class="grid two compact-grid"><fieldset><legend>Control a</legend><label>Label<input name="aLabel" required value="Structure" /></label><label>Role<input name="aRole" required value="structure" /></label><label>Unit<input name="aUnit" placeholder="normal-form" /></label><label class="checkbox"><input name="aIntentional" type="checkbox" /> Intentional control</label><div class="grid three compact-grid"><label>Min<input name="aMin" type="number" step="0.01" value="-2" /></label><label>Max<input name="aMax" type="number" step="0.01" value="0.5" /></label><label>Default<input name="aDefault" type="number" step="0.01" value="-1" /></label></div></fieldset><fieldset><legend>Control b</legend><label>Label<input name="bLabel" required value="Forcing" /></label><label>Role<input name="bRole" required value="forcing" /></label><label>Unit<input name="bUnit" placeholder="normal-form" /></label><label class="checkbox"><input name="bIntentional" type="checkbox" /> Intentional control</label><div class="grid three compact-grid"><label>Min<input name="bMin" type="number" step="0.01" value="-0.6" /></label><label>Max<input name="bMax" type="number" step="0.01" value="0.6" /></label><label>Default<input name="bDefault" type="number" step="0.01" value="0" /></label></div></fieldset></div><label>Calibration note<input name="calibrationNote" value="Normal-form only; domain calibration not yet supplied." /></label><button type="submit">Save domain profile</button></form></details>
    <article class="domain-comparison"><p class="eyebrow">Cross-domain topology comparison</p>${renderComparison(store)}<p class="muted">Comparison is structural only. A control called “accretion rate” is not numerically equated with a control called “Intention” merely because both occupy b in the normal form.</p></article>
  </section>`;
}

function injectStyle() {
  if (document.querySelector('#domain-control-bench-style')) return;
  const style = document.createElement('style');
  style.id = 'domain-control-bench-style';
  style.textContent = `.domain-control-bench{margin-top:1rem}.domain-profile-meta{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;padding-top:1.35rem}.domain-profile-meta span{opacity:.7}.domain-semantic-card{display:flex;flex-direction:column;gap:.2rem;padding:.8rem 1rem;border:1px solid color-mix(in srgb,var(--gold) 25%,transparent);border-radius:12px}.domain-semantic-card>span{font-size:.75rem;text-transform:uppercase;letter-spacing:.08em;opacity:.7}.domain-semantic-card em{font-style:normal;font-size:.78rem;opacity:.7}.domain-sweep-result{margin-top:1rem}.domain-sweep-chart{width:100%;min-height:230px;border:1px solid color-mix(in srgb,var(--gold) 24%,transparent);border-radius:12px;background:color-mix(in srgb,var(--panel-solid) 88%,transparent)}.domain-forward,.domain-reverse{fill:none;stroke-width:2.3}.domain-forward{stroke:var(--gold)}.domain-reverse{stroke:var(--green)}.domain-witness{fill:var(--text)}.domain-chart-key{margin-top:.35rem}.domain-custom-profile{margin-top:1rem;border-top:1px solid color-mix(in srgb,var(--gold) 18%,transparent);padding-top:.8rem}.domain-custom-profile summary{cursor:pointer;font-weight:700}.domain-comparison{margin-top:1.2rem}.domain-comparison-table{display:grid;gap:.45rem}.domain-comparison-row{display:grid;grid-template-columns:minmax(0,1.5fr) .7fr 1fr;gap:.6rem;align-items:center;padding:.65rem .8rem;border:1px solid color-mix(in srgb,var(--gold) 18%,transparent);border-radius:10px}.domain-comparison-row span{display:flex;flex-direction:column}.domain-comparison-row small{opacity:.7}@media(max-width:760px){.domain-comparison-row{grid-template-columns:1fr}.domain-profile-meta{padding-top:0}}`;
  document.head.appendChild(style);
}

function storeSignature(store) {
  const profile = activeProfile(store);
  const latest = profile ? latestSweepFor(store, profile.profile_id) : null;
  return `${profile?.profile_id || 'none'}:${latest?.sweep_id || 'none'}:${store.custom_profiles.length}:${store.sweeps.length}`;
}

function replacePanel(store, message = '') {
  const panel = document.querySelector('[data-domain-control-bench]');
  if (panel) panel.outerHTML = render(store, message);
}

function syncSweepFields(form, profile) {
  const swept = form.elements.sweptControl.value;
  const other = swept === 'a' ? 'b' : 'a';
  form.elements.start.value = profile.ranges[swept].minimum;
  form.elements.end.value = profile.ranges[swept].maximum;
  form.elements.fixedControl.value = profile.ranges[other].default;
  const fixedLabel = form.querySelector('[data-domain-fixed-label]');
  const label = fixedLabel?.closest('label');
  if (label) label.childNodes[0].textContent = `Fixed ${other} · ${profile.control_semantics[other].label}`;
}

async function mount() {
  if (mounting) return;
  const title = document.querySelector('main.content h1')?.textContent?.trim();
  if (!['Relational Feedback Chamber', 'Field · DEEP Observer'].includes(title)) {
    document.querySelector('[data-domain-control-bench]')?.remove();
    return;
  }
  mounting = true;
  try {
    injectStyle();
    const store = readStore();
    const existing = document.querySelector('[data-domain-control-bench]');
    const signature = storeSignature(store);
    if (existing?.dataset.domainBenchKey === signature) return;
    if (existing) existing.outerHTML = render(store);
    else document.querySelector('main.content')?.insertAdjacentHTML('beforeend', render(store));
  } finally {
    mounting = false;
  }
}

document.addEventListener('change', (event) => {
  const profileSelect = event.target.closest('[data-domain-action="profile"]');
  if (profileSelect) {
    const store = readStore();
    store.active_profile_id = profileSelect.value;
    writeStore(store);
    replacePanel(store);
    return;
  }
  if (event.target.matches('[data-domain-sweep-form] select[name="sweptControl"]')) {
    const form = event.target.form;
    const store = readStore();
    const profile = activeProfile(store);
    if (form && profile) syncSweepFields(form, profile);
  }
});

document.addEventListener('submit', async (event) => {
  const sweepForm = event.target.closest('[data-domain-sweep-form]');
  if (sweepForm) {
    event.preventDefault();
    const button = sweepForm.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    try {
      const store = readStore();
      const profile = activeProfile(store);
      if (!profile) throw new Error('No active control profile.');
      const data = new FormData(sweepForm);
      const sweep = await runBidirectionalDomainSweep({
        profile,
        sweptControl: data.get('sweptControl'),
        start: data.get('start'),
        end: data.get('end'),
        steps: Number(data.get('steps')),
        fixedControl: data.get('fixedControl'),
        initialOrderParameter: data.get('initialX'),
      });
      store.sweeps = [...store.sweeps, structuredClone(sweep)].slice(-MAX_SWEEPS);
      writeStore(store);
      replacePanel(store, `Sweep receipted as ${sweep.sweep_id}. ${sweep.hysteresis.detected ? 'Forward and reverse paths separated.' : 'No hysteresis witness in this sweep.'}`);
    } catch (error) {
      const panel = sweepForm.closest('[data-domain-control-bench]');
      const output = panel?.querySelector('.callout') || document.createElement('p');
      output.className = 'callout';
      output.textContent = `Domain sweep stopped: ${error.message}`;
      if (panel && !output.parentElement) panel.prepend(output);
    } finally {
      if (button) button.disabled = false;
    }
    return;
  }

  const profileForm = event.target.closest('[data-domain-profile-form]');
  if (!profileForm) return;
  event.preventDefault();
  try {
    const data = new FormData(profileForm);
    const suffix = globalThis.crypto?.randomUUID?.().slice(0, 8) || Date.now().toString(36);
    const profile = normaliseDomainControlProfile({
      profile_id: `${String(data.get('name')).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'domain'}-${suffix}`,
      name: data.get('name'),
      domain: data.get('domain'),
      description: data.get('description'),
      control_semantics: {
        a: { role: data.get('aRole'), label: data.get('aLabel'), unit: data.get('aUnit'), source: 'user-domain-profile', intentional: profileForm.elements.aIntentional.checked },
        b: { role: data.get('bRole'), label: data.get('bLabel'), unit: data.get('bUnit'), source: 'user-domain-profile', intentional: profileForm.elements.bIntentional.checked },
      },
      ranges: {
        a: { minimum: data.get('aMin'), maximum: data.get('aMax'), default: data.get('aDefault') },
        b: { minimum: data.get('bMin'), maximum: data.get('bMax'), default: data.get('bDefault') },
      },
      calibration: { state: 'normal-form-only', note: data.get('calibrationNote') },
      authority: { physical_calibration: false },
    });
    const store = readStore();
    store.custom_profiles = [...store.custom_profiles.filter((item) => item.profile_id !== profile.profile_id), structuredClone(profile)];
    store.active_profile_id = profile.profile_id;
    writeStore(store);
    replacePanel(store, `Saved ${profile.name}. Both control semantics are explicit.`);
  } catch (error) {
    const panel = profileForm.closest('[data-domain-control-bench]');
    const output = panel?.querySelector('.callout') || document.createElement('p');
    output.className = 'callout';
    output.textContent = `Profile stopped: ${error.message}`;
    if (panel && !output.parentElement) panel.prepend(output);
  }
});

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-domain-action="delete-profile"]');
  if (!button) return;
  const store = readStore();
  const profile = activeProfile(store);
  if (!profile || profile.built_in) return;
  store.custom_profiles = store.custom_profiles.filter((item) => item.profile_id !== profile.profile_id);
  store.active_profile_id = BUILT_IN_DOMAIN_CONTROL_PROFILES[0]?.profile_id || null;
  writeStore(store);
  replacePanel(store, `Removed custom profile ${profile.name}. Sweep receipts remain in the comparison history.`);
});

const observer = new MutationObserver(() => { void mount(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void mount(); }, { once: true });
else void mount();
