export const TAAVEREN_VAEN_CANON_OVERLAY = Object.freeze({
  schema: 'arcsweep.taaveren-vaen-canon-overlay/v1',
  revised_at: '2026-09-05T21:43:00-04:00',
  world_source_key: 'taveren-vaen',
  canonical_name: 'Kestrelle al’Var',
  era: 'Age of Restoration',
  turning: 'later Turning of the Wheel',
  chronology: 'approximately two thousand years after Rand al’Thor',
  tower_continuity: Object.freeze({
    white_tower_survives: true,
    tar_valon_survives: true,
    black_tower_survives: true,
    saidin_remains_clean: true,
  }),
  technology_baseline: 'open',
  authority: Object.freeze({
    current_project_canon_supersedes_older_bundle_assertions: true,
    source_snapshot_remains_provenance: true,
    old_fourth_age_profile_is_not_active_canon: true,
    old_early_industrial_profile_is_not_active_canon: true,
    old_kestrelle_alvalari_name_is_superseded: true,
  }),
});

const CURRENT_CANON_NOTE = `## Current canon overlay · 2026-09-05

**Kestrelle al’Var** is the canonical protagonist name. **Kestrelle al’Valari** and earlier working names remain provenance only.

Ta’veren Vaen is set in the **Age of Restoration**, in a **later Turning of the Wheel**, approximately two thousand years after Rand al’Thor. Tar Valon, the White Tower, and the Black Tower survive into this Turning; saidin remains clean. The project does not inherit the older “Fourth Age” premise.

The technology baseline for this Turning remains deliberately open. Earlier early-industrial details in the historical source snapshot are development provenance, not active canon, until separately adopted.

`;

function replaceCurrentName(text = '') {
  return String(text)
    .replaceAll('Kestrelle al’Valari', 'Kestrelle al’Var')
    .replace(
      /The earlier working titles Ta’veren Bound and Ta’veren Unbound, and the earlier protagonist names Ayrel al’Valsora and Kestrelle al’Var, are provenance only\./g,
      'The earlier working titles Ta’veren Bound and Ta’veren Unbound, and the earlier protagonist names Ayrel al’Valsora and Kestrelle al’Valari, are provenance only.',
    )
    .replace(
      /\*\*Earlier protagonist names:\*\* Ayrel al’Valsora; Kestrelle al’Var/g,
      '**Earlier protagonist names:** Ayrel al’Valsora; Kestrelle al’Valari',
    );
}

function overlayWorld(world) {
  if (world?.sourceKey !== TAAVEREN_VAEN_CANON_OVERLAY.world_source_key) return world;
  return Object.freeze({
    ...world,
    kind: 'Desired Reality / Age of Restoration · later Turning of the Wheel',
    protagonist: TAAVEREN_VAEN_CANON_OVERLAY.canonical_name,
    description: 'Approximately two thousand years after Rand al’Thor, Ta’veren Vaen unfolds in a later Turning called the Age of Restoration. Tar Valon and the White Tower endure; the Black Tower also survives as a sovereign institution. The technology baseline for this Turning remains an open authored field.',
    history: 'The White Tower and Black Tower survive across the turning boundary rather than being rediscovered after extinction. Saidin remains clean. Kestrelle al’Var is eighteen, a fully recognised travelling Wise Woman, healer, Dreamwalker, and strong channeller trained with Meriene Delvarinne. The exact intervening chronology, institutional evolution, and technology history remain open until authored.',
    rules: 'Age of Restoration is the active era name. Do not inherit the superseded Fourth Age or fixed early-industrial premise. The White and Black Towers remain sovereign; Kestrelle enters either as an already recognised Wise Woman. Power, Pattern-pressure, bonds, dreams, prophecy, circles, and institutions do not turn consent into obedience.',
    revisedAt: '2026-09-05',
    canonOverlay: TAAVEREN_VAEN_CANON_OVERLAY,
  });
}

function overlayDocument(document) {
  if (document?.worldSourceKey !== TAAVEREN_VAEN_CANON_OVERLAY.world_source_key) return document;
  const renamed = replaceCurrentName(document.content || '');
  const isKestrelle = document.sourceKey === 'taveren-vaen-kestrelle-script';
  const isUniverseWiki = document.sourceKey === 'taveren-vaen-universe-wiki';
  if (!isKestrelle && !isUniverseWiki) return document;
  return Object.freeze({
    ...document,
    title: isKestrelle ? 'Ta’veren Vaen 01 — Kestrelle al’Var' : document.title,
    content: `${CURRENT_CANON_NOTE}${renamed}`,
    revisedAt: '2026-09-05',
    canonOverlay: TAAVEREN_VAEN_CANON_OVERLAY,
  });
}

export function applyTaaverenVaenCanonOverlay({ worlds = [], documents = [] } = {}) {
  return Object.freeze({
    worlds: Object.freeze(worlds.map(overlayWorld)),
    documents: Object.freeze(documents.map(overlayDocument)),
    overlay: TAAVEREN_VAEN_CANON_OVERLAY,
  });
}
