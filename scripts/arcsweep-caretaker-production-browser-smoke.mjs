import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE_URL = String(process.env.BASE_URL || 'https://flameclyffe.vercel.app').replace(/\/$/, '');
const OIDC_AUDIENCE = process.env.OIDC_AUDIENCE || 'flameclyffe-house-smoke/v1';
const REQUEST_TEXT = 'Take me to Glyph Forge.';
const RECEIPT_KEY = 'arcsweep.caretaker.receipts.v0.1';
const EXPECTED_MODEL = 'hf.co/DavidAU/Gemma-The-Writer-Mighty-Sword-9B-GGUF:Q4_K_M';

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

async function githubOidcToken() {
  invariant(process.env.ACTIONS_ID_TOKEN_REQUEST_URL, 'GitHub OIDC request URL is unavailable.');
  invariant(process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN, 'GitHub OIDC request token is unavailable.');
  const url = new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);
  url.searchParams.set('audience', OIDC_AUDIENCE);
  const response = await fetch(url, {
    headers: { authorization: `bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}` },
  });
  invariant(response.ok, `GitHub OIDC token request failed: ${response.status}`);
  const body = await response.json();
  invariant(body.value, 'GitHub OIDC token response was empty.');
  return body.value;
}

function firstSetCookie(headers) {
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie()[0] || '';
  return headers.get('set-cookie') || '';
}

function parseCookie(setCookie) {
  const pair = String(setCookie || '').split(';', 1)[0];
  const split = pair.indexOf('=');
  invariant(split > 0, 'Trusted Caretaker smoke did not return a usable House session cookie.');
  return { name: pair.slice(0, split).trim(), value: pair.slice(split + 1).trim() };
}

async function caretakerStatusProbe(oidc) {
  const response = await fetch(`${BASE_URL}/api/v1/house/smoke?target=caretaker`, {
    method: 'POST',
    headers: { authorization: `Bearer ${oidc}` },
    redirect: 'manual',
  });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { error: text.slice(0, 500) || 'non-json response' }; }
  invariant(response.ok, `Caretaker status smoke failed: ${response.status} ${body.stage_error || body.error || ''}`.trim());
  invariant(body.schema === 'hearthgate.caretaker-production-status/v1', `Unexpected Caretaker smoke schema: ${body.schema || 'missing'}`);
  return { body, cookie: parseCookie(firstSetCookie(response.headers)) };
}

function chromeExecutable() {
  const candidates = [
    process.env.CHROME_BIN,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

async function waitForJson(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch (error) { lastError = error; }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Chrome DevTools did not become ready: ${lastError?.message || 'timeout'}`);
}

function cdpClient(socketUrl) {
  const socket = new WebSocket(socketUrl);
  let nextId = 1;
  const pending = new Map();
  const listeners = new Map();

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(`CDP ${message.error.message}`));
      else resolve(message.result || {});
      return;
    }
    const callbacks = listeners.get(message.method) || [];
    for (const callback of callbacks) callback(message.params || {});
  });

  const opened = new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', () => reject(new Error('Chrome DevTools WebSocket failed.')), { once: true });
  });

  return {
    async ready() { await opened; },
    async send(method, params = {}) {
      await opened;
      const id = nextId++;
      const promise = new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
      socket.send(JSON.stringify({ id, method, params }));
      return promise;
    },
    on(method, callback) {
      const list = listeners.get(method) || [];
      list.push(callback);
      listeners.set(method, list);
    },
    close() { socket.close(); },
  };
}

async function evaluate(cdp, expression, { awaitPromise = true, returnByValue = true } = {}) {
  const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise, returnByValue });
  if (result.exceptionDetails) {
    const description = result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'browser evaluation failed';
    throw new Error(description);
  }
  return result.result?.value;
}

async function waitForBrowser(cdp, expression, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    try {
      last = await evaluate(cdp, expression);
      if (last) return last;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`${label} was not observed within ${timeoutMs}ms. Last value: ${JSON.stringify(last)}`);
}

async function runBrowser(cookie) {
  const chrome = chromeExecutable();
  invariant(chrome, 'No Chrome/Chromium executable is available on this runner.');
  const port = 9222 + Math.floor(Math.random() * 700);
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arcsweep-caretaker-smoke-'));
  const child = spawn(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--no-sandbox',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let chromeError = '';
  child.stderr.on('data', (chunk) => { chromeError += chunk.toString(); });

  let cdp;
  try {
    await waitForJson(`http://127.0.0.1:${port}/json/version`);
    const target = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(`${BASE_URL}/arcsweep/`)}`, { method: 'PUT' }).then((response) => response.json());
    invariant(target.webSocketDebuggerUrl, 'Chrome did not return a page debugger URL.');
    cdp = cdpClient(target.webSocketDebuggerUrl);
    await cdp.ready();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');

    const cookieSet = await cdp.send('Network.setCookie', {
      name: cookie.name,
      value: cookie.value,
      url: `${BASE_URL}/`,
      secure: true,
      httpOnly: true,
      sameSite: 'Strict',
      path: '/',
    });
    invariant(cookieSet.success !== false, 'Chrome refused the sealed House session cookie.');

    await cdp.send('Page.navigate', { url: `${BASE_URL}/arcsweep/` });
    await waitForBrowser(cdp, `document.readyState === 'complete'`, 30000, 'ArcSweep document load');
    await waitForBrowser(cdp, `Boolean(document.querySelector('[data-caretaker-launch]'))`, 45000, 'Caretaker launcher');

    const session = await evaluate(cdp, `(async()=>{const r=await fetch('/api/v1/house/session',{cache:'no-store'});return {status:r.status,body:await r.json().catch(()=>({}))};})()`);
    invariant(session?.status === 200 && session?.body?.connected === true, `Browser House session did not validate: ${JSON.stringify(session)}`);

    await evaluate(cdp, `(()=>{const launch=document.querySelector('[data-caretaker-launch]');launch.click();const area=document.querySelector('[data-caretaker-form] textarea[name="request"]');const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;set.call(area,${JSON.stringify(REQUEST_TEXT)});area.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('[data-caretaker-form]').requestSubmit();return true;})()`);

    const observed = await waitForBrowser(cdp, `(()=>{try{const list=JSON.parse(localStorage.getItem(${JSON.stringify(RECEIPT_KEY)})||'[]');const receipt=list.find((item)=>item&&item.request===${JSON.stringify(REQUEST_TEXT)})||null;if(!receipt)return null;const active=document.querySelector('.sidebar button[data-room].active')?.dataset.room||document.querySelector('button[data-room].active')?.dataset.room||null;return {active_room:active,forge_active:Boolean(document.querySelector('button[data-room="forge"].active')),proof_text:document.querySelector('[data-caretaker-proof]')?.textContent?.trim()||'',receipt};}catch(error){return {error:String(error)}}})()`, 180000, 'applied Caretaker receipt');

    invariant(!observed.error, observed.error || 'Browser receipt read failed.');
    invariant(observed.active_room === 'forge' && observed.forge_active === true, `Caretaker did not leave the real Forge room active: ${JSON.stringify({ active_room: observed.active_room, forge_active: observed.forge_active })}`);
    invariant(observed.receipt?.status === 'applied', `Caretaker receipt was not applied: ${observed.receipt?.status || 'missing'}`);
    invariant(observed.receipt?.plan?.actions?.some((action) => action.type === 'navigate' && action.target === 'forge'), 'Caretaker plan did not contain navigate → forge.');
    invariant(observed.receipt?.action_results?.some((item) => item.status === 'applied' && item.action?.target === 'forge'), 'Caretaker execution receipt did not prove applied navigation to forge.');

    return {
      browser: 'headless-chrome-production',
      active_room: observed.active_room,
      forge_active: observed.forge_active,
      proof_text: observed.proof_text,
      receipt: {
        schema: observed.receipt.schema,
        receipt_id: observed.receipt.receipt_id ?? null,
        status: observed.receipt.status,
        request: observed.receipt.request,
        room_before: observed.receipt.room_before,
        world: observed.receipt.world ?? null,
        provider: observed.receipt.provider,
        model: observed.receipt.model,
        persistence: observed.receipt.persistence,
        plan: observed.receipt.plan,
        action_results: observed.receipt.action_results,
        runtime_braid: observed.receipt.runtime_braid ?? null,
        storage_error: observed.receipt.storage_error ?? null,
      },
    };
  } catch (error) {
    if (chromeError) process.stderr.write(chromeError.slice(-3000));
    throw error;
  } finally {
    try { cdp?.close(); } catch {}
    child.kill('SIGKILL');
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

async function main() {
  const oidc = await githubOidcToken();
  const { body: status, cookie } = await caretakerStatusProbe(oidc);
  const caretaker = status.caretaker || {};
  invariant(caretaker.runtime_reachable === true, `Caretaker Hearthgate runtime is not reachable: ${caretaker.runtime_error || caretaker.missing?.join(', ') || 'unknown'}`);
  invariant(caretaker.model_available === true, `Mighty Sword is not reported installed in Ollama: ${caretaker.missing?.join(', ') || caretaker.model || 'unknown model'}`);
  invariant(caretaker.model === EXPECTED_MODEL, `Caretaker model mismatch: expected ${EXPECTED_MODEL}, received ${caretaker.model || 'missing'}`);

  const browser = await runBrowser(cookie);
  console.log(JSON.stringify({
    ok: true,
    schema: 'hearthgate.caretaker-production-browser-smoke/v1',
    production_sha: status.production_sha || null,
    caretaker_status: {
      role: caretaker.role,
      provider: caretaker.provider,
      model: caretaker.model,
      source_model: caretaker.source_model,
      configured: caretaker.configured,
      gateway_configured: caretaker.gateway_configured,
      runtime_reachable: caretaker.runtime_reachable,
      model_available: caretaker.model_available,
      installed_count: caretaker.installed_count,
      missing: caretaker.missing,
      runtime_error: caretaker.runtime_error,
    },
    browser,
    authority: {
      oidc_audience: OIDC_AUDIENCE,
      house_session_cookie_exposed: false,
      real_production_dom: true,
      simulated_navigation: false,
    },
  }, null, 2));
}

main().catch((error) => {
  console.log(JSON.stringify({
    ok: false,
    schema: 'hearthgate.caretaker-production-browser-smoke/v1',
    error: error?.message || String(error),
    authority: { house_session_cookie_exposed: false },
  }, null, 2));
  process.exitCode = 1;
});
