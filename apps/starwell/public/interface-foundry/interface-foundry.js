export const INTERACTION_STAGES = Object.freeze([
  Object.freeze({ id: 'glance', label: 'Glance', description: 'Communicate state without requiring interaction.' }),
  Object.freeze({ id: 'inspect', label: 'Inspect', description: 'Reveal context, provenance, explanation, or related data.' }),
  Object.freeze({ id: 'open', label: 'Open / Act', description: 'Open the full entity, route, thread, filter, or explicit action.' }),
]);

export const INTERFACE_THEMES = Object.freeze({
  'arcsweep-hud': Object.freeze({
    id: 'arcsweep-hud', label: 'ArcSweep HUD',
    description: 'High-energy diagnostic projection extracted from the JCINK HUD skin.',
    accent: '#00f3ff', accentAlt: '#bd00ff', signal: '#cca43b',
    surface: '#030307', surfaceRaised: '#0b0717', text: '#e2e8f0', muted: '#94a3b8',
    line: 'rgba(0,243,255,0.18)', glow: 'rgba(189,0,255,0.16)',
  }),
  'universal-codex': Object.freeze({
    id: 'universal-codex', label: 'Universal Codex',
    description: 'Quiet archival projection: ink, ivory, restrained gold, provenance first.',
    accent: '#d7bb73', accentAlt: '#7f9f98', signal: '#e9d9ad',
    surface: '#0c0e12', surfaceRaised: '#15181d', text: '#f2ead8', muted: '#aaa28f',
    line: 'rgba(215,187,115,0.25)', glow: 'rgba(215,187,115,0.14)',
  }),
  'epra-atlas': Object.freeze({
    id: 'epra-atlas', label: 'Epra Atlas',
    description: 'Living cartographic instrument: stone, sea-glass, biological teal, and celestial gold.',
    accent: '#4ed6cf', accentAlt: '#9ac9b8', signal: '#d6b86e',
    surface: '#071010', surfaceRaised: '#10201d', text: '#edf2df', muted: '#91a59a',
    line: 'rgba(78,214,207,0.22)', glow: 'rgba(78,214,207,0.16)',
  }),
  'house-commons': Object.freeze({
    id: 'house-commons', label: 'House Commons',
    description: 'Social projection tuned for presence, threads, actions, and readable long-form conversation.',
    accent: '#8fc5b8', accentAlt: '#d7a56e', signal: '#e1c98f',
    surface: '#0d1113', surfaceRaised: '#161c1f', text: '#edf0e8', muted: '#9ca7a1',
    line: 'rgba(143,197,184,0.2)', glow: 'rgba(143,197,184,0.12)',
  }),
  jcink: Object.freeze({
    id: 'jcink', label: 'JCINK',
    description: 'Forum adapter profile preserving the original HUD energy and selector-friendly component shapes.',
    accent: '#00f3ff', accentAlt: '#bd00ff', signal: '#cca43b',
    surface: '#030307', surfaceRaised: '#0b0717', text: '#e2e8f0', muted: '#94a3b8',
    line: 'rgba(0,243,255,0.18)', glow: 'rgba(189,0,255,0.16)',
  }),
});

export const COMPONENT_CATALOGUE = Object.freeze([
  Object.freeze({
    id: 'status-rune', family: 'status', label: 'Status Rune',
    summary: 'Compact semantic state marker. Colour is decoration; text/state remains available.',
    sourceHooks: ['.holo-status-rune', '.pulse-indicator'],
    states: ['idle', 'active', 'attention', 'unavailable'],
    actions: ['inspect state', 'open source receipt'],
  }),
  Object.freeze({
    id: 'vector-meter', family: 'data', label: 'Vector Meter',
    summary: 'Meter with accessible numeric value, explanation, and provenance trail.',
    sourceHooks: ['.vector-bar-track', '.vector-bar-fill', '.vector-card'],
    states: ['nominal', 'elevated', 'uncertain'],
    actions: ['inspect evidence', 'open history'],
  }),
  Object.freeze({
    id: 'profile-shell', family: 'identity', label: 'Profile Shell',
    summary: 'Identity/presence projection with role, activity, and explicit links to the full entity.',
    sourceHooks: ['.psionic-mini-profile', '.epran-profile-hud', '.glowhound-directory-card'],
    states: ['offline', 'present', 'busy', 'away'],
    actions: ['inspect presence', 'open profile'],
  }),
  Object.freeze({
    id: 'atlas-marker', family: 'world', label: 'Atlas Marker',
    summary: 'Interactive location marker backed by a real Codex entity rather than decorative map paint.',
    sourceHooks: ['Epra Atlas projection'],
    states: ['landmark', 'dragon-range', 'psionic-site', 'story-event'],
    actions: ['inspect location', 'open Codex entity', 'focus map'],
  }),
  Object.freeze({
    id: 'commons-message', family: 'social', label: 'Commons Message',
    summary: 'Structured social artefact with stable identity, thread context, reactions, and actions.',
    sourceHooks: ['House Commons projection'],
    states: ['normal', 'mentioned', 'action-required'],
    actions: ['reply', 'open thread', 'inspect provenance'],
  }),
  Object.freeze({
    id: 'cut-panel', family: 'surface', label: 'Cut-Corner Panel',
    summary: 'Reusable surface primitive extracted from JCINK category, topic, and posting shells.',
    sourceHooks: ['.hologram-category-block', '.psionic-topic-row', '.ep-post-wrap'],
    states: ['rest', 'hover', 'selected'],
    actions: ['open', 'pin', 'collapse'],
  }),
  Object.freeze({
    id: 'navigation-dock', family: 'navigation', label: 'Navigation Dock',
    summary: 'Grouped navigation with expandable sections and explicit current-location state.',
    sourceHooks: ['.hud-sidebar', '.hud-dropdown-container', '.hud-nav-link'],
    states: ['rest', 'current', 'expanded'],
    actions: ['open route', 'expand group'],
  }),
  Object.freeze({
    id: 'post-shell', family: 'writing', label: 'Post Shell',
    summary: 'Posting / dossier surface that can carry character, thread, continuity, and provenance context.',
    sourceHooks: ['.ep-post-wrap', '.ep-post-flight', '.ep-post-ledger', '.terminal-clasp-gantry'],
    states: ['draft', 'published', 'archived'],
    actions: ['inspect author/context', 'open thread', 'open provenance'],
  }),
]);

export function themeVariables(themeId = 'epra-atlas') {
  const theme = INTERFACE_THEMES[themeId] || INTERFACE_THEMES['epra-atlas'];
  return {
    '--if-accent': theme.accent,
    '--if-accent-alt': theme.accentAlt,
    '--if-signal': theme.signal,
    '--if-surface': theme.surface,
    '--if-surface-raised': theme.surfaceRaised,
    '--if-text': theme.text,
    '--if-muted': theme.muted,
    '--if-line': theme.line,
    '--if-glow': theme.glow,
  };
}

export function componentSpec(componentId) {
  const component = COMPONENT_CATALOGUE.find((item) => item.id === componentId);
  if (!component) return null;
  return {
    schema: 'starwell.interface-component/v1',
    component_id: component.id,
    family: component.family,
    label: component.label,
    interaction: INTERACTION_STAGES.map((stage) => stage.id),
    semantic_state_required: true,
    colour_only_state_forbidden: true,
    canonical_truth_owned_elsewhere: true,
    source_hooks: [...component.sourceHooks],
    states: [...component.states],
    actions: [...component.actions],
  };
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label, onClick, className = '') {
  const node = el('button', className, label);
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}

function demoStatus(host) {
  const states = ['idle', 'active', 'attention', 'unavailable'];
  let index = 1;
  const stateText = el('strong', '', states[index]);
  const control = button('', () => { index = (index + 1) % states.length; render(); }, 'if-status-rune');
  function render() {
    const state = states[index];
    stateText.textContent = state;
    control.className = `if-status-rune state-${state}`;
    control.innerHTML = `<span aria-hidden="true">◇</span><span>${state}</span>`;
    control.setAttribute('aria-label', `Status: ${state}. Activate to cycle state.`);
  }
  render();
  host.append(demoHeading('Status rune', stateText), control, inspect('The shape/glow is redundant decoration. The semantic state is always text and can link to a receipt.'));
}

function demoMeter(host) {
  let value = 68;
  const valueNode = el('strong', '', `${value}%`);
  const label = el('label', 'if-meter-label', 'Coherence sample'); label.htmlFor = 'if-meter-range';
  const progress = el('progress', 'if-meter'); progress.max = 100; progress.value = value; progress.textContent = `${value}%`;
  const range = el('input'); range.id = 'if-meter-range'; range.type = 'range'; range.min = 0; range.max = 100; range.value = value;
  range.addEventListener('input', () => { value = Number(range.value); progress.value = value; valueNode.textContent = `${value}%`; });
  host.append(demoHeading('Vector meter', valueNode), label, progress, range, inspect('Demo value only. Production meters expose provenance and never turn missing evidence into invented numbers.'));
}

function demoProfile(host) {
  const avatar = el('div', 'if-avatar', 'HG'); avatar.setAttribute('aria-hidden', 'true');
  const text = el('div'); text.innerHTML = '<span class="if-kicker">Presence projection</span><h3>Hearth Glint</h3><p>Cartographer · present</p>';
  const expanded = el('div', 'if-expanded'); expanded.hidden = true; expanded.innerHTML = '<strong>Presence is not identity.</strong><p>Text, portrait, voice, avatar, or VRM are projections of one participant record.</p>';
  const toggle = button('Inspect', () => { expanded.hidden = !expanded.hidden; toggle.textContent = expanded.hidden ? 'Inspect' : 'Close'; toggle.setAttribute('aria-expanded', String(!expanded.hidden)); });
  toggle.setAttribute('aria-expanded', 'false');
  host.classList.add('if-profile-card'); host.append(avatar, text, toggle, expanded);
}

function demoAtlas(host) {
  const kinds = ['landmark', 'dragon-range', 'psionic-site', 'story-event'];
  let index = 0;
  const kindNode = el('strong', '', kinds[index]);
  const map = el('div', 'if-map-sample'); map.setAttribute('role', 'img');
  const marker = button('✦', () => { index = (index + 1) % kinds.length; render(); }, 'if-map-marker');
  function render() {
    const kind = kinds[index]; kindNode.textContent = kind; marker.className = `if-map-marker marker-${kind}`;
    marker.title = kind; marker.setAttribute('aria-label', `${kind} marker. Activate to cycle sample type.`);
    map.setAttribute('aria-label', `Epra map sample with selected ${kind} marker`);
  }
  render(); map.append(marker);
  host.append(demoHeading('Atlas marker', kindNode), map, el('p', '', 'Marker → Codex entity → provenance / routes / cinematic path.'));
}

function demoMessage(host) {
  let starred = false;
  host.classList.add('if-message-card');
  const actions = el('div', 'if-message-actions');
  const star = button('☆ Star', () => { starred = !starred; star.textContent = starred ? '★ Starred' : '☆ Star'; star.setAttribute('aria-pressed', String(starred)); });
  star.setAttribute('aria-pressed', 'false');
  actions.append(star, button('Open thread', () => announce('Thread action sampled.')), button('Why?', () => announce('Provenance/explanation action sampled.')));
  const body = el('p'); body.innerHTML = '<b>Nocturne</b> · I found two canyon routes. The north route exposes the dragon range; the south route gives us the sunrise reveal.';
  host.append(demoHeading('House Commons', el('strong', '', '#epra-atlas')), body, actions);
}

function demoPanel(host) {
  let open = true;
  const body = el('div', 'if-panel-body'); body.innerHTML = '<h3>JCINK → shared primitive</h3><p>The forum category/topic/post shapes become reusable surfaces. JCINK selectors stay in the adapter, not in the component contract.</p>';
  const toggle = button('Collapse', () => { open = !open; body.hidden = !open; toggle.textContent = open ? 'Collapse' : 'Open'; toggle.setAttribute('aria-expanded', String(open)); });
  toggle.setAttribute('aria-expanded', 'true');
  host.classList.add('if-cut-panel'); host.append(demoHeading('Cut-corner surface', toggle), body);
}

function demoNavigation(host) {
  host.append(demoHeading('Navigation dock', el('strong', '', 'current: Atlas')));
  const nav = el('nav', 'if-mini-nav'); nav.setAttribute('aria-label', 'Sample foundry navigation');
  ['Codex', 'Atlas', 'Commons', 'Observer'].forEach((name) => {
    const item = button(name, () => {
      nav.querySelectorAll('button').forEach((node) => node.removeAttribute('aria-current'));
      item.setAttribute('aria-current', 'page'); announce(`${name} route selected in sample.`);
    });
    if (name === 'Atlas') item.setAttribute('aria-current', 'page'); nav.append(item);
  });
  host.append(nav, inspect('Current location is semantic aria-current state; the highlight is only a visual projection.'));
}

function demoPost(host) {
  host.append(demoHeading('Post shell', el('strong', '', 'draft')));
  const post = el('article', 'if-post-sample');
  post.innerHTML = '<header><span>FIELD LEDGER · EPRA</span><span>Draft</span></header><p>The canyon opened below the flight path, its walls banded with old mineral light. Something moved beneath the cloud shelf.</p>';
  const actions = el('div', 'if-message-actions');
  actions.append(button('Context', () => announce('Context drawer sampled.')), button('Continuity', () => announce('Continuity link sampled.')), button('Provenance', () => announce('Provenance link sampled.')));
  host.append(post, actions);
}

const DEMOS = Object.freeze({
  'status-rune': demoStatus,
  'vector-meter': demoMeter,
  'profile-shell': demoProfile,
  'atlas-marker': demoAtlas,
  'commons-message': demoMessage,
  'cut-panel': demoPanel,
  'navigation-dock': demoNavigation,
  'post-shell': demoPost,
});

function demoHeading(label, trailing) { const heading = el('div', 'if-demo-heading'); heading.append(el('span', '', label), trailing); return heading; }
function inspect(text) { const details = el('details'); const summary = el('summary', '', 'Inspect'); const p = el('p', '', text); details.append(summary, p); return details; }
function announce(text) { const node = document.querySelector('#if-live-status'); if (node) node.textContent = text; }

function mountFoundry() {
  const root = document.querySelector('#interface-foundry-root');
  if (!root) return;
  let themeId = 'epra-atlas';
  let selectedId = 'status-rune';

  root.innerHTML += `
    <header class="if-header">
      <div><span class="if-kicker">Brush Foundry · Interface Lab</span><h1>Living component inventory</h1><p>Glance → inspect → open. Visual state never replaces semantic state.</p></div>
      <label>Theme projection<select id="if-theme-select"></select></label>
    </header>
    <section class="if-stage-law" aria-label="Interaction stages"></section>
    <section class="if-workbench">
      <nav class="if-catalogue" aria-label="Interface components"></nav>
      <div class="if-preview-column">
        <div class="if-theme-note"></div>
        <section class="if-demo-card" id="if-demo" aria-live="polite"></section>
        <details class="if-contract" open><summary>Component contract</summary><pre id="if-contract-json"></pre></details>
        <p class="if-live-status" id="if-live-status" aria-live="polite">Interface Lab awake.</p>
      </div>
    </section>`;

  const themeSelect = root.querySelector('#if-theme-select');
  Object.values(INTERFACE_THEMES).forEach((theme) => { const option = el('option', '', theme.label); option.value = theme.id; themeSelect.append(option); });
  themeSelect.value = themeId;
  themeSelect.addEventListener('change', () => { themeId = themeSelect.value; applyTheme(); renderSelected(); });

  const stages = root.querySelector('.if-stage-law');
  INTERACTION_STAGES.forEach((stage) => { const card = el('div'); card.append(el('strong', '', stage.label), el('span', '', stage.description)); stages.append(card); });

  const catalogue = root.querySelector('.if-catalogue');
  COMPONENT_CATALOGUE.forEach((component) => {
    const item = button('', () => { selectedId = component.id; renderSelected(); });
    item.dataset.componentId = component.id;
    item.innerHTML = `<span>${component.family}</span><strong>${component.label}</strong><small>${component.summary}</small>`;
    catalogue.append(item);
  });

  function applyTheme() {
    const vars = themeVariables(themeId);
    Object.entries(vars).forEach(([name, value]) => root.style.setProperty(name, value));
    root.dataset.interfaceTheme = themeId;
  }

  function renderSelected() {
    const component = COMPONENT_CATALOGUE.find((item) => item.id === selectedId) || COMPONENT_CATALOGUE[0];
    catalogue.querySelectorAll('button').forEach((node) => node.classList.toggle('active', node.dataset.componentId === component.id));
    const note = root.querySelector('.if-theme-note'); const theme = INTERFACE_THEMES[themeId]; note.innerHTML = `<strong>${theme.label}</strong><span>${theme.description}</span>`;
    const demo = root.querySelector('#if-demo'); demo.className = 'if-demo-card'; demo.replaceChildren(); (DEMOS[component.id] || demoPanel)(demo);
    root.querySelector('#if-contract-json').textContent = JSON.stringify(componentSpec(component.id), null, 2);
    announce(`${component.label} loaded in ${theme.label}.`);
  }

  applyTheme(); renderSelected();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountFoundry, { once: true });
  else mountFoundry();
}
