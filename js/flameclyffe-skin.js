import { BUILTIN_SKIN_PACKS, UNIVERSAL_SKIN_SCHEMA, createSkinPackFromPalette } from '../apps/arcsweep/src/skin-packs.js';
import { mountSkinDock } from '../apps/arcsweep/src/skin-dock.js';

const STORAGE_KEY = 'hearthweave:universal-skin/v0.1';
const CHANNEL_NAME = 'hearthweave-universal-skin';
const STYLE_ID = 'flameclyffe-universal-skin';

function safePack(value) {
  if (!value || typeof value !== 'object') return BUILTIN_SKIN_PACKS[0];
  if (value.schema === UNIVERSAL_SKIN_SCHEMA && value.tokens && Array.isArray(value.palette)) return value;
  if (Array.isArray(value.colors)) {
    return createSkinPackFromPalette({
      id: value.id || 'imported',
      name: value.name || 'Imported skin',
      colors: value.colors,
      sourceKind: value.sourceKind || 'imported',
      provenance: value.provenance || {},
    });
  }
  return BUILTIN_SKIN_PACKS[0];
}

function loadSkin() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? safePack(JSON.parse(raw)) : BUILTIN_SKIN_PACKS[0];
  } catch {
    return BUILTIN_SKIN_PACKS[0];
  }
}

function applySkin(pack) {
  const value = safePack(pack);
  const t = value.tokens;
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.append(style);
  }
  const escapedId = globalThis.CSS?.escape ? globalThis.CSS.escape(value.id) : value.id.replace(/[^a-z0-9_-]/gi, '-');
  style.textContent = `
    :root[data-flameclyffe-skin="${escapedId}"]{
      --bg:${t.bg} !important;
      --card:${t.panel} !important;
      --card2:${t.panelRaised} !important;
      --text:${t.text} !important;
      --muted:${t.muted} !important;
      --border:${t.line} !important;
      --accent:${t.accent} !important;
      --accent2:${t.accentSecondary} !important;
      --gold:${t.accentWarm || t.accent} !important;
      --skin-radius-panel:${Number(t.radiusPanel) || 18}px;
      --skin-radius-control:${Number(t.radiusControl) || 12}px;
      --skin-blur:${Number(t.blur) || 18}px;
      --skin-dock-accent:${t.accent};
      --skin-dock-bg:${t.bg};
    }
    :root[data-flameclyffe-skin="${escapedId}"] body{
      background:
        radial-gradient(circle at 30% 18%,color-mix(in srgb,${t.accent} 20%,transparent),transparent 34%),
        radial-gradient(circle at 70% 85%,color-mix(in srgb,${t.accentSecondary} 19%,transparent),transparent 42%),
        ${t.bg} !important;
    }
    :root[data-flameclyffe-skin="${escapedId}"] .card,
    :root[data-flameclyffe-skin="${escapedId}"] .field{border-radius:var(--skin-radius-panel) !important}
    :root[data-flameclyffe-skin="${escapedId}"] button,
    :root[data-flameclyffe-skin="${escapedId}"] .button-link,
    :root[data-flameclyffe-skin="${escapedId}"] select,
    :root[data-flameclyffe-skin="${escapedId}"] input,
    :root[data-flameclyffe-skin="${escapedId}"] textarea{border-radius:var(--skin-radius-control) !important}
    :root[data-flameclyffe-skin="${escapedId}"] .site-header{background:color-mix(in srgb,${t.bg} 86%,transparent) !important;backdrop-filter:blur(var(--skin-blur))}
    :root[data-flameclyffe-skin="${escapedId}"] .card{background:linear-gradient(180deg,color-mix(in srgb,${t.panelRaised} 94%,transparent),color-mix(in srgb,${t.bg} 93%,transparent)) !important;border-color:color-mix(in srgb,${t.line} 68%,transparent) !important}
    :root[data-flameclyffe-skin="${escapedId}"] .tile,
    :root[data-flameclyffe-skin="${escapedId}"] .layer,
    :root[data-flameclyffe-skin="${escapedId}"] .preset{background:color-mix(in srgb,${t.panelRaised} 70%,transparent) !important;border-color:color-mix(in srgb,${t.line} 56%,transparent) !important}
  `;
  document.documentElement.dataset.flameclyffeSkin = value.id;
  document.documentElement.dataset.flameclyffeSkinSource = value.sourceKind || 'unknown';
  return value;
}

let channel = null;
try { channel = new BroadcastChannel(CHANNEL_NAME); } catch {}

function saveSkin(pack) {
  const value = safePack(pack);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch {}
  applySkin(value);
  try { channel?.postMessage(value); } catch {}
  return value;
}

const initial = applySkin(loadSkin());

try {
  channel?.addEventListener('message', (event) => applySkin(event.data));
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try { applySkin(JSON.parse(event.newValue)); } catch {}
  });
} catch {}

function mount() {
  mountSkinDock({
    id: 'flameclyffe-studio',
    currentSkinId: initial.id,
    onApply: saveSkin,
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
