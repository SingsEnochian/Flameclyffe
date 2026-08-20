const PROVIDER = 'huggingface';
const ENDPOINT = `/api/v1/house/providers/${PROVIDER}`;

const style = document.createElement('style');
style.textContent = `
  .provider-vault-launch{position:fixed;right:max(14px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));z-index:9998;border:1px solid rgba(214,179,98,.55);border-radius:999px;background:rgba(9,15,14,.94);color:#f3ddaa;padding:.72rem 1rem;font:700 .82rem/1 system-ui,-apple-system,sans-serif;box-shadow:0 12px 32px rgba(0,0,0,.38);backdrop-filter:blur(12px)}
  .provider-vault-launch:focus-visible,.provider-vault-launch:hover{outline:none;border-color:#f3ddaa;background:#151f1c}
  .provider-vault-shell[hidden]{display:none}.provider-vault-shell{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:max(14px,env(safe-area-inset-top)) max(14px,env(safe-area-inset-right)) max(14px,env(safe-area-inset-bottom)) max(14px,env(safe-area-inset-left));background:rgba(0,0,0,.66);backdrop-filter:blur(9px)}
  .provider-vault-card{width:min(560px,100%);max-height:min(760px,92vh);overflow:auto;border:1px solid rgba(214,179,98,.42);border-radius:24px;background:#0d1513;color:#edf4ef;padding:1.15rem;box-shadow:0 28px 90px rgba(0,0,0,.55);font-family:system-ui,-apple-system,sans-serif}
  .provider-vault-head{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}.provider-vault-head h2{margin:.15rem 0;font:700 1.45rem Georgia,serif;color:#f3ddaa}.provider-vault-head p{margin:.35rem 0 0;color:rgba(237,244,239,.7);line-height:1.45;font-size:.88rem}.provider-vault-close{border:0;background:transparent;color:#edf4ef;font-size:1.3rem;padding:.25rem .4rem}
  .provider-vault-status{margin:1rem 0;padding:.75rem .85rem;border:1px solid rgba(109,224,179,.24);border-radius:14px;background:rgba(109,224,179,.05);line-height:1.4;font-size:.86rem}.provider-vault-status[data-state="ready"]{border-color:rgba(109,224,179,.55)}.provider-vault-status[data-state="error"]{border-color:rgba(255,135,135,.45)}
  .provider-vault-field{display:grid;gap:.4rem;margin-top:.85rem}.provider-vault-field label{color:#f3ddaa;font-size:.74rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.provider-vault-field input{width:100%;border:1px solid rgba(214,179,98,.3);border-radius:12px;background:#070c0b;color:#edf4ef;padding:.78rem .85rem;font:inherit}.provider-vault-field input:focus{outline:2px solid rgba(214,179,98,.55);outline-offset:1px}
  .provider-vault-actions{display:flex;flex-wrap:wrap;gap:.6rem;margin-top:.9rem}.provider-vault-actions button{border:1px solid rgba(214,179,98,.36);border-radius:12px;background:#15201d;color:#edf4ef;padding:.68rem .85rem;font-weight:750}.provider-vault-actions button.primary{background:#ead29a;color:#111816;border-color:#ead29a}.provider-vault-actions button.danger{border-color:rgba(255,135,135,.38);color:#ffc0c0}.provider-vault-actions button:disabled{opacity:.45}
  .provider-vault-lock{margin-top:1rem;padding-top:1rem;border-top:1px solid rgba(214,179,98,.16)}.provider-vault-note{margin:.8rem 0 0;color:rgba(237,244,239,.58);font-size:.78rem;line-height:1.5}.provider-vault-note a{color:#f3ddaa}
  @media(max-width:520px){.provider-vault-launch{font-size:.77rem;padding:.68rem .84rem}.provider-vault-card{border-radius:20px;padding:1rem}.provider-vault-actions{display:grid;grid-template-columns:1fr 1fr}.provider-vault-actions button.primary{grid-column:1/-1}}
`;
document.head.appendChild(style);

const launch = document.createElement('button');
launch.type = 'button';
launch.className = 'provider-vault-launch';
launch.textContent = '🔐 Provider Vault';
launch.setAttribute('aria-haspopup', 'dialog');

document.body.appendChild(launch);

const shell = document.createElement('div');
shell.className = 'provider-vault-shell';
shell.hidden = true;
shell.innerHTML = `
  <section class="provider-vault-card" role="dialog" aria-modal="true" aria-labelledby="provider-vault-title">
    <div class="provider-vault-head">
      <div><h2 id="provider-vault-title">Provider Vault</h2><p>Web-native provider credentials for the current Arcsweep runtime.</p></div>
      <button class="provider-vault-close" type="button" aria-label="Close Provider Vault">✕</button>
    </div>
    <div class="provider-vault-status" id="provider-vault-status" data-state="loading">Checking Hugging Face…</div>
    <div class="provider-vault-field">
      <label for="provider-vault-hf">Hugging Face inference token</label>
      <input id="provider-vault-hf" type="password" inputmode="text" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="hf_…" />
    </div>
    <div class="provider-vault-actions">
      <button class="primary" id="provider-vault-save" type="button">Save Hugging Face token</button>
      <button id="provider-vault-refresh" type="button">Refresh status</button>
      <button class="danger" id="provider-vault-remove" type="button">Remove token</button>
    </div>
    <div class="provider-vault-lock" id="provider-vault-lock" hidden>
      <div class="provider-vault-field">
        <label for="provider-vault-steward">Steward credential</label>
        <input id="provider-vault-steward" type="password" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Unlock the House Runtime" />
      </div>
      <div class="provider-vault-actions"><button class="primary" id="provider-vault-unlock" type="button">Unlock Provider Vault</button></div>
    </div>
    <p class="provider-vault-note">After save, the token is cleared from this page and is never returned to browser JavaScript. Inkling-Small reads it server-side from Supabase Vault. Qwythos remains a local Hearthgate route. <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer">Hugging Face token settings ↗</a></p>
  </section>`;
document.body.appendChild(shell);

const $ = (selector) => shell.querySelector(selector);
const statusEl = $('#provider-vault-status');
const tokenInput = $('#provider-vault-hf');
const saveButton = $('#provider-vault-save');
const removeButton = $('#provider-vault-remove');
const refreshButton = $('#provider-vault-refresh');
const lock = $('#provider-vault-lock');
const stewardInput = $('#provider-vault-steward');
const unlockButton = $('#provider-vault-unlock');
const closeButton = $('.provider-vault-close');

let configured = false;

function setStatus(message, state = 'loading') {
  statusEl.textContent = message;
  statusEl.dataset.state = state;
}

function setBusy(busy) {
  saveButton.disabled = busy;
  removeButton.disabled = busy || !configured;
  refreshButton.disabled = busy;
  unlockButton.disabled = busy;
}

async function decode(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Provider Vault ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function readStatus() {
  setBusy(true);
  setStatus('Checking Hugging Face…');
  try {
    const data = await decode(await fetch(ENDPOINT, { credentials: 'same-origin', cache: 'no-store' }));
    configured = Boolean(data.configured);
    lock.hidden = true;
    removeButton.disabled = !configured;
    const when = data.updated_at ? ` · updated ${new Date(data.updated_at).toLocaleString()}` : '';
    setStatus(configured ? `Hugging Face · configured${when}` : 'Hugging Face · not configured', configured ? 'ready' : 'idle');
  } catch (error) {
    configured = false;
    if (error.status === 401) {
      lock.hidden = false;
      setStatus('Provider Vault is locked. Enter the Steward credential to open a House session.', 'idle');
    } else {
      setStatus(error.message, 'error');
    }
  } finally {
    setBusy(false);
  }
}

async function unlock() {
  const credential = stewardInput.value.trim();
  if (!credential) return setStatus('Enter the Steward credential.', 'error');
  setBusy(true);
  setStatus('Opening House session…');
  try {
    await decode(await fetch('/api/v1/house/session', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ credential }),
    }));
    stewardInput.value = '';
    lock.hidden = true;
    await readStatus();
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    setBusy(false);
  }
}

async function save() {
  const secret = tokenInput.value.trim();
  if (!secret) return setStatus('Paste the Hugging Face token first.', 'error');
  if (!/^hf_[A-Za-z0-9_-]{9,}$/.test(secret)) return setStatus('That does not look like an hf_ Hugging Face token.', 'error');
  setBusy(true);
  setStatus('Sealing Hugging Face token into Provider Vault…');
  try {
    const data = await decode(await fetch(ENDPOINT, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret }),
    }));
    tokenInput.value = '';
    configured = Boolean(data.configured);
    lock.hidden = true;
    removeButton.disabled = !configured;
    setStatus('Hugging Face · configured. Inkling web-direct route is armed.', 'ready');
  } catch (error) {
    if (error.status === 401) lock.hidden = false;
    setStatus(error.message, 'error');
  } finally {
    setBusy(false);
  }
}

async function remove() {
  if (!configured || !confirm('Remove the Hugging Face token from Provider Vault?')) return;
  setBusy(true);
  setStatus('Removing Hugging Face token…');
  try {
    await decode(await fetch(ENDPOINT, { method: 'DELETE', credentials: 'same-origin' }));
    configured = false;
    tokenInput.value = '';
    setStatus('Hugging Face · not configured', 'idle');
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    setBusy(false);
  }
}

function open() {
  shell.hidden = false;
  document.body.style.overflow = 'hidden';
  readStatus();
  setTimeout(() => tokenInput.focus(), 0);
}

function close() {
  tokenInput.value = '';
  stewardInput.value = '';
  shell.hidden = true;
  document.body.style.overflow = '';
  launch.focus();
}

launch.addEventListener('click', open);
closeButton.addEventListener('click', close);
shell.addEventListener('click', (event) => { if (event.target === shell) close(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !shell.hidden) close(); });
saveButton.addEventListener('click', save);
removeButton.addEventListener('click', remove);
refreshButton.addEventListener('click', readStatus);
unlockButton.addEventListener('click', unlock);
tokenInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') save(); });
stewardInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') unlock(); });
