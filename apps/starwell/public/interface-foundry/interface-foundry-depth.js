const DEPTH_LEVELS = Object.freeze([
  Object.freeze({ id: 'quiet', label: 'Quiet' }),
  Object.freeze({ id: 'raised', label: 'Raised' }),
  Object.freeze({ id: 'sculpted', label: 'Sculpted' }),
]);

const SYNTHETIC_FIXTURE_REPLACEMENTS = Object.freeze({
  Nocturne: 'Atlas Scout',
  'Hearth Glint': 'Demo Cartographer',
});

function prefersReducedMotion() {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
}

function finePointer() {
  return globalThis.matchMedia?.('(pointer: fine)')?.matches === true;
}

function scrubNamedFixtureText(root) {
  const candidates = root.querySelectorAll('.if-message-card b, .if-profile-card h3');
  for (const node of candidates) {
    const replacement = SYNTHETIC_FIXTURE_REPLACEMENTS[node.textContent?.trim() || ''];
    if (!replacement) continue;
    node.textContent = replacement;
    node.closest('.if-message-card, .if-profile-card')?.setAttribute('data-fixture', 'synthetic');
  }
}

function installFixtureGuard(root) {
  scrubNamedFixtureText(root);
  const observer = new MutationObserver(() => scrubNamedFixtureText(root));
  observer.observe(root, { childList: true, subtree: true });
  return observer;
}

function buildDepthControl(root) {
  const header = root.querySelector('.if-header');
  if (!header || header.querySelector('.if-depth-control')) return;

  const control = document.createElement('div');
  control.className = 'if-depth-control';
  control.setAttribute('role', 'group');
  control.setAttribute('aria-label', 'Interface depth');

  const label = document.createElement('span');
  label.textContent = 'Material depth · presentation only';

  const buttons = document.createElement('div');
  buttons.className = 'if-depth-buttons';

  const applyDepth = (id) => {
    root.dataset.depth = id;
    for (const button of buttons.querySelectorAll('button')) {
      button.setAttribute('aria-pressed', String(button.dataset.depth === id));
    }
    const live = root.querySelector('#if-live-status');
    if (live) live.textContent = `${DEPTH_LEVELS.find((item) => item.id === id)?.label || id} material depth selected.`;
  };

  for (const depth of DEPTH_LEVELS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.depth = depth.id;
    button.textContent = depth.label;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => applyDepth(depth.id));
    buttons.append(button);
  }

  control.append(label, buttons);
  header.append(control);
  applyDepth(prefersReducedMotion() ? 'quiet' : 'sculpted');
}

function installPointerDepth(root) {
  if (prefersReducedMotion() || !finePointer()) return;

  const reset = (card) => {
    card.style.setProperty('--if-tilt-x', '0deg');
    card.style.setProperty('--if-tilt-y', '0deg');
  };

  root.addEventListener('pointermove', (event) => {
    if (root.dataset.depth !== 'sculpted') return;
    const card = event.target.closest?.('.if-demo-card');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nx = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
    const ny = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
    card.style.setProperty('--if-tilt-x', `${(-ny * 1.2).toFixed(2)}deg`);
    card.style.setProperty('--if-tilt-y', `${(nx * 1.7).toFixed(2)}deg`);
  }, { passive: true });

  root.addEventListener('pointerout', (event) => {
    const card = event.target.closest?.('.if-demo-card');
    if (!card || card.contains(event.relatedTarget)) return;
    reset(card);
  }, { passive: true });
}

function proofRow({ glyph, title, summary, meta }) {
  const row = document.createElement('article');
  row.className = 'jcink-proof-row';
  row.innerHTML = `
    <span class="jcink-proof-glyph" aria-hidden="true">${glyph}</span>
    <div><button type="button">${title}</button><small>${summary}</small></div>
    <span class="jcink-proof-meta">${meta}</span>`;
  row.querySelector('button').addEventListener('click', () => {
    const live = document.querySelector('#if-live-status');
    if (live) live.textContent = `${title} opened in the synthetic JCINK proof.`;
  });
  return row;
}

function buildJcinkProof(root) {
  if (root.querySelector('.jcink-material-proof')) return;
  const workbench = root.querySelector('.if-workbench');
  if (!workbench) return;

  const proof = document.createElement('section');
  proof.className = 'jcink-material-proof';
  proof.setAttribute('aria-labelledby', 'jcink-proof-title');
  proof.innerHTML = `
    <header class="jcink-proof-head">
      <div><span class="if-kicker">JCINK · synthetic material proof</span><h2 id="jcink-proof-title">The board as a dimensional information surface</h2></div>
      <p>Same semantic grammar as ArcSweep: raised categories, inset author/context wells, tactile topic rows, explicit state and no perpetual HUD animation.</p>
    </header>
    <div class="jcink-proof-board">
      <aside class="jcink-proof-profile" data-fixture="synthetic">
        <div class="jcink-proof-avatar" aria-hidden="true">AS</div>
        <div><strong>Atlas Scout</strong><br><span>Synthetic fixture · cartography team</span></div>
        <span>Present · 3 field notes</span>
      </aside>
      <div class="jcink-proof-main">
        <div class="jcink-proof-category">Epra · Cartography & Field Work</div>
      </div>
    </div>`;

  const main = proof.querySelector('.jcink-proof-main');
  main.append(
    proofRow({ glyph: '⌖', title: 'Canyon Survey', summary: 'Terrain, flight corridors, environmental continuity and map revisions.', meta: '12 topics · active' }),
    proofRow({ glyph: '🐉', title: 'Dragon Range Notes', summary: 'Territory observations with explicit provenance and draft/canon boundaries.', meta: '8 topics · review' }),
    proofRow({ glyph: '✦', title: 'Psionic Geography', summary: 'Sites, effects, questions and observation records without decorative claims becoming canon.', meta: '5 topics · draft' }),
  );

  const reply = document.createElement('form');
  reply.className = 'jcink-proof-reply';
  reply.innerHTML = `
    <label for="jcink-proof-reply">Quick reply · synthetic preview</label>
    <textarea id="jcink-proof-reply" placeholder="Write a field note…"></textarea>
    <div class="jcink-proof-actions"><button type="reset">Clear</button><button type="submit">Preview post</button></div>
    <p class="jcink-proof-status" aria-live="polite">Nothing leaves this preview.</p>`;
  reply.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = reply.querySelector('textarea').value.trim();
    reply.querySelector('.jcink-proof-status').textContent = text
      ? `Preview ready · ${text.length} characters · no external write.`
      : 'Add text before previewing the post.';
  });
  main.append(reply);

  workbench.insertAdjacentElement('afterend', proof);
}

function mount() {
  const root = document.querySelector('#interface-foundry-root');
  if (!root) return;
  buildDepthControl(root);
  buildJcinkProof(root);
  installPointerDepth(root);
  installFixtureGuard(root);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
