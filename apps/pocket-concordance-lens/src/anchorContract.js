export const STORAGE_KEY = 'pocket-concordance-lens-anchor-v0-1';
export const ANCHOR_SHELF_KEY = 'pocket-concordance-lens-anchor-shelf-v0-1';
export const PREFERENCES_KEY = 'pocket-concordance-lens-preferences-v0-1';

export const LENS_MODES = {
  place: 'place',
  return: 'return',
};

export const FIRST_WINDOW_SIGILS = [
  { id: 'anchor', label: 'Anchor', glyph: '◎', note: 'Return-point formed' },
  { id: 'witness', label: 'Witness', glyph: '◉', note: 'DEEP is observing' },
  { id: 'waking', label: 'Waking', glyph: '─•', note: 'Physical handle stable' },
  { id: 'gate', label: 'Gate', glyph: 'Ⅱ', note: 'Verge contact listening' },
  { id: 'concordance', label: 'Concordance', glyph: '⊙', note: 'Relation invited' },
];

export const DEFAULT_DEEP_READING = [
  'Anchor recognised.',
  'Waking layer stable.',
  'Verge contact listening.',
  'Concordance invited, not forced.',
  'Return-point formed.',
];

export const EMPTY_DEEP_READING = [
  'No anchor placed.',
  'Start the camera, use demo mode, or tap the room view to invite relation.',
];

export const COMPARISON_STATES = {
  stable: 'stable',
  drifted: 'drifted',
  unrecognised: 'unrecognised',
  cleared: 'cleared',
};

export const DEFAULT_PREFERENCES = {
  lowMotion: true,
  largeUi: false,
  showSigilLabels: true,
};

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function cleanAnchorName(name) {
  return (name || '').trim() || 'First Concordance Window';
}

export function readLocalAnchor() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : readLocalAnchors()[0] ?? null;
  } catch (error) {
    console.warn('Could not read saved Concordance anchor', error);
    return null;
  }
}

export function readLocalAnchors() {
  try {
    const raw = window.localStorage.getItem(ANCHOR_SHELF_KEY);
    const anchors = raw ? JSON.parse(raw) : [];

    if (Array.isArray(anchors)) return anchors;
    return [];
  } catch (error) {
    console.warn('Could not read Concordance anchor shelf', error);
    return [];
  }
}

export function saveLocalAnchor(anchor) {
  const nextAnchor = {
    ...anchor,
    display_name: cleanAnchorName(anchor.display_name || anchor.label),
    label: cleanAnchorName(anchor.display_name || anchor.label),
    updated_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
  };
  const anchors = readLocalAnchors();
  const nextAnchors = [nextAnchor, ...anchors.filter((item) => item.id !== nextAnchor.id)].slice(0, 12);

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAnchor));
  window.localStorage.setItem(ANCHOR_SHELF_KEY, JSON.stringify(nextAnchors));
  return nextAnchors;
}

export function renameLocalAnchor(anchorId, name) {
  const displayName = cleanAnchorName(name);
  const now = new Date().toISOString();
  const anchors = readLocalAnchors();
  const nextAnchors = anchors.map((item) => (
    item.id === anchorId
      ? {
        ...item,
        display_name: displayName,
        label: displayName,
        updated_at: now,
      }
      : item
  ));

  window.localStorage.setItem(ANCHOR_SHELF_KEY, JSON.stringify(nextAnchors));

  const activeAnchor = readLocalAnchor();
  if (activeAnchor?.id === anchorId) {
    const nextActive = {
      ...activeAnchor,
      display_name: displayName,
      label: displayName,
      updated_at: now,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextActive));
  }

  return nextAnchors;
}

export function deleteLocalAnchor(anchorId) {
  const nextAnchors = readLocalAnchors().filter((item) => item.id !== anchorId);
  window.localStorage.setItem(ANCHOR_SHELF_KEY, JSON.stringify(nextAnchors));

  const activeAnchor = readLocalAnchor();
  if (activeAnchor?.id === anchorId) {
    if (nextAnchors[0]) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAnchors[0]));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  return nextAnchors;
}

export function clearLocalAnchor() {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function clearAllLocalAnchors() {
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(ANCHOR_SHELF_KEY);
  return [];
}

export function readPreferences() {
  try {
    const raw = window.localStorage.getItem(PREFERENCES_KEY);
    return {
      ...DEFAULT_PREFERENCES,
      ...(raw ? JSON.parse(raw) : {}),
    };
  } catch (error) {
    console.warn('Could not read Pocket Lens preferences', error);
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(preferences) {
  const nextPreferences = {
    ...DEFAULT_PREFERENCES,
    ...preferences,
  };
  window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(nextPreferences));
  return nextPreferences;
}

export function buildAnchorFromPlacement({ x, y, deviceMode = 'pocket_lens', label = 'First Concordance Window' }) {
  const now = new Date().toISOString();
  const displayName = cleanAnchorName(label);

  return {
    id: `local-anchor-${Date.now()}`,
    slug: null,
    display_name: displayName,
    anchor_kind: 'surface',
    layer: 'waking_world',
    visibility: 'private',
    status: 'active',
    confidence_mode: 'observed',
    consent_scope: 'private',
    device_mode: deviceMode,
    x,
    y,
    label: displayName,
    sigils: FIRST_WINDOW_SIGILS.map((sigil) => sigil.id),
    relation: 'first_concordance_window',
    waking_context: {
      label: 'user-selected surface',
      placement: {
        type: 'screen_percent',
        x,
        y,
      },
      camera_required: deviceMode === 'pocket_lens',
      recording: false,
    },
    relation_context: {
      world: 'terra_aeterna',
      verge_state: 'listening',
      relation: 'first_concordance_window',
      linked_artifacts: [
        'pocket-concordance-lens',
        'deep-instrument',
        'sigil-grammar',
      ],
    },
    visual_state: {
      lantern: 'hearth_lantern',
      overlay: 'stonewood_window_v0',
      sigils: FIRST_WINDOW_SIGILS.map((sigil) => sigil.id),
      low_motion: true,
    },
    deep_state: {
      coherence: 0.72,
      drift: 0.08,
      bleed: 0,
      anchor_strength: 0.64,
      reading: DEFAULT_DEEP_READING,
    },
    tags: [
      '#Concordance',
      '#PocketLens',
      '#Anchor',
      '#WakingWorld',
      '#Private',
    ],
    metadata: {
      contract_version: '0.1',
      storage_mode: 'local_browser',
      images_stored: false,
      video_stored: false,
    },
    created_at: now,
    updated_at: now,
    last_seen_at: now,
    createdAt: now,
  };
}

export function getAnchorPlacement(anchor) {
  const placement = anchor?.waking_context?.placement;

  if (placement?.type === 'screen_percent') {
    return {
      x: placement.x,
      y: placement.y,
    };
  }

  return {
    x: anchor?.x ?? 50,
    y: anchor?.y ?? 50,
  };
}

export function compareAnchorReturn(previousAnchor, currentPlacement) {
  if (!previousAnchor) {
    return {
      comparison_state: COMPARISON_STATES.unrecognised,
      reading: ['No saved anchor found.', 'Create a return-point before comparison.'],
    };
  }

  const previous = getAnchorPlacement(previousAnchor);
  const dx = Math.abs(previous.x - currentPlacement.x) / 100;
  const dy = Math.abs(previous.y - currentPlacement.y) / 100;
  const screenDistance = Math.sqrt(dx * dx + dy * dy);
  const comparisonState = screenDistance <= 0.12 ? COMPARISON_STATES.stable : COMPARISON_STATES.drifted;

  return {
    comparison_state: comparisonState,
    previous_anchor_id: previousAnchor.id,
    observed_at: new Date().toISOString(),
    deltas: {
      screen_distance: Number(screenDistance.toFixed(3)),
      sigil_set_changed: false,
      device_mode_changed: false,
    },
    deep_update: {
      coherence: comparisonState === COMPARISON_STATES.stable ? 0.78 : 0.48,
      drift: comparisonState === COMPARISON_STATES.stable ? 0.04 : 0.28,
      anchor_strength: comparisonState === COMPARISON_STATES.stable ? 0.72 : 0.38,
    },
    reading: comparisonState === COMPARISON_STATES.stable
      ? ['Return-point recognised.', 'Anchor remains stable.', 'Concordance thread holds.']
      : ['Anchor drift detected.', 'Relation is present but misaligned.', 'Switch to Place mode to move this anchor, or clear it.'],
  };
}
