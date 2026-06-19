import { FIFTH_FORM_ANCHORS, FIFTH_FORM_CHAMBERS, getAnchorFromHash } from './fifth-form-model.js';

const root = document.documentElement;
const stage = document.querySelector('[data-fifth-form-stage]');
const stateText = document.querySelector('[data-fifth-form-state]');
const chamberLayer = document.querySelector('[data-fifth-form-chambers]');
const readoutValues = [...document.querySelectorAll('[data-deep-key]')];

function pct(value) {
  return `${Math.round(value * 100)}%`;
}

function setRootVars(anchor) {
  const { axis, vector } = anchor;
  root.style.setProperty('--deep-presence', vector.P);
  root.style.setProperty('--deep-coherence', vector.C);
  root.style.setProperty('--deep-resonance', vector.R);
  root.style.setProperty('--deep-entropy', vector.E);
  root.style.setProperty('--deep-moon', vector.M);
  root.style.setProperty('--deep-attention', vector.A);
  root.style.setProperty('--deep-charge', vector.charge);
  root.style.setProperty('--axis-x', axis.x);
  root.style.setProperty('--axis-y', axis.y);
  root.style.setProperty('--axis-z', axis.z);
}

function renderChambers(anchor) {
  if (!chamberLayer) return;
  const active = new Set(anchor.chambers);
  chamberLayer.replaceChildren(...FIFTH_FORM_CHAMBERS.map((chamber) => {
    const node = document.createElement('span');
    node.className = 'fifth-chamber';
    node.dataset.chamber = chamber.id;
    node.dataset.active = String(active.has(chamber.id));
    node.style.setProperty('--cx', chamber.x);
    node.style.setProperty('--cy', chamber.y);
    node.style.setProperty('--cz', chamber.z);
    node.style.setProperty('--cturn', `${chamber.turn}deg`);

    const label = document.createElement('span');
    label.className = 'fifth-chamber-label';
    label.textContent = chamber.label;
    node.append(label);
    return node;
  }));
}

function renderReadout(anchor) {
  readoutValues.forEach((node) => {
    const key = node.dataset.deepKey;
    const value = anchor.vector[key];
    if (typeof value === 'number') node.textContent = value.toFixed(2);
  });
}

function applyAnchor() {
  const id = getAnchorFromHash(window.location.hash);
  const anchor = FIFTH_FORM_ANCHORS[id];
  if (!anchor || !stage) return;

  stage.dataset.anchor = id;
  stage.dataset.role = anchor.role;
  setRootVars(anchor);
  renderReadout(anchor);
  renderChambers(anchor);

  if (stateText) {
    stateText.textContent = anchor.statement;
  }
}

window.addEventListener('hashchange', applyAnchor);
applyAnchor();
