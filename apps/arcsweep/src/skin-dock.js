import { BUILTIN_SKIN_PACKS, createSkinPackFromPalette, parsePaletteText } from './skin-packs.js';

const DOCK_STYLE_ID = 'hearthweave-universal-skin-dock-style';

function installDockStyles(doc = globalThis.document) {
  if (!doc || doc.getElementById(DOCK_STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = DOCK_STYLE_ID;
  style.textContent = `
    .hearthweave-skin-dock{position:fixed;right:max(1rem,env(safe-area-inset-right));bottom:max(1rem,env(safe-area-inset-bottom));z-index:2147482000;font:600 14px/1.35 Inter,ui-sans-serif,system-ui,sans-serif;color:#f7f3ec}
    .hearthweave-skin-dock *{box-sizing:border-box}
    .hearthweave-skin-toggle{min-width:auto!important;border:1px solid color-mix(in srgb,var(--skin-dock-accent,#f6c453) 74%,white)!important;border-radius:999px!important;background:color-mix(in srgb,var(--skin-dock-bg,#080b12) 84%,transparent)!important;color:#fff!important;padding:.65rem .85rem!important;box-shadow:0 12px 34px rgba(0,0,0,.34)!important;backdrop-filter:blur(18px);cursor:pointer}
    .hearthweave-skin-panel{width:min(24rem,calc(100vw - 2rem));margin-bottom:.65rem;padding:.85rem;border:1px solid color-mix(in srgb,var(--skin-dock-accent,#f6c453) 44%,transparent);border-radius:1rem;background:color-mix(in srgb,var(--skin-dock-bg,#080b12) 92%,transparent);box-shadow:0 18px 60px rgba(0,0,0,.44);backdrop-filter:blur(22px);display:grid;gap:.7rem}
    .hearthweave-skin-panel[hidden]{display:none}
    .hearthweave-skin-head{display:flex;align-items:center;justify-content:space-between;gap:.7rem}
    .hearthweave-skin-head strong{font-size:.96rem}
    .hearthweave-skin-head span{font-size:.72rem;opacity:.66}
    .hearthweave-skin-panel label{display:grid;gap:.3rem;color:#f7f3ec!important;font-weight:650!important}
    .hearthweave-skin-panel select,.hearthweave-skin-panel input{width:100%;border:1px solid rgba(255,255,255,.18)!important;border-radius:.7rem!important;background:rgba(0,0,0,.28)!important;color:#fff!important;padding:.62rem .7rem!important}
    .hearthweave-skin-panel small{opacity:.68;line-height:1.45}
    .hearthweave-skin-swatches{display:grid;grid-template-columns:repeat(5,1fr);gap:.3rem}
    .hearthweave-skin-swatch{height:1.35rem;border-radius:.42rem;border:1px solid rgba(255,255,255,.2)}
    .hearthweave-skin-actions{display:flex;gap:.45rem;flex-wrap:wrap}
    .hearthweave-skin-actions button{min-width:auto!important;padding:.48rem .65rem!important;border-radius:.65rem!important}
    @media(max-width:640px){.hearthweave-skin-dock{right:.6rem;bottom:.6rem}.hearthweave-skin-panel{width:calc(100vw - 1.2rem)}}
  `;
  doc.head.append(style);
}

function renderSwatches(node, palette = []) {
  node.replaceChildren(...palette.slice(0, 5).map((colour) => {
    const swatch = document.createElement('span');
    swatch.className = 'hearthweave-skin-swatch';
    swatch.style.background = colour;
    swatch.title = colour;
    return swatch;
  }));
}

export function mountSkinDock({
  id = 'universal',
  currentSkinId = 'hearthglass',
  onApply,
  onReset,
  parent = globalThis.document?.body,
} = {}) {
  if (!parent || typeof onApply !== 'function') return null;
  const existing = document.querySelector(`[data-hearthweave-skin-dock="${id}"]`);
  if (existing) return existing;
  installDockStyles();

  const dock = document.createElement('div');
  dock.className = 'hearthweave-skin-dock';
  dock.dataset.hearthweaveSkinDock = id;

  const panel = document.createElement('section');
  panel.className = 'hearthweave-skin-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Skin switcher');

  const head = document.createElement('div');
  head.className = 'hearthweave-skin-head';
  head.innerHTML = '<strong>Skin the House</strong><span>instant · local</span>';

  const presetLabel = document.createElement('label');
  presetLabel.append(document.createTextNode('Skin'));
  const select = document.createElement('select');
  for (const pack of BUILTIN_SKIN_PACKS) {
    const option = document.createElement('option');
    option.value = pack.id;
    option.textContent = pack.name;
    option.selected = pack.id === currentSkinId;
    select.append(option);
  }
  presetLabel.append(select);

  const swatches = document.createElement('div');
  swatches.className = 'hearthweave-skin-swatches';
  renderSwatches(swatches, BUILTIN_SKIN_PACKS.find((pack) => pack.id === select.value)?.palette || []);

  const customLabel = document.createElement('label');
  customLabel.append(document.createTextNode('Whim palette'));
  const custom = document.createElement('input');
  custom.placeholder = '#112233 #445566 #778899 …';
  custom.autocomplete = 'off';
  customLabel.append(custom);

  const help = document.createElement('small');
  help.textContent = 'Pick one of Rowan’s palettes, or paste 3–12 hex colours and conjure a temporary skin. Layout, data, canon and world state stay untouched.';

  const actions = document.createElement('div');
  actions.className = 'hearthweave-skin-actions';
  const applyCustom = document.createElement('button');
  applyCustom.type = 'button';
  applyCustom.textContent = 'Conjure';
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.textContent = 'Hearthglass';
  actions.append(applyCustom, reset);

  panel.append(head, presetLabel, swatches, customLabel, actions, help);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'hearthweave-skin-toggle';
  toggle.textContent = '✦ Skin';
  toggle.setAttribute('aria-expanded', 'false');

  toggle.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    toggle.setAttribute('aria-expanded', String(!panel.hidden));
  });

  select.addEventListener('change', () => {
    const pack = BUILTIN_SKIN_PACKS.find((item) => item.id === select.value);
    if (!pack) return;
    renderSwatches(swatches, pack.palette);
    onApply(pack);
  });

  applyCustom.addEventListener('click', () => {
    try {
      const colors = parsePaletteText(custom.value);
      const pack = createSkinPackFromPalette({
        id: `whim-${Date.now()}`,
        name: 'Whim Skin',
        colors,
        sourceKind: 'session-original',
        provenance: { note: 'Locally created from user-supplied hex colours.' },
      });
      renderSwatches(swatches, pack.palette);
      onApply(pack);
    } catch (error) {
      help.textContent = error.message;
    }
  });

  reset.addEventListener('click', () => {
    const pack = BUILTIN_SKIN_PACKS[0];
    select.value = pack.id;
    renderSwatches(swatches, pack.palette);
    if (typeof onReset === 'function') onReset(pack);
    else onApply(pack);
  });

  dock.append(panel, toggle);
  parent.append(dock);
  return dock;
}
