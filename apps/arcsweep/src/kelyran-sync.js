import { KELYRAN_SCHOOL_SCHEMA, normaliseKelyranSchool } from './kelyran-school.js';

export const KELYRAN_SYNC_SCHEMA = 'arcsweep.kelyran-sync-result/v0.1';

const time = (value) => Date.parse(value || 0) || 0;
const stamp = (item) => time(item?.updatedAt || item?.approvedAt || item?.reviewedAt || item?.createdAt);
const clone = (value) => structuredClone(value);

function mergeById(local = [], remote = []) {
  const merged = new Map();
  for (const item of [...remote, ...local]) {
    if (!item?.id) continue;
    const current = merged.get(item.id);
    if (!current || stamp(item) >= stamp(current)) merged.set(item.id, clone(item));
  }
  return [...merged.values()];
}

export function mergeKelyranSchools(localValue, remoteValue, now = new Date().toISOString()) {
  const local = normaliseKelyranSchool(localValue, now);
  const remote = normaliseKelyranSchool(remoteValue, now);
  if (local.schema !== KELYRAN_SCHOOL_SCHEMA || remote.schema !== KELYRAN_SCHOOL_SCHEMA) throw new Error('Unsupported Kelyran school schema.');
  if (local.canonRevision !== remote.canonRevision) throw new Error('Kelyran canon revisions diverged; Steward review is required.');
  const localNewer = stamp(local) >= stamp(remote);
  const base = clone(localNewer ? local : remote);
  base.lexicon = mergeById(local.lexicon, remote.lexicon).filter((entry) => entry.status !== 'approved' || String(entry.sourceReceipt || '').trim());
  base.grammar = mergeById(local.grammar, remote.grammar);
  base.phonology = mergeById(local.phonology, remote.phonology);
  base.units = mergeById(local.units, remote.units);
  base.proposals = mergeById(local.proposals, remote.proposals);
  base.learner.cards = { ...remote.learner.cards, ...local.learner.cards };
  for (const [id, card] of Object.entries(remote.learner.cards)) {
    if (stamp(card) > stamp(local.learner.cards[id])) base.learner.cards[id] = clone(card);
  }
  base.learner.lessonProgress = { ...remote.learner.lessonProgress, ...local.learner.lessonProgress };
  base.learner.receipts = mergeById(local.learner.receipts.map((item, index) => ({ ...item, id: item.id || `${item.schema}:${item.createdAt}:${index}` })), remote.learner.receipts.map((item, index) => ({ ...item, id: item.id || `${item.schema}:${item.createdAt}:${index}` }))).map(({ id, ...item }) => item);
  base.reporting = {
    invitationOpen: stamp(local.reporting) >= stamp(remote.reporting) ? local.reporting.invitationOpen : remote.reporting.invitationOpen,
    reports: mergeById(local.reporting.reports, remote.reporting.reports),
    updatedAt: stamp(local.reporting) >= stamp(remote.reporting) ? local.reporting.updatedAt : remote.reporting.updatedAt,
  };
  base.createdAt = time(local.createdAt) <= time(remote.createdAt) ? local.createdAt : remote.createdAt;
  base.updatedAt = now;
  return normaliseKelyranSchool(base, now);
}

export async function syncKelyranSchool(localSchool, supabase, now = new Date().toISOString()) {
  if (!supabase?.auth?.getUser || !supabase?.from) throw new Error('An authenticated Supabase client is required.');
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const userId = authData?.user?.id;
  if (!userId) throw new Error('Sign in before synchronising Kelyran School.');
  const read = await supabase.from('kelyran_school_snapshots').select('school, updated_at').eq('user_id', userId).maybeSingle();
  if (read.error) throw read.error;
  const school = read.data?.school ? mergeKelyranSchools(localSchool, read.data.school, now) : normaliseKelyranSchool(localSchool, now);
  const write = await supabase.from('kelyran_school_snapshots').upsert({ user_id: userId, schema_version: school.schema, canon_revision: school.canonRevision, school, updated_at: now }, { onConflict: 'user_id' }).select('school, updated_at').single();
  if (write.error) throw write.error;
  return Object.freeze({ schema: KELYRAN_SYNC_SCHEMA, state: read.data ? 'merged' : 'created', userId, school: normaliseKelyranSchool(write.data.school, now), syncedAt: write.data.updated_at || now });
}
