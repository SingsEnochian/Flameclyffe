// Read-only, source-bound Wayglass agentic bloodstream lens for training.
// A GitHub issue label or JSON block is not by itself verified continuity.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { verifyMobiusChain } = require('./wayglass-kernel.cjs');
const { digest } = require('./wyrdrune/canonical.cjs');

const MARKER = 'wayglass-mobius-checkpoint';
const MAX_COMMENTS = 100;
export const BLOODSTREAM_LENS_SCHEMA = 'wayglass.bloodstream-lens/v0.1';

export function inspectBloodstreamComments(comments, {
  issueUrl = null, checkedAt = null, complete = true,
} = {}) {
  const base = { schema: BLOODSTREAM_LENS_SCHEMA, verified: false, cycle: null,
    face: null, checkpoint_digest: null, source_ref: issueUrl,
    observed_at: checkedAt, action_permission: 'none' };
  if (!complete || !Array.isArray(comments) || comments.length >= MAX_COMMENTS)
    return { ...base, status: 'incomplete-source' };
  const tagged = comments.filter(c => typeof c?.body === 'string' && c.body.includes(MARKER));
  if (tagged.length === 0) return { ...base, status: 'no-checkpoint' };
  let cps;
  try {
    cps = tagged.map(c => {
      const match = c.body.match(/```json\s*([\s\S]*?)```/);
      if (!match) throw Error('malformed checkpoint');
      const parsed = JSON.parse(match[1]);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
        !Number.isSafeInteger(parsed.cycle) || parsed.cycle <= 0 ||
        !['outer','inner'].includes(parsed.face) ||
        typeof parsed.root !== 'string' || typeof parsed.prev !== 'string' ||
        !parsed.carry || typeof parsed.carry !== 'object' ||
        parsed.carry_digest !== digest(parsed.carry)) throw Error('invalid checkpoint');
      return parsed;
    });
  } catch {
    return { ...base, status: 'invalid-checkpoint' };
  }
  const root = cps[0].root;
  const verified = verifyMobiusChain(root, cps);
  if (!verified.ok) return { ...base, status: 'broken-chain' };
  const last = cps.at(-1), comment = tagged.at(-1);
  return { schema: BLOODSTREAM_LENS_SCHEMA, status: 'checkpoint-chain-verified',
    verified: true, cycle: last.cycle, face: last.face, lineage_root: root,
    checkpoint_digest: digest(last),
    source_ref: typeof comment.html_url === 'string' ? comment.html_url : issueUrl,
    observed_at: typeof comment.created_at === 'string' ? comment.created_at : checkedAt,
    chain_length: cps.length, action_permission: 'none',
    note: 'Cryptographic continuity only. External GitHub commit anchoring and live scheduler status must be separately established.' };
}
