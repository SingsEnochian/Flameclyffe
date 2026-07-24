export const APPLET_CATALOGUE = [
  { id: 'portal', label: 'Portal', glyph: '◉', category: 'core', defaultVisible: true },
  { id: 'about-world', label: 'About this World', glyph: 'ⓘ', category: 'core', defaultVisible: true },
  { id: 'time', label: 'Time', glyph: '◷', category: 'core', defaultVisible: true },
  { id: 'timeline', label: 'Timeline', glyph: '⌁', category: 'core', defaultVisible: true },
  { id: 'scripts', label: 'Scripts', glyph: '▤', category: 'world', defaultVisible: true },
  { id: 'identity', label: 'About Me', glyph: '◇', category: 'world', defaultVisible: true },
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
