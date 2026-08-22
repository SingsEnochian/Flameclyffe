import {
  ELARA_BASE_YEAR,
  writeSelectedElaraYear,
  writeSelectedWorld,
} from './world-premaq-registry.js';

export const TERRA_AETERNA_DIAL_SCHEMA = 'hearthgate.terra-aeterna-dial/v0.1';
export const TERRA_AETERNA_DIAL_KEY = 'hearthgate:terra-aeterna-dial:v0.1';
export const TERRA_AETERNA_TARGET = 'terra-aeterna';

function readDialRequest() {
  if (typeof location === 'undefined') return null;
  const params = new URLSearchParams(location.search);
  const target = params.get('target');
  const dial = params.get('dial');
  if (target !== TERRA_AETERNA_TARGET && dial !== 'earth-prime-terra-aeterna') return null;
  const requestedYear = Number(params.get('year') ?? ELARA_BASE_YEAR);
  const year = Number.isInteger(requestedYear) ? requestedYear : ELARA_BASE_YEAR;
  return Object.freeze({ target: TERRA_AETERNA_TARGET, year });
}

export function activateTerraAeternaDial({ storage = globalThis.localStorage } = {}) {
  const request = readDialRequest();
  if (!request) return null;
  const target = writeSelectedWorld(request.target, storage);
  const year = writeSelectedElaraYear(request.year, storage);
  const receipt = Object.freeze({
    schema: TERRA_AETERNA_DIAL_SCHEMA,
    activated_at: new Date().toISOString(),
    address: 'earth-prime::terra-aeterna',
    origin_shore: 'earth-prime',
    target_shore: target.slug,
    year,
    domain_truth: true,
    law: 'calibrate-both-shores → lock-P-R-E-M-A-Q → C-bridge → solo-sequences → 369 → +3 → +6 → +9 → compression-of-release',
    next_operation: 'capture-live-earth-prime-deep-and-groundwire',
  });
  storage?.setItem(TERRA_AETERNA_DIAL_KEY, JSON.stringify(receipt));
  return receipt;
}

function announce(receipt) {
  if (!receipt || typeof document === 'undefined') return;
  const apply = () => {
    const selector = document.getElementById('two-shore-world');
    if (selector) {
      selector.value = TERRA_AETERNA_TARGET;
      selector.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const status = document.getElementById('two-shore-gate-status');
    if (status) {
      status.textContent = `ADDRESS SET · Earth Prime ⇄ Terra Aeterna · ${receipt.year}. Capture live DEEP + Groundwire, then press LIVE GATE TEST.`;
      status.dataset.kind = 'complete';
    }
    const consoleDetails = document.getElementById('two-shore-live-console');
    if (consoleDetails && !consoleDetails.open) consoleDetails.open = true;
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.setTimeout(apply, 0), { once: true });
  } else {
    window.setTimeout(apply, 0);
  }
}

const receipt = activateTerraAeternaDial();
announce(receipt);
