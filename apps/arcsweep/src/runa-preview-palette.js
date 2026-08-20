import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';
import { RUNA_RENDERER_REVIEW_SCHEMA } from './runa-renderer-candidate.js';

export const RUNA_PREVIEW_PALETTE_SCHEMA = 'arcsweep.runa-preview-palette/v1';

const HARMONIC_SETS = Object.freeze({
  none: Object.freeze([]),
  'root-fifth-octave': Object.freeze([1, 1.5, 2]),
  'root-third-fifth': Object.freeze([1, 1.25, 1.5]),
  'root-octaves': Object.freeze([1, 2, 4]),
});

const ENVIRONMENT_SOURCES = new Set(['none', 'filtered-noise']);

function invariant(condition, message) {
  if (!condition) throw new Error(`ARCSWEEP_RUNA_PALETTE: ${message}`);
}

function nonEmpty(value, field) {
  const text = String(value ?? '').trim();
  invariant(text, `${field} is required`);
  return text;
}

export function availableRunaPreviewPalettes() {
  return Object.freeze({
    harmonic_sets: Object.freeze(Object.keys(HARMONIC_SETS)),
    environment_sources: Object.freeze([...ENVIRONMENT_SOURCES]),
  });
}

export async function createRunaPreviewPaletteReceipt({
  rendererReview,
  selectedBy,
  harmonicSet = 'none',
  environmentSource = 'none',
  note = '',
  selectedAt,
} = {}) {
  invariant(rendererReview?.schema === RUNA_RENDERER_REVIEW_SCHEMA, 'an explicit Runa renderer review is required');
  invariant(rendererReview.decision === 'approved', 'renderer review must be approved before assigning a preview palette');
  invariant(rendererReview.authority?.preview_compilation_allowed === true, 'review must explicitly permit preview compilation');
  invariant(Object.hasOwn(HARMONIC_SETS, harmonicSet), 'unknown harmonicSet');
  invariant(ENVIRONMENT_SOURCES.has(environmentSource), 'unknown environmentSource');
  const actor = nonEmpty(selectedBy, 'selectedBy');
  const timestamp = selectedAt ?? new Date().toISOString();
  const ratios = HARMONIC_SETS[harmonicSet];

  const core = {
    schema: RUNA_PREVIEW_PALETTE_SCHEMA,
    schema_version: 1,
    selected_at: timestamp,
    selected_by: actor,
    world_id: rendererReview.source.world_id,
    source: {
      renderer_review_id: rendererReview.review_id,
      renderer_review_fingerprint: rendererReview.review_fingerprint,
      renderer_candidate_id: rendererReview.source.candidate_id,
      suggestion_id: rendererReview.source.suggestion_id,
    },
    selection: {
      harmonic_set: harmonicSet,
      harmonic_ratios: structuredClone(ratios),
      environment_source: environmentSource,
      note: String(note || '').trim(),
    },
    authority: {
      explicit_human_selection: true,
      assigns_preview_harmonic_set: harmonicSet !== 'none',
      assigns_preview_environment_source: environmentSource !== 'none',
      assignments_are_preview_only: true,
      persistent_world_soundscape_mutable: false,
      autoplay_authorized: false,
      haptic_authorized: false,
      midi_authorized: false,
      soundfont_authorized: false,
      canon_commit: false,
      physical_claim: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    palette_id: `arcsweep-runa-palette-${fingerprint.slice(0, 24)}`,
    palette_fingerprint: fingerprint,
  });
}
