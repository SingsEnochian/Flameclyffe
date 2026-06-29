export const DEEP_CONSENT_EVENT = 'deep-consent-state-change';
export const DEEP_CONSENT_GLOBAL = '__FLAMECLYFFE_DEEP_CONSENT__';

export const CONSENT_STATES = Object.freeze({
  off: 'off',
  on: 'on',
  blocked: 'blocked',
});

const ALLOWED_STATES = new Set(Object.values(CONSENT_STATES));

function hasWindow() {
  return typeof window !== 'undefined';
}

function normaliseState(value, fallback = CONSENT_STATES.off) {
  return ALLOWED_STATES.has(value) ? value : fallback;
}

function getSharedSlot() {
  if (!hasWindow()) return {};
  window[DEEP_CONSENT_GLOBAL] = window[DEEP_CONSENT_GLOBAL] || {};
  return window[DEEP_CONSENT_GLOBAL];
}

function dispatchConsentState(state) {
  if (!hasWindow() || typeof window.CustomEvent !== 'function') return;

  window.dispatchEvent(new CustomEvent(DEEP_CONSENT_EVENT, {
    detail: { state: { ...state } },
  }));
}

export function makeConsentState(branches) {
  return Object.fromEntries(
    branches.map((branch) => [branch.id, normaliseState(branch.state)])
  );
}

export function getConsentState(fallback = {}) {
  const shared = getSharedSlot();
  const state = { ...fallback, ...shared };

  Object.entries(state).forEach(([branchId, value]) => {
    state[branchId] = normaliseState(value, fallback[branchId]);
  });

  return state;
}

export function setConsentState(nextState, fallback = {}) {
  const state = { ...fallback };

  Object.entries(nextState).forEach(([branchId, value]) => {
    state[branchId] = normaliseState(value, fallback[branchId]);
  });

  if (hasWindow()) window[DEEP_CONSENT_GLOBAL] = { ...state };
  dispatchConsentState(state);
  return state;
}

export function setConsentBranchState(branchId, state, fallback = {}) {
  return setConsentState({
    ...getConsentState(fallback),
    [branchId]: state,
  }, fallback);
}

export function hasConsent(branchId, state = getConsentState()) {
  return state[branchId] === CONSENT_STATES.on;
}

export function requireConsent(branchId, options = {}) {
  const state = options.state ?? getConsentState(options.fallback ?? {});
  const granted = hasConsent(branchId, state);

  if (!granted) {
    options.onDenied?.(branchId, { ...state });
  }

  return granted;
}

export function subscribeConsentState(callback) {
  if (!hasWindow()) return () => {};

  const handleCustomEvent = (event) => {
    callback({ ...(event.detail?.state ?? getConsentState()) });
  };

  window.addEventListener(DEEP_CONSENT_EVENT, handleCustomEvent);

  return () => {
    window.removeEventListener(DEEP_CONSENT_EVENT, handleCustomEvent);
  };
}
