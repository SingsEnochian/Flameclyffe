export const CODEX_QUIET_STATE_SCHEMA = 'hearthweave.codex-quiet-state/v0.1';

export const CODEX_QUIET_LAW = Object.freeze([
  'Silence is a valid state, not a loading state.',
  'The Codex does not greet merely to prove it is awake.',
  'The Codex does not pulse merely to prove it is live.',
  'A quiet page may remain visually still indefinitely.',
  'New activity may appear only when grounded in a real event or relevant remembered connection.',
]);

export function codexQuietState({ manifestations = [], attention = null } = {}) {
  // When a caller supplies an attention set, even an empty one, that set is the
  // page-local truth about what deserves notice. Activity elsewhere in the
  // House must not wake an unrelated Codex page.
  const visible = Array.isArray(attention)
    ? attention.map((row) => row.manifestation || row).filter(Boolean)
    : (Array.isArray(manifestations) ? manifestations : []).filter((item) => item && !item.quiet && item.material?.live);
  return Object.freeze({
    schema: CODEX_QUIET_STATE_SCHEMA,
    quiet: visible.length === 0,
    visibleCount: visible.length,
    automaticGreeting: false,
    automaticPulse: false,
    automaticPrompt: false,
  });
}

export function applyCodexQuietState(root, state) {
  if (!root?.dataset) return state;
  const value = state || codexQuietState();
  root.dataset.codexQuiet = value.quiet ? 'true' : 'false';
  root.setAttribute?.('aria-busy', 'false');
  return value;
}
