import { BUILTIN_SKIN_PACKS, UNIVERSAL_SKIN_SCHEMA, createSkinPackFromPalette } from './skin-packs.js';
import { mountSkinDock } from './skin-dock.js';

export const ARCSWEEP_SKIN_STORAGE_KEY = 'hearthweave:arcsweep:skin/v0.1';
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
    });
  }
  return BUILTIN_SKIN_PACKS[0];
}

export function loadArcsweepSkin(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(ARCSWEEP_SKIN_STORAGE_KEY);
    return raw ? safePack(JSON.parse(raw)) : BUILTIN_SKIN_PACKS[0];
  } catch {
    return BUILTIN_SKIN_PACKS[0];
  }
}

export function saveArcsweepSkin(pack, storage = globalThis.localStorage) {
  const value = safePack(pack);
  try { storage?.setItem(ARCSWEEP_SKIN_STORAGE_KEY, JSON.stringify(value)); } catch {}
  return applyArcsweepSkin(value);
}

export function applyArcsweepSkin(pack, doc = globalThis.document) {
  const value = safePack(pack);
  if (!doc?.documentElement) return value;
  const t = value.tokens;
  let style = doc.getElementById(STYLE_ID);
  if (!style) {
    style = doc.createElement('style');
    style.id = STYLE_ID;
    doc.head.append(style);
  }

  style.textContent = `
    :root[data-arcsweep-skin="${CSS.escape(value.id)}"] {
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
      --skin-blur:${Number(t.blur) || 18}px;
      --skin-dock-accent:${t.accent};
      --skin-dock-bg:${t.bg};
    }
    :root[data-arcsweep-skin="${CSS.escape(value.id)}"] body {
      background-image:
        radial-gradient(circle at 82% 8%,color-mix(in srgb,${t.accent} 18%,transparent),transparent 31rem),
        radial-gradient(circle at 18% 88%,color-mix(in srgb,${t.accentSecondary} 15%,transparent),transparent 30rem) !important;
      background-color:${t.bg} !important;
    }
    :root[data-arcsweep-skin="${CSS.escape(value.id)}"] .panel,
    :root[data-arcsweep-skin="${CSS.escape(value.id)}"] .sidebar-world,
    :root[data-arcsweep-skin="${CSS.escape(value.id)}"] .applet-editor,
    :root[data-arcsweep-skin="${CSS.escape(value.id)}"] .kelyran-card { border-radius:var(--skin-radius-panel) !important; }
    :root[data-arcsweep-skin="${CSS.escape(value.id)}"] button,
    :root[data-arcsweep-skin="${CSS.escape(value.id)}"] input,
    :root[data-arcsweep-skin="${CSS.escape(value.id)}"] textarea,
    :root[data-arcsweep-skin="${CSS.escape(value.id)}"] select { border-radius:var(--skin-radius-control) !important; }
    :root[data-arcsweep-skin="${CSS.escape(value.id)}"] .sidebar { backdrop-filter:blur(var(--skin-blur)); }
  `;
  doc.documentElement.dataset.arcsweepSkin = value.id;
  doc.documentElement.dataset.arcsweepSkinSource = value.sourceKind || 'unknown';
  return value;
}

const initial = applyArcsweepSkin(loadArcsweepSkin());

function mount() {
  mountSkinDock({
    id: 'arcsweep',
    currentSkinId: initial.id,
    onApply: (pack) => {
      const applied = saveArcsweepSkin(pack);
      globalThis.dispatchEvent?.(new CustomEvent('arcsweep:skin-changed', { detail: { id: applied.id, name: applied.name, schema: applied.schema } }));
    },
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
