import { BUILTIN_SKIN_PACKS, UNIVERSAL_SKIN_SCHEMA, createSkinPackFromPalette } from './skin-packs.js';
import { mountSkinDock } from './skin-dock.js';

export const UNIVERSAL_SKIN_STORAGE_KEY = 'hearthweave:universal-skin/v0.1';
export const UNIVERSAL_SKIN_CHANNEL = 'hearthweave-universal-skin';
const STYLE_ID = 'arcsweep-universal-skin';

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

export function loadArcsweepSkin(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(UNIVERSAL_SKIN_STORAGE_KEY);
    return raw ? safePack(JSON.parse(raw)) : BUILTIN_SKIN_PACKS[0];
  } catch {
    return BUILTIN_SKIN_PACKS[0];
  }
}

export function applyArcsweepSkin(pack, doc = globalThis.document) {
  const value = safePack(pack);
  if (!doc?.documentElement) return value;
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

  let style = doc.getElementById(STYLE_ID);
  if (!style) {
    style = doc.createElement('style');
    style.id = STYLE_ID;
    doc.head.append(style);
  }

  const escapedId = globalThis.CSS?.escape ? globalThis.CSS.escape(value.id) : value.id.replace(/[^a-z0-9_-]/gi, '-');
  const blur = `${clamp(m.blur, Number(t.blur) || 18, 0, 48)}px`;
  const saturate = clamp(m.saturate, 1.16, 0.8, 1.8);

  style.textContent = `
    :root[data-arcsweep-skin="${escapedId}"] {
      --bg:${t.bg} !important;
      --sidebar:${t.sidebar || t.bgAlt} !important;
      --panel-solid:${t.panel} !important;
      --panel-2:${t.panelRaised} !important;
      --line:${t.line} !important;
      --line-soft:${t.lineSoft} !important;
      --text:${t.text} !important;
      --muted:${t.muted} !important;
      --gold:${t.accent} !important;
      --copper:${t.accentWarm || t.accentSecondary} !important;
      --green:${t.accentSecondary} !important;
      --danger:${t.danger} !important;
      --shadow:0 24px 70px color-mix(in srgb,${t.shadow || '#000000'} 46%,transparent) !important;
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

    :root[data-arcsweep-skin="${escapedId}"] body {
      background-image:
        radial-gradient(circle at 82% 8%,color-mix(in srgb,${t.accent} 16%,transparent),transparent 31rem),
        radial-gradient(circle at 18% 88%,color-mix(in srgb,${t.accentSecondary} 14%,transparent),transparent 30rem),
        radial-gradient(circle at 50% 40%,color-mix(in srgb,${t.accentDeep || t.bgAlt} 12%,transparent),transparent 42rem) !important;
      background-color:${t.bg} !important;
    }

    :root[data-arcsweep-skin="${escapedId}"] .panel,
    :root[data-arcsweep-skin="${escapedId}"] .sidebar-world,
    :root[data-arcsweep-skin="${escapedId}"] .applet-editor,
    :root[data-arcsweep-skin="${escapedId}"] .kelyran-card,
    :root[data-arcsweep-skin="${escapedId}"] .sidebar {
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
        inset 0 -1px 0 color-mix(in srgb,var(--glass-rim) 11%,transparent),
        0 20px 58px color-mix(in srgb,var(--glass-shadow) var(--glass-shadow-opacity),transparent),
        0 0 34px color-mix(in srgb,var(--glass-glow) var(--glass-glow-opacity),transparent) !important;
      backdrop-filter:blur(var(--skin-blur)) saturate(var(--glass-saturate));
      -webkit-backdrop-filter:blur(var(--skin-blur)) saturate(var(--glass-saturate));
    }

    :root[data-arcsweep-skin="${escapedId}"] .kelyran-card,
    :root[data-arcsweep-skin="${escapedId}"] .panel[data-depth="raised"],
    :root[data-arcsweep-skin="${escapedId}"] .panel.is-raised {
      background:
        linear-gradient(145deg,
          color-mix(in srgb,#FFFFFF calc(var(--glass-highlight-opacity) + 4%),transparent) 0%,
          transparent 40%),
        color-mix(in srgb,${t.panelRaised} var(--glass-raised-opacity),transparent) !important;
    }

    :root[data-arcsweep-skin="${escapedId}"] .panel .panel,
    :root[data-arcsweep-skin="${escapedId}"] .applet-editor .panel {
      backdrop-filter:none;
      -webkit-backdrop-filter:none;
      background:color-mix(in srgb,${t.panelRaised} 56%,transparent) !important;
      box-shadow:inset 0 1px 0 color-mix(in srgb,#FFFFFF 6%,transparent) !important;
    }

    :root[data-arcsweep-skin="${escapedId}"] button,
    :root[data-arcsweep-skin="${escapedId}"] input,
    :root[data-arcsweep-skin="${escapedId}"] textarea,
    :root[data-arcsweep-skin="${escapedId}"] select {
      border-radius:var(--skin-radius-control) !important;
      background:color-mix(in srgb,${t.input || t.panel} var(--glass-input-opacity),transparent) !important;
      border-color:color-mix(in srgb,var(--glass-rim) 42%,transparent) !important;
    }

    :root[data-arcsweep-skin="${escapedId}"] .panel:focus-within,
    :root[data-arcsweep-skin="${escapedId}"] .applet-editor:focus-within,
    :root[data-arcsweep-skin="${escapedId}"] .kelyran-card:focus-within {
      border-color:color-mix(in srgb,${t.accent} 72%,transparent) !important;
      box-shadow:
        inset 0 1px 0 color-mix(in srgb,#FFFFFF var(--glass-highlight-opacity),transparent),
        0 18px 58px color-mix(in srgb,var(--glass-shadow) var(--glass-shadow-opacity),transparent),
        0 0 42px color-mix(in srgb,${t.accent} 20%,transparent) !important;
    }

    @supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))) {
      :root[data-arcsweep-skin="${escapedId}"] .panel,
      :root[data-arcsweep-skin="${escapedId}"] .sidebar-world,
      :root[data-arcsweep-skin="${escapedId}"] .applet-editor,
      :root[data-arcsweep-skin="${escapedId}"] .kelyran-card,
      :root[data-arcsweep-skin="${escapedId}"] .sidebar {
        background:${t.panel} !important;
      }
    }

    @media (prefers-reduced-transparency: reduce) {
      :root[data-arcsweep-skin="${escapedId}"] .panel,
      :root[data-arcsweep-skin="${escapedId}"] .sidebar-world,
      :root[data-arcsweep-skin="${escapedId}"] .applet-editor,
      :root[data-arcsweep-skin="${escapedId}"] .kelyran-card,
      :root[data-arcsweep-skin="${escapedId}"] .sidebar {
        backdrop-filter:none;
        -webkit-backdrop-filter:none;
        background:${t.panel} !important;
      }
    }
  `;
  doc.documentElement.dataset.arcsweepSkin = value.id;
  doc.documentElement.dataset.arcsweepSkinSource = value.sourceKind || 'unknown';
  doc.documentElement.dataset.arcsweepMaterial = value.material?.id || 'living-glass';
  return value;
}

let channel = null;
try { channel = new BroadcastChannel(UNIVERSAL_SKIN_CHANNEL); } catch {}

export function saveArcsweepSkin(pack, storage = globalThis.localStorage) {
  const value = safePack(pack);
  try { storage?.setItem(UNIVERSAL_SKIN_STORAGE_KEY, JSON.stringify(value)); } catch {}
  applyArcsweepSkin(value);
  try { channel?.postMessage(value); } catch {}
  return value;
}

const initial = applyArcsweepSkin(loadArcsweepSkin());

try {
  channel?.addEventListener('message', (event) => applyArcsweepSkin(event.data));
  globalThis.addEventListener?.('storage', (event) => {
    if (event.key !== UNIVERSAL_SKIN_STORAGE_KEY || !event.newValue) return;
    try { applyArcsweepSkin(JSON.parse(event.newValue)); } catch {}
  });
} catch {}

function mount() {
  mountSkinDock({
    id: 'arcsweep',
    currentSkinId: initial.id,
    onApply: (pack) => {
      const applied = saveArcsweepSkin(pack);
      globalThis.dispatchEvent?.(new CustomEvent('arcsweep:skin-changed', {
        detail: { id: applied.id, name: applied.name, schema: applied.schema, material: applied.material?.id || 'living-glass' },
      }));
    },
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
