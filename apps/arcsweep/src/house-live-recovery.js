import { readHouseCommons, restoreHouseRuntimeSession } from './house-runtime.js';
import { getKelyranSupabase, requestKelyranMagicLink } from './kelyran-supabase.js';

export const HOUSE_LIVE_RECOVERY_VERSION = 'arcsweep.house-live-recovery/v1';

let installed = false;
let authSubscription = null;
let observer = null;

const hostedPages = () => globalThis.location?.hostname === 'singsenochian.github.io';

async function supabaseSession() {
  const client = await getKelyranSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return { client, session: data?.session || null };
}

async function oxStatus() {
  const response = await fetch('/api/v1/flames/oxalpha/status', { cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Ox Alpha status ${response.status}`);
  return data;
}

function ensureRail() {
  const form = document.querySelector('#commons-form');
  if (!form) return null;
  let rail = document.querySelector('[data-house-live-recovery]');
  if (rail) return rail;
  rail = document.createElement('section');
  rail.className = 'house-live-recovery';
  rail.dataset.houseLiveRecovery = HOUSE_LIVE_RECOVERY_VERSION;
  rail.innerHTML = `<div class="house-live-recovery-head"><div><span class="eyebrow">House transport</span><strong data-house-live-title>Checking live path…</strong></div><button type="button" class="quiet mini" data-house-live-retry>Retry</button></div><p class="muted" data-house-live-detail>Checking Supabase identity, Commons transport, and Ox Alpha.</p><form data-house-live-signin hidden><label>Email <input type="email" autocomplete="email" data-house-live-email placeholder="Steward email" /></label><button type="submit">Send sign-in link</button></form>`;
  form.parentElement?.insertBefore(rail, form);
  rail.querySelector('[data-house-live-retry]')?.addEventListener('click', () => void refreshHouseLiveRecovery());
  rail.querySelector('[data-house-live-signin]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = rail.querySelector('[data-house-live-email]')?.value || '';
    const detail = rail.querySelector('[data-house-live-detail]');
    try {
      detail.textContent = 'Sending Steward sign-in link…';
      await requestKelyranMagicLink(email, globalThis.location?.href);
      detail.textContent = 'Sign-in link sent. Open it on this device, then return to House. The rail will reconnect automatically.';
    } catch (error) {
      detail.textContent = `Sign-in failed: ${error?.message || error}`;
    }
  });
  return rail;
}

export function houseLiveRecoveryNeedsMount(root = globalThis.document) {
  if (!root?.querySelector) return false;
  return Boolean(root.querySelector('#commons-form') && !root.querySelector('[data-house-live-recovery]'));
}

function setRail(rail, { state, title, detail, showSignin = false } = {}) {
  if (!rail) return;
  rail.dataset.houseLiveState = state || 'unknown';
  const titleNode = rail.querySelector('[data-house-live-title]');
  const detailNode = rail.querySelector('[data-house-live-detail]');
  const signin = rail.querySelector('[data-house-live-signin]');
  if (titleNode) titleNode.textContent = title || state || 'House status';
  if (detailNode) detailNode.textContent = detail || '';
  if (signin) signin.hidden = !showSignin;
}

export async function refreshHouseLiveRecovery() {
  const rail = ensureRail();
  if (!rail) return { state: 'not-mounted' };
  setRail(rail, { state: 'checking', title: 'Checking House live path…', detail: 'Checking Steward session, Commons, and Ox Alpha.' });
  try {
    const { session } = await supabaseSession();
    if (!session?.access_token) {
      setRail(rail, {
        state: 'auth-required',
        title: 'House offline · Steward sign-in required',
        detail: hostedPages()
          ? 'GitHub Pages uses the signed-in Supabase Steward session directly. Sign in here once; there is no server cookie to seal on this static host.'
          : 'Sign in with the Steward Supabase identity to connect House.',
        showSignin: true,
      });
      return { state: 'auth-required' };
    }

    const houseSession = await restoreHouseRuntimeSession();
    if (!houseSession) {
      setRail(rail, { state: 'session-failed', title: 'House identity found · transport session failed', detail: 'Supabase is signed in, but the House transport did not accept the session. Retry to re-run the bridge.' });
      return { state: 'session-failed' };
    }

    const [commons, ox] = await Promise.all([readHouseCommons(houseSession), oxStatus()]);
    const entries = Array.isArray(commons?.entries) ? commons.entries.length : Array.isArray(commons) ? commons.length : 0;
    const oxReady = ox?.configured === true && ox?.runtime_reachable !== false;
    setRail(rail, {
      state: oxReady ? 'live' : 'commons-live-ox-unavailable',
      title: oxReady ? 'House LIVE · Ox Alpha reachable' : 'House transport LIVE · Ox Alpha not ready',
      detail: `${entries} Commons entries readable · Ox Alpha ${ox?.provider || 'provider ?'} / ${ox?.model || 'model ?'} · ${hostedPages() ? 'GitHub Pages → Supabase Edge' : 'hosted transport'}`,
    });
    globalThis.dispatchEvent?.(new CustomEvent('arcsweep:house-live-state', { detail: { state: oxReady ? 'live' : 'partial', ox, entries } }));
    return { state: oxReady ? 'live' : 'partial', ox, entries };
  } catch (error) {
    setRail(rail, { state: 'error', title: 'House live path failed', detail: error?.message || String(error) });
    return { state: 'error', error: error?.message || String(error) };
  }
}

export async function installHouseLiveRecovery() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  const style = document.createElement('style');
  style.textContent = `.house-live-recovery{margin:.65rem 0;padding:.7rem .8rem;border:1px solid var(--line-soft);border-radius:.85rem;background:var(--panel)}.house-live-recovery-head{display:flex;justify-content:space-between;gap:.8rem;align-items:center}.house-live-recovery[data-house-live-state="live"]{border-color:color-mix(in srgb,var(--seafoam,#8dd8c0) 55%,var(--line-soft))}.house-live-recovery[data-house-live-state="auth-required"],.house-live-recovery[data-house-live-state="error"]{border-color:color-mix(in srgb,var(--gold,#d9b46f) 55%,var(--line-soft))}.house-live-recovery [data-house-live-signin]{display:flex;gap:.5rem;align-items:end;flex-wrap:wrap}.house-live-recovery [data-house-live-signin][hidden]{display:none}.house-live-recovery input{min-width:min(18rem,75vw)}`;
  document.head.append(style);
  observer = new MutationObserver(() => {
    if (!houseLiveRecoveryNeedsMount()) return;
    ensureRail();
    queueMicrotask(() => void refreshHouseLiveRecovery());
  });
  observer.observe(document.body, { childList: true, subtree: true });
  const { client } = await supabaseSession().catch(() => ({ client: null }));
  if (client) {
    const { data } = client.auth.onAuthStateChange(() => queueMicrotask(() => void refreshHouseLiveRecovery()));
    authSubscription = data?.subscription || null;
  }
  ensureRail();
  void refreshHouseLiveRecovery();
  globalThis.addEventListener?.('beforeunload', () => { observer?.disconnect(); authSubscription?.unsubscribe?.(); }, { once: true });
}

if (typeof document !== 'undefined') void installHouseLiveRecovery();
