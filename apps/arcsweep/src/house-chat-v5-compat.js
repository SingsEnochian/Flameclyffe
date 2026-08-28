let installed = false;
let observer = null;

function v5Active() {
  return document.querySelector('#commons-form')?.dataset.commonsEnhanced === 'v5';
}

function govern() {
  if (!v5Active()) return;
  document.querySelectorAll('.commons-chat-entry[data-kind="voice"]').forEach((article) => {
    article.dataset.houseRoomRevealed = 'true';
  });
  document.querySelectorAll('.commons-chat-entry [data-attach-to-entry]').forEach((button) => button.remove());
}

function captureLegacyNewThread(event) {
  if (!v5Active()) return;
  const button = event.target.closest?.('[data-commons-command-room] [data-new-thread]');
  if (!button) return;
  event.preventDefault(); event.stopImmediatePropagation();
  document.querySelector('[data-new-room]')?.click();
}

export function installHouseChatV5Compat() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener('click', captureLegacyNewThread, true);
  observer = new MutationObserver(govern);
  observer.observe(document.body, { childList: true, subtree: true });
  govern();
  globalThis.addEventListener?.('beforeunload', () => observer?.disconnect(), { once: true });
}

if (typeof document !== 'undefined') installHouseChatV5Compat();
