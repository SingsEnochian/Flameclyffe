import { HOUSE_COOKIE_SESSION, restoreHouseRuntimeSession } from './house-runtime.js';
import { isHostedBrowser } from './field-instrument.js';

const hosted = () => Boolean(globalThis.window?.__hearthgateHost) || isHostedBrowser(globalThis.location);

function openKelyranSchool() {
  document.querySelector('[data-room="kelyran-school"]')?.click();
}

async function sealHouse(button, status) {
  button.disabled = true;
  button.textContent = 'Sealing House…';
  status.textContent = 'Checking the signed-in Steward identity…';
  const restored = await restoreHouseRuntimeSession();
  if (restored === HOUSE_COOKIE_SESSION) {
    status.textContent = 'Steward signed in · House sealed. Reloading the control surface…';
    globalThis.location?.reload?.();
    return;
  }
  status.textContent = 'No signed-in Steward identity is available yet. Sign in through Kelyran School, then seal the House session.';
  button.disabled = false;
  button.textContent = 'Seal House session';
}

export function enhanceHostedHouseSessionUi(root = document) {
  if (!hosted()) return false;
  const panel = root.querySelector?.('.house-runtime') || document.querySelector('.house-runtime');
  const form = panel?.querySelector('#house-runtime-form');
  if (!panel || !form || form.dataset.hostedHouseUi === 'v1') return false;

  form.dataset.hostedHouseUi = 'v1';
  const routeButton = form.querySelector('[data-action="runtime-refresh"]');
  const connected = Boolean(routeButton && !routeButton.disabled);
  const headingStatus = panel.querySelector('.section-heading strong');
  if (headingStatus) headingStatus.textContent = connected ? 'Steward signed in · House sealed' : 'Hosted Steward not sealed';

  if (connected) {
    form.innerHTML = `<p class="callout" data-hosted-house-status>Hosted identity is sealed into an HttpOnly House session. No House master credential is stored or entered in this browser.</p><div class="button-row"><button type="button" class="quiet" data-action="runtime-refresh">Check every Flame</button><button type="button" class="quiet danger" data-action="runtime-disconnect">Close session</button></div>`;
    return true;
  }

  form.innerHTML = `<p class="callout" data-hosted-house-status>Hosted Arcsweep uses the existing Supabase magic-link Steward identity. Sign in through Kelyran School once, then seal the House session here. No House master credential is entered in the hosted browser.</p><div class="button-row"><button type="button" data-hosted-house-seal>Seal House session</button><button type="button" class="quiet" data-hosted-kelyran>Open Kelyran School</button></div>`;
  const status = form.querySelector('[data-hosted-house-status]');
  form.querySelector('[data-hosted-house-seal]')?.addEventListener('click', (event) => void sealHouse(event.currentTarget, status));
  form.querySelector('[data-hosted-kelyran]')?.addEventListener('click', openKelyranSchool);
  return true;
}

function mutationIntroducedSettings(mutations) {
  return mutations.some((mutation) => [...mutation.addedNodes].some((node) => node?.nodeType === 1 && (node.matches?.('.house-runtime') || node.querySelector?.('.house-runtime'))));
}

export function installHostedHouseSessionUi() {
  if (typeof document === 'undefined' || !hosted()) return;
  enhanceHostedHouseSessionUi();
  const observer = new MutationObserver((mutations) => {
    if (mutationIntroducedSettings(mutations)) enhanceHostedHouseSessionUi();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  globalThis.addEventListener?.('beforeunload', () => observer.disconnect(), { once: true });
}

if (typeof document !== 'undefined') installHostedHouseSessionUi();
