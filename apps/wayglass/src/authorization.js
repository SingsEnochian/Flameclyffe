import { authorizationSession } from './authorization-session.js';

export function openWayglassAuthorization({ document = globalThis.document, session = authorizationSession } = {}) {
  const dialog = document.createElement('dialog');
  dialog.className = 'wayglass-authorization';
  dialog.setAttribute('aria-labelledby', 'wayglass-authorization-title');
  dialog.innerHTML = `<form class="wayglass-authorization__form">
    <p class="wayglass-authorization__eyebrow">WAYGLASS</p>
    <h1 id="wayglass-authorization-title">Wayglass Authorization</h1>
    <p>Enter Bluebird’s provider token code to connect for this session.</p>
    <label for="wayglass-authorization-code">Bluebird’s token code</label>
    <input id="wayglass-authorization-code" name="code" type="password" required maxlength="4096" autocomplete="off" autocapitalize="none" spellcheck="false" autofocus>
    <p class="wayglass-authorization__privacy">Enter it each time you open Wayglass. Wayglass does not save this token.</p>
    <p class="wayglass-authorization__error" role="alert" aria-live="polite"></p>
    <div class="wayglass-authorization__actions"><button type="button" data-wayglass-auth-skip>Not now · enter ship</button><button type="submit">Connect Bluebird</button></div>
  </form>`;
  const form = dialog.querySelector('form');
  const input = dialog.querySelector('input');
  const button = dialog.querySelector('button[type="submit"]');
  const skip = dialog.querySelector('[data-wayglass-auth-skip]');
  const error = dialog.querySelector('[role="alert"]');
  document.body.append(dialog);
  dialog.showModal();
  return new Promise(resolve => {
    let finished = false;
    const finish = result => {
      if (finished) return;
      finished = true;
      if (dialog.open) dialog.close();
      dialog.remove();
      resolve(result);
    };
    skip.addEventListener('click', () => { session.clear(); finish({ skipped: true }); });
    dialog.addEventListener('cancel', event => { event.preventDefault(); session.clear(); finish({ skipped: true }); });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (button.disabled) return;
      button.disabled = true;
      button.textContent = 'Authorizing…';
      error.textContent = '';
      try {
        await session.authorize(input.value);
        input.value = '';
        finish({ authorized: true });
      } catch (failure) {
        if (finished) return;
        input.value = '';
        error.textContent = failure.message || 'Authorization failed. Try again.';
        input.focus();
      } finally {
        button.disabled = false;
        button.textContent = 'Authorize Wayglass';
      }
    });
  });
}

globalThis.addEventListener?.('pagehide', () => {
  const headers = authorizationSession.headers();
  authorizationSession.clear();
  if (headers['X-Wayglass-Bluebird-Session']) {
    void fetch('/api/v1/wayglass/bluebird/revoke', { method: 'POST', headers, keepalive: true }).catch(() => {});
  }
});
