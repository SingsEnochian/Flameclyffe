export const COMMONS_ACTIVE_THREAD_KEY = 'arcsweep.house-commons-active-thread/v1';

export function readActiveCommonsThread(storage = globalThis.localStorage) { try { return storage?.getItem(COMMONS_ACTIVE_THREAD_KEY) || ''; } catch { return ''; } }
export function writeActiveCommonsThread(threadId, storage = globalThis.localStorage) { const value = String(threadId || '').trim(); try { value ? storage?.setItem(COMMONS_ACTIVE_THREAD_KEY, value) : storage?.removeItem(COMMONS_ACTIVE_THREAD_KEY); } catch {} return value; }

function restore() {
  const threadId = readActiveCommonsThread();
  if (!threadId) return false;
  const select = document.querySelector('[data-commons-thread]');
  if (!select || ![...select.options].some((option) => option.value === threadId)) return false;
  if (select.value !== threadId) { select.value = threadId; select.dispatchEvent(new Event('change', { bubbles: true })); }
  return true;
}
export function installCommonsThreadRestoration() {
  if (typeof document === 'undefined') return;
  document.addEventListener('change', (event) => { const select = event.target.closest?.('[data-commons-thread]'); if (select) writeActiveCommonsThread(select.value); }, true);
  document.addEventListener('click', (event) => { if (event.target.closest?.('[data-new-thread]')) writeActiveCommonsThread(''); });
  const observer = new MutationObserver(() => { if (document.querySelector('#commons-form')) restore(); });
  observer.observe(document.body, { childList: true, subtree: true });
  restore();
}
if (typeof document !== 'undefined') installCommonsThreadRestoration();
