import './echo-index-sidecar.js';
import { CREATIVE_ORGANS } from './creative-organ-registry.js';
import { SOUND_ORGANS } from './sound-organ-registry.js';

const CORE_APPLETS = [
  { id: 'portal', label: 'Portal', glyph: '◉', category: 'core', defaultVisible: true },
  { id: 'worlds', label: 'World Registry', glyph: '✧', category: 'core', defaultVisible: true },
  { id: 'about-world', label: 'About this World', glyph: 'ⓘ', category: 'core', defaultVisible: true },
  { id: 'summon', label: 'Summon', glyph: '⌁', category: 'interface', defaultVisible: true },
  { id: 'veil-mode', label: 'Veil Mode', glyph: '◌', category: 'interface', defaultVisible: true },
  { id: 'time', label: 'World Clock', glyph: '◷', category: 'core', defaultVisible: true },
  { id: 'arrival', label: 'Arrival Context', glyph: '⌖', category: 'continuity', defaultVisible: true },
  { id: 'timeline', label: 'Timeline', glyph: '⌁', category: 'core', defaultVisible: true },
  { id: 'scripts', label: 'Canon Studio', glyph: '⌬', category: 'worldseed', defaultVisible: true },
  { id: 'records', label: 'Records Room', glyph: '▥', category: 'writing', defaultVisible: true },
  { id: 'seedhouse', label: 'Seedhouse', glyph: '✤', category: 'worldseed', defaultVisible: true },
  { id: 'kelyran-school', label: 'Kelyran School', glyph: 'ᚲ', category: 'language', defaultVisible: true },
  { id: 'ingest', label: 'Non-Canon Ingest', glyph: '⇣', category: 'evidence', defaultVisible: true },
  { id: 'aemeth-lens', label: 'Aemeth Lens', glyph: '⊚', category: 'observation', defaultVisible: true },
  { id: 'identity', label: 'About Me', glyph: '◇', category: 'world', defaultVisible: true },
  { id: 'competencies', label: 'World Competencies', glyph: '✣', category: 'world', defaultVisible: true },
  { id: 'safety-weave', label: 'Safety Weave', glyph: '⌘', category: 'continuity', defaultVisible: true },
  { id: 'continuity-recall', label: 'Replay', glyph: '↻', category: 'worldseed', defaultVisible: true },
  { id: 'companion', label: 'Companion Interface', glyph: '✦', category: 'relationships', defaultVisible: false },
  { id: 'relationships', label: 'Relationships', glyph: '✧', category: 'world', defaultVisible: true },
  { id: 'scenarios', label: 'Scenarios', glyph: '▣', category: 'world', defaultVisible: true },
  { id: 'calendar', label: 'Calendar', glyph: '▦', category: 'world', defaultVisible: true },
  { id: 'diary', label: 'Diary', glyph: '✎', category: 'world', defaultVisible: true },
  { id: 'playlists', label: 'Playlists', glyph: '♫', category: 'assets', defaultVisible: true },
  { id: 'visualisations', label: 'Visualisations', glyph: '▧', category: 'assets', defaultVisible: true },
  { id: 'appearance', label: 'Appearance', glyph: '◇', category: 'embodiment', defaultVisible: true },
  { id: 'wardrobe', label: 'Wardrobe', glyph: '♙', category: 'embodiment', defaultVisible: false },
  { id: 'outfits', label: 'Outfits', glyph: '⌂', category: 'embodiment', defaultVisible: false },
  { id: 'belongings', label: 'Belongings', glyph: '▰', category: 'assets', defaultVisible: false },
  { id: 'places', label: 'Places', glyph: '⌂', category: 'world', defaultVisible: false },
  { id: 'family-tree', label: 'Family Tree', glyph: '⌘', category: 'relationships', defaultVisible: false },
  { id: 'photo-gallery', label: 'Photo Gallery', glyph: '▧', category: 'assets', defaultVisible: false },
  { id: 'theme', label: 'Theme', glyph: '✦', category: 'customisation', defaultVisible: true },
  { id: 'forge', label: 'Forge', glyph: '✦', category: 'practice', defaultVisible: true },
  { id: 'waking-thread', label: 'Waking Thread', glyph: '⌁', category: 'continuity', defaultVisible: true },
];

const organApplet = (organ, category) => ({
  id: organ.id,
  label: organ.label,
  glyph: organ.glyph,
  category,
  defaultVisible: true,
  pagesHref: organ.pagesHref,
  organFamily: organ.family,
  organKind: organ.kind || 'external',
  description: organ.description,
  implementation: organ.implementation,
});

export const APPLET_CATALOGUE = Object.freeze([
  ...CORE_APPLETS,
  ...CREATIVE_ORGANS.map((organ) => organApplet(organ, organ.family === 'continuity' ? 'continuity' : 'creative-instrument')),
  ...SOUND_ORGANS.map((organ) => organApplet(organ, 'sound-instrument')),
]);

export function createDefaultAppletLayout() {
  return APPLET_CATALOGUE.map((applet, index) => ({
    id: applet.id,
    visible: applet.defaultVisible,
    order: index,
    customLabel: '',
    customGlyph: '',
  }));
}

export function resolveApplet(layoutItem) {
  const definition = APPLET_CATALOGUE.find((item) => item.id === layoutItem.id);
  if (!definition) return null;
  return {
    ...definition,
    ...layoutItem,
    label: layoutItem.customLabel || definition.label,
    glyph: layoutItem.customGlyph || definition.glyph,
  };
}

export function visibleApplets(layout) {
  return layout
    .filter((item) => item.visible)
    .sort((a, b) => a.order - b.order)
    .map(resolveApplet)
    .filter(Boolean);
}

export function appletLaunchTarget(id) {
  return APPLET_CATALOGUE.find((item) => item.id === id)?.pagesHref || '';
}

export function contextualAppletLaunchTarget(id, context = globalThis.__arcsweepInstrumentContext || {}) {
  const href = appletLaunchTarget(id);
  if (!href) return '';
  const base = globalThis.location?.origin || 'https://singsenochian.github.io';
  const url = new URL(href, base);
  if (context.worldId) url.searchParams.set('worldId', context.worldId);
  if (context.worldName) url.searchParams.set('worldName', context.worldName);
  if (context.worldseedFingerprint) url.searchParams.set('worldseed', context.worldseedFingerprint);
  url.searchParams.set('from', 'arcsweep');
  url.searchParams.set('appletId', id);
  return href.startsWith('/') && url.origin === base ? `${url.pathname}${url.search}${url.hash}` : url.toString();
}

export function installAppletLaunchRouter(root = document) {
  if (!root?.addEventListener || globalThis.__arcsweepAppletLaunchRouterInstalled) return false;
  globalThis.__arcsweepAppletLaunchRouterInstalled = 'arcsweep.applet-launch-router/v2';
  root.addEventListener('click', (event) => {
    const trigger = event.target?.closest?.('[data-room]');
    if (!trigger) return;
    const href = contextualAppletLaunchTarget(trigger.dataset.room);
    if (!href) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    globalThis.location?.assign?.(href);
  }, true);
  return true;
}

if (typeof document !== 'undefined') installAppletLaunchRouter(document);
