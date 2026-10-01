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
      material: value.material || {},
    });
  }
  return BUILTIN_SKIN_PACKS[0];
}

function clamp(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function pct(value, fallback) {
  return `${Math.round(clamp(value, fallback, 0, 1) * 100)}%`;
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
  const m = {
    family: 'glass',
    panelOpacity: 0.58,
    raisedOpacity: 0.72,
    inputOpacity: 0.72,
    blur: Number(t.blur) || 18,
    saturate: 1.16,
    borderAlpha: 0.48,
    highlightAlpha: 0.12,
    shadowAlpha: 0.48,
    glowAlpha: 0.14,
    tint: t.panel,
    rim: t.line,
    glow: t.accent,
    ...(value.material || {}),
  };

  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.append(style);
  }

  const escapedId = globalThis.CSS?.escape ? globalThis.CSS.escape(value.id) : value.id.replace(/[^a-z0-9_-]/gi, '-');
  const blur = `${clamp(m.blur, Number(t.blur) || 18, 0, 48)}px`;
  const saturate = clamp(m.saturate, 1.16, 0.8, 1.8);

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
      --skin-blur:${blur};
      --skin-dock-accent:${t.accent};
      --skin-dock-bg:${t.bg};
      --glass-tint:${m.tint || t.panel};
      --glass-rim:${m.rim || t.line};
      --glass-glow:${m.glow || t.accent};
      --glass-shadow:${t.shadow || '#000000'};
      --glass-panel-opacity:${pct(m.panelOpacity, 0.58)};
      --glass-raised-opacity:${pct(m.raisedOpacity, 0.72)};
      --glass-input-opacity:${pct(m.inputOpacity, 0.72)};
      --glass-border-opacity:${pct(m.borderAlpha, 0.48)};
      --glass-highlight-opacity:${pct(m.highlightAlpha, 0.12)};
      --glass-shadow-opacity:${pct(m.shadowAlpha, 0.48)};
      --glass-glow-opacity:${pct(m.glowAlpha, 0.14)};
      --glass-saturate:${saturate};
    }

    :root[data-flameclyffe-skin="${escapedId}"] body{
      background:
        radial-gradient(circle at 30% 18%,color-mix(in srgb,${t.accent} 16%,transparent),transparent 34%),
        radial-gradient(circle at 70% 85%,color-mix(in srgb,${t.accentSecondary} 14%,transparent),transparent 42%),
        radial-gradient(circle at 50% 44%,color-mix(in srgb,${t.accentDeep || t.bgAlt} 11%,transparent),transparent 48%),
        ${t.bg} !important;
    }

    :root[data-flameclyffe-skin="${escapedId}"] .site-header,
    :root[data-flameclyffe-skin="${escapedId}"] .card,
    :root[data-flameclyffe-skin="${escapedId}"] .field,
    :root[data-flameclyffe-skin="${escapedId}"] .tile,
    :root[data-flameclyffe-skin="${escapedId}"] .layer,
    :root[data-flameclyffe-skin="${escapedId}"] .preset{
      border-radius:var(--skin-radius-panel) !important;
      background:
        linear-gradient(145deg,
          color-mix(in srgb,#FFFFFF var(--glass-highlight-opacity),transparent) 0%,
          transparent 34%,
          color-mix(in srgb,var(--glass-rim) 5%,transparent) 100%),
        color-mix(in srgb,var(--glass-tint) var(--glass-panel-opacity),transparent) !important;
      border:1px solid color-mix(in srgb,var(--glass-rim) var(--glass-border-opacity),transparent) !important;
      box-shadow:
        inset 0 1px 0 color-mix(in srgb,#FFFFFF var(--glass-highlight-opacity),transparent),
        inset 0 -1px 0 color-mix(in srgb,var(--glass-rim) 10%,transparent),
        0 18px 56px color-mix(in srgb,var(--glass-shadow) var(--glass-shadow-opacity),transparent),
        0 0 30px color-mix(in srgb,var(--glass-glow) var(--glass-glow-opacity),transparent) !important;
      backdrop-filter:blur(var(--skin-blur)) saturate(var(--glass-saturate));
      -webkit-backdrop-filter:blur(var(--skin-blur)) saturate(var(--glass-saturate));
    }

    :root[data-flameclyffe-skin="${escapedId}"] .site-header{
      background:color-mix(in srgb,${t.bg} 62%,transparent) !important;
      border-radius:0 0 var(--skin-radius-panel) var(--skin-radius-panel) !important;
    }

    :root[data-flameclyffe-skin="${escapedId}"] .card,
    :root[data-flameclyffe-skin="${escapedId}"] .field{
      background:
        linear-gradient(145deg,
          color-mix(in srgb,#FFFFFF var(--glass-highlight-opacity),transparent),
          transparent 36%),
        color-mix(in srgb,${t.panel} var(--glass-panel-opacity),transparent) !important;
    }

    :root[data-flameclyffe-skin="${escapedId}"] .tile,
    :root[data-flameclyffe-skin="${escapedId}"] .layer,
    :root[data-flameclyffe-skin="${escapedId}"] .preset{
      background:color-mix(in srgb,${t.panelRaised} var(--glass-raised-opacity),transparent) !important;
      box-shadow:
        inset 0 1px 0 color-mix(in srgb,#FFFFFF 7%,transparent),
        0 10px 30px color-mix(in srgb,var(--glass-shadow) 28%,transparent) !important;
    }

    :root[data-flameclyffe-skin="${escapedId}"] .card .card,
    :root[data-flameclyffe-skin="${escapedId}"] .field .field{
      backdrop-filter:none;
      -webkit-backdrop-filter:none;
      background:color-mix(in srgb,${t.panelRaised} 54%,transparent) !important;
      box-shadow:inset 0 1px 0 color-mix(in srgb,#FFFFFF 6%,transparent) !important;
    }

    :root[data-flameclyffe-skin="${escapedId}"] button,
    :root[data-flameclyffe-skin="${escapedId}"] .button-link,
    :root[data-flameclyffe-skin="${escapedId}"] select,
    :root[data-flameclyffe-skin="${escapedId}"] input,
    :root[data-flameclyffe-skin="${escapedId}"] textarea{
      border-radius:var(--skin-radius-control) !important;
      background:color-mix(in srgb,${t.input || t.panel} var(--glass-input-opacity),transparent) !important;
      border-color:color-mix(in srgb,var(--glass-rim) 42%,transparent) !important;
    }

    :root[data-flameclyffe-skin="${escapedId}"] .card:focus-within,
    :root[data-flameclyffe-skin="${escapedId}"] .field:focus-within{
      border-color:color-mix(in srgb,${t.accent} 72%,transparent) !important;
      box-shadow:
        inset 0 1px 0 color-mix(in srgb,#FFFFFF var(--glass-highlight-opacity),transparent),
        0 18px 56px color-mix(in srgb,var(--glass-shadow) var(--glass-shadow-opacity),transparent),
        0 0 40px color-mix(in srgb,${t.accent} 20%,transparent) !important;
    }

    @supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){
      :root[data-flameclyffe-skin="${escapedId}"] .site-header,
      :root[data-flameclyffe-skin="${escapedId}"] .card,
      :root[data-flameclyffe-skin="${escapedId}"] .field,
      :root[data-flameclyffe-skin="${escapedId}"] .tile,
      :root[data-flameclyffe-skin="${escapedId}"] .layer,
      :root[data-flameclyffe-skin="${escapedId}"] .preset{
        background:${t.panel} !important;
      }
    }

    @media (prefers-reduced-transparency: reduce){
      :root[data-flameclyffe-skin="${escapedId}"] .site-header,
      :root[data-flameclyffe-skin="${escapedId}"] .card,
      :root[data-flameclyffe-skin="${escapedId}"] .field,
      :root[data-flameclyffe-skin="${escapedId}"] .tile,
      :root[data-flameclyffe-skin="${escapedId}"] .layer,
      :root[data-flameclyffe-skin="${escapedId}"] .preset{
        backdrop-filter:none;
        -webkit-backdrop-filter:none;
        background:${t.panel} !important;
      }
    }
  `;

  document.documentElement.dataset.flameclyffeSkin = value.id;
  document.documentElement.dataset.flameclyffeSkinSource = value.sourceKind || 'unknown';
  document.documentElement.dataset.flameclyffeMaterial = value.material?.id || 'living-glass';
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
