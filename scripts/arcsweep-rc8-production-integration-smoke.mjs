import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE_URL = String(process.env.BASE_URL || 'https://flameclyffe.vercel.app').replace(/\/$/, '');
const OIDC_AUDIENCE = process.env.OIDC_AUDIENCE || 'flameclyffe-house-smoke/v1';
const EXPECTED_SHA = process.env.GITHUB_SHA || '';

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  invariant(split > 0, 'Trusted production smoke did not return a usable House session cookie.');
  return { name: pair.slice(0, split).trim(), value: pair.slice(split + 1).trim() };
}

async function waitForProduction(oidc) {
  let last = null;
  for (let attempt = 1; attempt <= 36; attempt += 1) {
    const response = await fetch(`${BASE_URL}/api/v1/house/smoke?target=caretaker`, {
      method: 'POST',
      headers: { authorization: `Bearer ${oidc}` },
      redirect: 'manual',
    });
    const body = await response.json().catch(() => ({}));
    last = { status: response.status, body, setCookie: firstSetCookie(response.headers) };
    console.error(JSON.stringify({
      attempt,
      expected_sha: EXPECTED_SHA || null,
      production_sha: body.production_sha || null,
      http_status: response.status,
    }));
    if (response.ok && (!EXPECTED_SHA || body.production_sha === EXPECTED_SHA)) return last;
    await sleep(10_000);
  }
  throw new Error(`Exact production SHA was not observed. Expected ${EXPECTED_SHA || 'current workflow SHA'}, last ${last?.body?.production_sha || 'unknown'}.`);
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
    await sleep(150);
  }
  throw new Error(`Chrome DevTools did not become ready: ${lastError?.message || 'timeout'}`);
}

function cdpClient(socketUrl) {
  const socket = new WebSocket(socketUrl);
  let nextId = 1;
  const pending = new Map();
  const opened = new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', () => reject(new Error('Chrome DevTools WebSocket failed.')), { once: true });
  });
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(`CDP ${message.error.message}`));
    else resolve(message.result || {});
  });
  return {
    async ready() { await opened; },
    async send(method, params = {}) {
      await opened;
      const id = nextId++;
      const result = new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
      socket.send(JSON.stringify({ id, method, params }));
      return result;
    },
    close() { socket.close(); },
  };
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
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
    await sleep(350);
  }
  throw new Error(`${label} was not observed within ${timeoutMs}ms. Last value: ${JSON.stringify(last)}`);
}

async function runBrowser(cookie) {
  const chrome = chromeExecutable();
  invariant(chrome, 'No Chrome/Chromium executable is available on this runner.');
  const port = 9300 + Math.floor(Math.random() * 500);
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arcsweep-rc8-smoke-'));
  const child = spawn(chrome, [
    '--headless=new', '--disable-gpu', '--disable-dev-shm-usage', '--no-sandbox',
    `--remote-debugging-port=${port}`, `--user-data-dir=${userDataDir}`, 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let chromeError = '';
  child.stderr.on('data', (chunk) => { chromeError += chunk.toString(); });

  let cdp;
  try {
    await waitForJson(`http://127.0.0.1:${port}/json/version`);
    const target = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(`${BASE_URL}/arcsweep/`)}`, { method: 'PUT' }).then((r) => r.json());
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
    await waitForBrowser(cdp, `Boolean(globalThis.__arcsweepOS && document.querySelector('[data-magic-book-launch]'))`, 60000, 'ArcSweep OS + Magic Book');

    const initial = await evaluate(cdp, `(async()=>{
      await globalThis.__arcsweepOS.ready;
      const manifest=globalThis.__arcsweepOS.manifest;
      const deep=await fetch('/data/deep-current.json',{cache:'no-store'}).then(async r=>({status:r.status,body:await r.json().catch(()=>({}))}));
      return {
        version:manifest?.version||null,
        magic_book:Boolean(manifest?.runtime?.magicBook),
        settings_button:Boolean(document.querySelector('[data-room="settings"]')),
        deep_status:deep.status,
        deep_schema:deep.body?.schema||null,
        deep_generated_at:deep.body?.generated_at||null,
      };
    })()`);
    invariant(initial.version === '0.1.0-rc.8', `Expected ArcSweep rc.8, received ${initial.version || 'missing'}.`);
    invariant(initial.magic_book === true, 'ArcSweep rc.8 manifest does not advertise Magic Book.');
    invariant(initial.settings_button === true, 'Settings route button is missing from production DOM.');
    invariant(initial.deep_status === 200 && initial.deep_schema === 'hearthgate.deep-current/v1', `DEEP cache route is unhealthy: ${JSON.stringify(initial)}`);

    await evaluate(cdp, `document.querySelector('[data-magic-book-launch]').click()`);
    await waitForBrowser(cdp, `(()=>{const root=document.getElementById('arcsweep-magic-book');return Boolean(root && !root.hidden && root.querySelector('[data-magic-book-page="threshold"]'));})()`, 15000, 'Magic Book threshold');

    const bookOpen = await evaluate(cdp, `(()=>({
      renderer:document.getElementById('arcsweep-magic-book')?.dataset?.renderer||null,
      threshold:Boolean(document.querySelector('[data-magic-book-page="threshold"][aria-current="page"]')),
      glyph:Boolean(document.querySelector('[data-magic-book-page="glyph-forge"]')),
      receipts:Boolean(document.querySelector('[data-magic-book-page="receipts"]')),
      settings_door:Boolean(document.querySelector('[data-book-room="settings"]')),
      deep_door:Boolean(document.querySelector('[data-book-room="deep-observer"]')),
    }))()`);
    invariant(bookOpen.threshold && bookOpen.glyph && bookOpen.receipts, `Magic Book page set is incomplete: ${JSON.stringify(bookOpen)}`);
    invariant(bookOpen.settings_door && bookOpen.deep_door, `Magic Book room registry is missing Settings or DEEP Observer: ${JSON.stringify(bookOpen)}`);

    await evaluate(cdp, `document.querySelector('[data-book-room="settings"]').click()`);
    await waitForBrowser(cdp, `globalThis.__arcsweepOS?.session?.()?.active_room === 'settings'`, 15000, 'Settings navigation through Magic Book');
    const settings = await evaluate(cdp, `(()=>({
      os_room:globalThis.__arcsweepOS?.session?.()?.active_room||null,
      dom_active:Boolean(document.querySelector('[data-room="settings"].active')),
    }))()`);
    invariant(settings.os_room === 'settings', `Settings route did not become the OS room: ${JSON.stringify(settings)}`);

    await evaluate(cdp, `document.querySelector('[data-magic-book-page="glyph-forge"]').click()`);
    await waitForBrowser(cdp, `Boolean(document.querySelector('[data-magic-glyph-canvas]') && globalThis.__starwellGlyphStudioBridge)`, 15000, 'Magic Book Glyph Forge bridge');
    const glyphBefore = await evaluate(cdp, `(()=>{const s=globalThis.__starwellGlyphStudioBridge.snapshot();return {schema:s.schema,strokes:s.active_glyph?.stroke_count||0,brush:s.active_brush?.id||null,size:s.brush_runtime?.size||null};})()`);
    invariant(glyphBefore.schema === 'starwell.glyph-studio-snapshot/v1', `Glyph Studio bridge schema mismatch: ${glyphBefore.schema}`);

    const draw = await evaluate(cdp, `(()=>{
      const canvas=document.querySelector('[data-magic-glyph-canvas]');
      const rect=canvas.getBoundingClientRect();
      const x1=rect.left+Math.max(20,rect.width*.30), y1=rect.top+Math.max(20,rect.height*.30);
      const x2=rect.left+Math.max(35,rect.width*.55), y2=rect.top+Math.max(35,rect.height*.55);
      const init={bubbles:true,cancelable:true,pointerId:41,pointerType:'pen',isPrimary:true,button:0,buttons:1,pressure:.72};
      canvas.dispatchEvent(new PointerEvent('pointerdown',{...init,clientX:x1,clientY:y1}));
      canvas.dispatchEvent(new PointerEvent('pointermove',{...init,clientX:x2,clientY:y2}));
      canvas.dispatchEvent(new PointerEvent('pointerup',{...init,buttons:0,pressure:0,clientX:x2,clientY:y2}));
      const s=globalThis.__starwellGlyphStudioBridge.snapshot();
      return {strokes:s.active_glyph?.stroke_count||0};
    })()`);
    invariant(draw.strokes > glyphBefore.strokes, `Pen-like pointer input did not persist a glyph stroke (${glyphBefore.strokes} -> ${draw.strokes}).`);

    await evaluate(cdp, `document.querySelector('[data-magic-book-page="receipts"]').click()`);
    await waitForBrowser(cdp, `Boolean(document.querySelector('[data-magic-book-page="receipts"][aria-current="page"]'))`, 10000, 'Magic Book receipts page');
    await evaluate(cdp, `document.querySelector('[data-magic-book-page="glyph-forge"]').click()`);
    await waitForBrowser(cdp, `Boolean(document.querySelector('[data-magic-glyph-canvas]'))`, 10000, 'Glyph Forge return');
    const glyphAfter = await evaluate(cdp, `globalThis.__starwellGlyphStudioBridge.snapshot().active_glyph?.stroke_count||0`);
    invariant(glyphAfter >= draw.strokes, `Glyph stroke did not survive page leave/return (${draw.strokes} -> ${glyphAfter}).`);

    await evaluate(cdp, `document.querySelector('[data-magic-book-page="threshold"]').click()`);
    await waitForBrowser(cdp, `Boolean(document.querySelector('[data-book-room="deep-observer"]'))`, 10000, 'Threshold room registry return');
    await evaluate(cdp, `document.querySelector('[data-book-room="deep-observer"]').click()`);
    await waitForBrowser(cdp, `globalThis.__arcsweepOS?.session?.()?.active_room === 'deep-observer'`, 15000, 'DEEP Observer navigation through Magic Book');

    const observer = await evaluate(cdp, `(async()=>{
      const registry=globalThis.__arcsweepOS.capabilities;
      const status=await registry.invoke('observer.status',{}, {authority:'read',source:'rc8-production-smoke'});
      const deep=await registry.invoke('observer.deep-current',{}, {authority:'read',source:'rc8-production-smoke'});
      return {
        room:globalThis.__arcsweepOS.session().active_room,
        status_receipt:status.status,
        available:status.output?.available===true,
        connected:status.output?.connected===true,
        bridge_schema:status.output?.schema||null,
        deep_receipt:deep.status,
        deep_schema:deep.output?.schema||null,
        generated_at:deep.output?.generated_at||null,
        field:deep.output?.field||null,
        transformations:Array.isArray(deep.output?.transformation_receipts)?deep.output.transformation_receipts.length:null,
      };
    })()`);
    invariant(observer.room === 'deep-observer', `DEEP Observer room is not active: ${JSON.stringify(observer)}`);
    invariant(observer.status_receipt === 'applied' && observer.available, `Observer status capability failed: ${JSON.stringify(observer)}`);
    invariant(observer.deep_receipt === 'applied' && observer.deep_schema === 'hearthgate.deep-current/v1', `Observer → DEEP capability crossing failed: ${JSON.stringify(observer)}`);
    invariant(observer.field && Number.isFinite(Number(observer.field.P)) && Number.isFinite(Number(observer.field.A)), `DEEP field is missing PREMAQC axes: ${JSON.stringify(observer.field)}`);

    const binding = await evaluate(cdp, `(()=>{try{return JSON.parse(localStorage.getItem('hearthgate.arcsweep.magic-book.binding.v0.1')||'null')}catch{return null}})()`);
    const receipts = await evaluate(cdp, `(()=>{try{return JSON.parse(localStorage.getItem('hearthgate.arcsweep.magic-book.receipts.v0.1')||'[]')}catch{return []}})()`);
    invariant(binding?.schema === 'arcsweep.magic-book-binding/v0.1', `Magic Book binding did not persist: ${JSON.stringify(binding)}`);
    invariant(Array.isArray(receipts) && receipts.length > 0, 'Magic Book did not persist any receipts.');

    return {
      schema: 'arcsweep.rc8-production-integration-smoke/v1',
      production_sha: EXPECTED_SHA || null,
      arcsweep: initial,
      magic_book: {
        renderer: bookOpen.renderer,
        page_set: ['threshold', 'glyph-forge', 'receipts'],
        settings_route: settings,
        glyph_strokes_before: glyphBefore.strokes,
        glyph_strokes_after_draw: draw.strokes,
        glyph_strokes_after_page_return: glyphAfter,
        receipt_count: receipts.length,
        binding_page: binding.active_page_id || null,
      },
      observer,
      authority: {
        real_production_dom: true,
        simulated_pointer_type: 'pen',
        capability_authority: 'read',
        house_session_cookie_exposed: false,
      },
    };
  } catch (error) {
    if (chromeError) process.stderr.write(chromeError.slice(-2500));
    throw error;
  } finally {
    try { cdp?.close(); } catch {}
    child.kill('SIGKILL');
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

async function main() {
  const oidc = await githubOidcToken();
  const production = await waitForProduction(oidc);
  const cookie = parseCookie(production.setCookie);
  const browser = await runBrowser(cookie);
  console.log(JSON.stringify({ ok: true, ...browser }, null, 2));
}

main().catch((error) => {
  console.log(JSON.stringify({
    ok: false,
    schema: 'arcsweep.rc8-production-integration-smoke/v1',
    production_sha: EXPECTED_SHA || null,
    error: error?.message || String(error),
  }, null, 2));
  process.exitCode = 1;
});
