import { INITIAL_ASPECTS } from '../aspects/aspect-contract.js';

export const CODEX_ASPECT_SIGNATURE_SCHEMA = 'hearthweave.codex-aspect-signature/v0.1';

const DEFAULT_SIGNATURES = Object.freeze({
  mapper: Object.freeze({ glyph: '⌁', side: 'outer', line: 'branch', spacing: 'open', cadence: 'lateral' }),
  maker: Object.freeze({ glyph: '⌗', side: 'inner', line: 'joint', spacing: 'compact', cadence: 'constructive' }),
  witness: Object.freeze({ glyph: '⊙', side: 'outer', line: 'evidence', spacing: 'measured', cadence: 'anchored' }),
  continuity: Object.freeze({ glyph: '∞', side: 'inner', line: 'return', spacing: 'measured', cadence: 'backlink' }),
  critic: Object.freeze({ glyph: '×', side: 'outer', line: 'cross', spacing: 'compact', cadence: 'interruptive' }),
  narrative: Object.freeze({ glyph: '∿', side: 'outer', line: 'flow', spacing: 'open', cadence: 'associative' }),
});

function fallback(aspectId) {
  const index = Math.max(0, INITIAL_ASPECTS.findIndex((aspect) => aspect.id === aspectId));
  return Object.freeze({
    glyph: ['·', '⌁', '◇', '⊙'][index % 4],
    side: index % 2 ? 'inner' : 'outer',
    line: 'plain',
    spacing: 'measured',
    cadence: 'open',
  });
}

export function codexAspectSignature(aspectId, growthProfile = null) {
  const id = String(aspectId || '').trim();
  const seed = DEFAULT_SIGNATURES[id] || fallback(id);
  const dominant = growthProfile?.demonstratedPatterns?.[0] || null;
  const recurring = (growthProfile?.collaborators || []).filter((row) => row.recurring).length;
  return Object.freeze({
    schema: CODEX_ASPECT_SIGNATURE_SCHEMA,
    aspectId: id,
    ...seed,
    // These are descriptive accents derived from use, not identity declarations.
    traceDensity: growthProfile?.messageCount > 18 ? 'seasoned' : growthProfile?.messageCount > 5 ? 'familiar' : 'new',
    collaborationTexture: recurring > 2 ? 'braided' : recurring > 0 ? 'threaded' : 'single',
    demonstratedCadence: dominant?.label || null,
  });
}

export function signatureCssAttributes(signature) {
  if (!signature) return Object.freeze({});
  return Object.freeze({
    'data-codex-aspect': signature.aspectId,
    'data-codex-glyph': signature.glyph,
    'data-codex-line': signature.line,
    'data-codex-spacing': signature.spacing,
    'data-codex-cadence': signature.cadence,
    'data-codex-trace-density': signature.traceDensity,
    'data-codex-collaboration-texture': signature.collaborationTexture,
  });
}
