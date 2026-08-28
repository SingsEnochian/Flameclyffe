import { getKelyranSupabase } from './kelyran-supabase.js';

export const ARCSWEEP_LOCAL_STATE_KEY = 'hearthgate.arcsweep.local.v0.1';
export const ARCSWEEP_LOCAL_RECOVERY_KEY = 'hearthgate.arcsweep.local.recovery.v1';
export const DURABLE_WORKSPACE_EVENT = 'arcsweep:durable-workspace-state';

const WORKSPACE_TABLE = 'arcsweep_private_workspaces';
const PROFILE_TABLE = 'arcsweep_operator_profiles';
const MIRROR_DEBOUNCE_MS = 700;
const STARTUP_TIMEOUT_MS = 1800;

let installed = false;
let suppressMirror = false;
let mirrorTimer = null;
let pendingRaw = null;
let reconcilePromise = null;
let workspaceContext = null;
let reconciliationReady = false;

const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));

function emit(detail) {
  globalThis.dispatchEvent?.(new CustomEvent(DURABLE_WORKSPACE_EVENT, { detail }));
}

function parseState(value) {
  if (!value) return null;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : clone(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    if (!Array.isArray(parsed.worlds) || !parsed.worlds.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

function asTime(value) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function nestedArrayCount(value, depth = 0) {
  if (depth > 5 || value == null) return 0;
  if (Array.isArray(value)) return value.length + value.reduce((sum, item) => sum + nestedArrayCount(item, depth + 1), 0);
  if (typeof value !== 'object') return 0;
  return Object.values(value).reduce((sum, item) => sum + nestedArrayCount(item, depth + 1), 0);
}

export function isProbablyFreshDefaultState(state) {
  const value = parseState(state);
  if (!value) return false;
  const worlds = value.worlds || [];
  const scripts = Array.isArray(value.scripts) ? value.scripts : [];
  const continuity = Array.isArray(value.continuity) ? value.continuity : [];
  const manifestations = Array.isArray(value.manifestations) ? value.manifestations : [];
  const feedbackCycles = Array.isArray(value.feedbackCycles) ? value.feedbackCycles : [];
  const onlyDefaultWorld = worlds.length === 1
    && String(worlds[0]?.name || '').trim().toLowerCase() === 'unassigned world';
  const onlyDefaultScript = scripts.length <= 1
    && (!scripts.length || String(scripts[0]?.name || '').trim() === 'First DR Script');
  return onlyDefaultWorld
    && onlyDefaultScript
    && continuity.length === 0
    && manifestations.length === 0
    && feedbackCycles.length === 0;
}

export function durableStateRichness(state) {
  const value = parseState(state);
  if (!value) return -1;
  const worlds = value.worlds || [];
  const scripts = Array.isArray(value.scripts) ? value.scripts : [];
  const waking = worlds.some((world) => {
    const name = String(world?.name || '').trim().toLowerCase();
    return name === 'terra prime' || world?.wakingWorld?.schema === 'arcsweep.waking-world/v1';
  });
  let score = worlds.length * 1000 + scripts.length * 120;
  score += (Array.isArray(value.continuity) ? value.continuity.length : 0) * 40;
  score += (Array.isArray(value.manifestations) ? value.manifestations.length : 0) * 40;
  score += (Array.isArray(value.feedbackCycles) ? value.feedbackCycles.length : 0) * 30;
  score += (Array.isArray(value.returnHistory) ? value.returnHistory.length : 0) * 20;
  score += nestedArrayCount(value.records) * 8;
  score += nestedArrayCount(value.transformationRequests) * 4;
  score += nestedArrayCount(value.observatory) * 2;
  if (waking) score += 500;
  if (isProbablyFreshDefaultState(value)) score -= 900;
  return score;
}

export function durableStateTimestamp(state, fallback = null) {
  const value = parseState(state);
  if (!value) return asTime(fallback);
  const candidates = [
    value.provenance?.updatedAt,
    value.provenance?.updated_at,
    value.updatedAt,
    value.updated_at,
    fallback,
  ].map(asTime);
  for (const world of value.worlds || []) candidates.push(asTime(world?.updatedAt), asTime(world?.createdAt));
  return Math.max(0, ...candidates);
}

export function chooseDurableWorkspaceSnapshot({ localState = null, cloudState = null, cloudUpdatedAt = null } = {}) {
  const local = parseState(localState);
  const cloud = parseState(cloudState);
  if (!local && !cloud) return { source: 'none', state: null, reason: 'no-valid-state' };
  if (!local) return { source: 'cloud', state: cloud, reason: 'local-missing' };
  if (!cloud) return { source: 'local', state: local, reason: 'cloud-missing' };

  const localDefault = isProbablyFreshDefaultState(local);
  const cloudDefault = isProbablyFreshDefaultState(cloud);
  if (localDefault !== cloudDefault) {
    return localDefault
      ? { source: 'cloud', state: cloud, reason: 'protect-cloud-from-fresh-default' }
      : { source: 'local', state: local, reason: 'protect-local-from-fresh-default' };
  }

  const localTime = durableStateTimestamp(local);
  const cloudTime = durableStateTimestamp(cloud, cloudUpdatedAt);
  if (Math.abs(localTime - cloudTime) > 1500) {
    return localTime > cloudTime
      ? { source: 'local', state: local, reason: 'local-newer' }
      : { source: 'cloud', state: cloud, reason: 'cloud-newer' };
  }

  const localRichness = durableStateRichness(local);
  const cloudRichness = durableStateRichness(cloud);
  if (cloudRichness > localRichness) return { source: 'cloud', state: cloud, reason: 'cloud-richer' };
  return { source: 'local', state: local, reason: localRichness > cloudRichness ? 'local-richer' : 'local-tie' };
}

function stateFingerprint(state) {
  try { return JSON.stringify(state); } catch { return ''; }
}

function backupLocalRaw(raw, reason) {
  if (!raw) return;
  try {
    globalThis.localStorage?.setItem(ARCSWEEP_LOCAL_RECOVERY_KEY, JSON.stringify({
      schema: 'arcsweep.local-recovery/v1',
      saved_at: new Date().toISOString(),
      reason,
      state: JSON.parse(raw),
    }));
  } catch {}
}

async function resolveWorkspaceContext() {
  const client = await getKelyranSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  const user = sessionData.session?.user || null;
  if (!user) return { status: 'signed-out', client, slug: null };

  const { data: profile, error: profileError } = await client
    .from(PROFILE_TABLE)
    .select('workspace_slug, operator_key, access_level')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile?.workspace_slug) return { status: 'no-workspace-profile', client, slug: null };
  return { status: 'ready', client, slug: profile.workspace_slug, operatorKey: profile.operator_key || null };
}

async function readWorkspace(context) {
  if (!context?.slug) return null;
  const { data, error } = await context.client
    .from(WORKSPACE_TABLE)
    .select('slug, state, updated_at')
    .eq('slug', context.slug)
    .single();
  if (error) throw error;
  return data || null;
}

async function writeWorkspace(context, state) {
  if (!context?.slug || !parseState(state)) return null;
  const now = new Date().toISOString();
  const { data, error } = await context.client
    .from(WORKSPACE_TABLE)
    .update({ state: clone(state), updated_at: now })
    .eq('slug', context.slug)
    .select('slug, updated_at')
    .single();
  if (error) throw error;
  return data || { slug: context.slug, updated_at: now };
}

function restoreLocalState(state, reason) {
  const localStorage = globalThis.localStorage;
  if (!localStorage || !parseState(state)) return false;
  const currentRaw = localStorage.getItem(ARCSWEEP_LOCAL_STATE_KEY);
  const nextRaw = JSON.stringify(state);
  if (currentRaw === nextRaw) return false;
  backupLocalRaw(currentRaw, reason);
  suppressMirror = true;
  try { localStorage.setItem(ARCSWEEP_LOCAL_STATE_KEY, nextRaw); }
  finally { suppressMirror = false; }
  return true;
}

async function reconcileNow() {
  const context = await resolveWorkspaceContext();
  if (context.status !== 'ready') {
    workspaceContext = context;
    reconciliationReady = false;
    emit({ state: context.status });
    return { state: context.status, source: 'local' };
  }

  const row = await readWorkspace(context);
  const localRaw = globalThis.localStorage?.getItem(ARCSWEEP_LOCAL_STATE_KEY) || '';
  const localState = parseState(localRaw);
  const cloudState = parseState(row?.state);
  const choice = chooseDurableWorkspaceSnapshot({ localState, cloudState, cloudUpdatedAt: row?.updated_at });
  let restored = false;
  let mirrored = false;

  if (choice.source === 'cloud' && choice.state) {
    restored = restoreLocalState(choice.state, `cloud-restore:${choice.reason}`);
  } else if (choice.source === 'local' && choice.state) {
    if (stateFingerprint(choice.state) !== stateFingerprint(cloudState)) {
      await writeWorkspace(context, choice.state);
      mirrored = true;
    }
  }

  workspaceContext = context;
  reconciliationReady = true;
  const state = restored ? 'restored-cloud' : mirrored ? 'mirrored-local' : choice.source === 'none' ? 'empty' : 'in-sync';
  emit({ state, source: choice.source, reason: choice.reason, workspace: context.slug });
  return { state, source: choice.source, reason: choice.reason, workspace: context.slug, restored, mirrored };
}

export function reconcileDurableWorkspaceState() {
  if (reconcilePromise) return reconcilePromise;
  reconcilePromise = reconcileNow().catch((error) => {
    reconciliationReady = false;
    emit({ state: 'degraded', error: error?.message || String(error) });
    return { state: 'degraded', error };
  }).finally(() => { reconcilePromise = null; });
  return reconcilePromise;
}

async function mirrorPendingState() {
  mirrorTimer = null;
  const raw = pendingRaw;
  pendingRaw = null;
  const state = parseState(raw);
  if (!state) return;

  if (!reconciliationReady || workspaceContext?.status !== 'ready') {
    const result = await reconcileDurableWorkspaceState();
    if (!reconciliationReady || workspaceContext?.status !== 'ready') return result;
  }

  try {
    const row = await readWorkspace(workspaceContext);
    const cloudState = parseState(row?.state);
    const choice = chooseDurableWorkspaceSnapshot({ localState: state, cloudState, cloudUpdatedAt: row?.updated_at });
    if (choice.source === 'cloud' && choice.state) {
      restoreLocalState(choice.state, `cloud-conflict:${choice.reason}`);
      emit({ state: 'conflict-restored-cloud', source: 'cloud', reason: choice.reason, workspace: workspaceContext.slug });
      return;
    }
    await writeWorkspace(workspaceContext, state);
    emit({ state: 'mirrored-local', source: 'local', reason: choice.reason, workspace: workspaceContext.slug });
  } catch (error) {
    reconciliationReady = false;
    emit({ state: 'degraded', error: error?.message || String(error) });
  }
}

function queueMirror(raw) {
  pendingRaw = String(raw || '');
  if (mirrorTimer) clearTimeout(mirrorTimer);
  mirrorTimer = setTimeout(() => { void mirrorPendingState(); }, MIRROR_DEBOUNCE_MS);
}

function installStorageMirror() {
  if (typeof Storage === 'undefined' || Storage.prototype.__arcsweepDurableWorkspaceInstalled) return;
  const nativeSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function arcsweepDurableWorkspaceSetItem(key, value) {
    const result = nativeSetItem.call(this, key, value);
    if (!suppressMirror && this === globalThis.localStorage && String(key) === ARCSWEEP_LOCAL_STATE_KEY) queueMirror(value);
    return result;
  };
  Object.defineProperty(Storage.prototype, '__arcsweepDurableWorkspaceInstalled', { value: true, configurable: true });
}

function withTimeout(promise, milliseconds) {
  let timer;
  return Promise.race([
    promise,
    new Promise((resolve) => { timer = setTimeout(() => resolve({ state: 'deferred' }), milliseconds); }),
  ]).finally(() => clearTimeout(timer));
}

function scheduleReconcile(delay = 0) {
  setTimeout(() => { void reconcileDurableWorkspaceState(); }, delay);
}

export async function installDurableWorkspaceState({ safeBoot = false, timeoutMs = STARTUP_TIMEOUT_MS } = {}) {
  if (safeBoot || typeof window === 'undefined' || !globalThis.localStorage) return { state: 'disabled' };
  if (!installed) {
    installed = true;
    installStorageMirror();
    globalThis.addEventListener?.('online', () => scheduleReconcile(50));
    void getKelyranSupabase().then((client) => {
      client.auth.onAuthStateChange(() => scheduleReconcile(50));
    }).catch(() => null);
  }
  return withTimeout(reconcileDurableWorkspaceState(), Math.max(250, Number(timeoutMs) || STARTUP_TIMEOUT_MS));
}
