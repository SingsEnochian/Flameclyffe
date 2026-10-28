import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const PREVIEW_URL = process.env.WAYGLASS_BROWSER_SMOKE_URL || 'http://127.0.0.1:4186/';
const DEBUG_PORT = Number(process.env.WAYGLASS_CHROME_DEBUG_PORT || 9222);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function findChrome() {
  const configured = process.env.CHROME_BIN;
  if (configured) return configured;
  for (const candidate of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    const probe = spawnSync('sh', ['-lc', `command -v ${candidate}`], { encoding: 'utf8' });
    if (probe.status === 0 && probe.stdout.trim()) return probe.stdout.trim();
  }
  throw new Error('No Chrome/Chromium binary found for Wayglass browser smoke.');
}

async function waitFor(predicate, { timeoutMs = 10_000, intervalMs = 100, label = 'condition' } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const value = await predicate();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ''}`);
}

class CdpClient {
  constructor(webSocketUrl) {
    this.ws = new WebSocket(webSocketUrl);
    this.nextId = 1;
    this.pending = new Map();
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`));
      else pending.resolve(message.result);
    });
    return this;
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws.close();
  }
}

async function main() {
  const chromeBin = findChrome();
  const profileDir = await mkdtemp(path.join(os.tmpdir(), 'wayglass-chrome-'));
  const chrome = spawn(chromeBin, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profileDir}`,
    'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  let chromeErr = '';
  chrome.stderr.on('data', (chunk) => { chromeErr += chunk.toString(); });

  try {
    const version = await waitFor(async () => {
      const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      if (!response.ok) return null;
      return response.json();
    }, { timeoutMs: 12_000, label: 'Chrome DevTools endpoint' });

    assert(version.webSocketDebuggerUrl, 'Chrome DevTools endpoint did not expose a browser websocket.');

    const createTarget = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?${encodeURIComponent(PREVIEW_URL)}`, { method: 'PUT' });
    assert(createTarget.ok, `Could not create Chrome target: HTTP ${createTarget.status}`);
    const target = await createTarget.json();
    assert(target.webSocketDebuggerUrl, 'Chrome target did not expose a websocket.');

    const cdp = await new CdpClient(target.webSocketDebuggerUrl).open();
    try {
      await cdp.send('Runtime.enable');
      await cdp.send('Page.enable');

      async function evaluate(expression, { awaitPromise = true } = {}) {
        const result = await cdp.send('Runtime.evaluate', {
          expression,
          awaitPromise,
          returnByValue: true,
          userGesture: true,
        });
        if (result.exceptionDetails) {
          const detail = result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'browser evaluation failed';
          throw new Error(detail);
        }
        return result.result?.value;
      }

      await waitFor(async () => evaluate(`document.readyState === 'complete' && Boolean(globalThis.__wayglassOS)`), {
        timeoutMs: 12_000,
        label: 'Wayglass OS boot',
      });

      const evidence = await evaluate(`(async () => {
        const smoke = globalThis.__wayglassBrowserSmoke = {
          created: [],
          revoked: [],
          requests: [],
          downloads: [],
          abortObserved: false,
          renderDelayMs: 20,
          leaveBody: null,
          enterBody: null,
        };

        const nativeCreateObjectURL = URL.createObjectURL.bind(URL);
        const nativeRevokeObjectURL = URL.revokeObjectURL.bind(URL);
        URL.createObjectURL = (blob) => {
          const url = nativeCreateObjectURL(blob);
          smoke.created.push(url);
          return url;
        };
        URL.revokeObjectURL = (url) => {
          smoke.revoked.push(url);
          return nativeRevokeObjectURL(url);
        };

        const nativeAnchorClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function smokeDownloadClick() {
          if (this.id === 'tv-download' || this.id === 'tv-save-receipt') {
            smoke.downloads.push({ id: this.id, href: this.getAttribute('href'), download: this.download });
            return;
          }
          return nativeAnchorClick.call(this);
        };

        function json(data, status = 200) {
          return new Response(JSON.stringify(data), {
            status,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        globalThis.fetch = async (input, options = {}) => {
          const url = typeof input === 'string' ? input : input.url;
          const method = options.method || 'GET';
          smoke.requests.push({ url, method });

          if (url === '/api/v1/wayglass/thought-vibration') {
            return json({
              schema: 'wayglass.specialist-operator/thought-vibration-v2',
              label: 'Thought Vibration AI',
              version: '2.0.0',
            });
          }

          if (url === '/api/v1/wayglass/thought-vibration/render') {
            const body = JSON.parse(options.body || '{}');
            await new Promise((resolve, reject) => {
              const timer = setTimeout(resolve, smoke.renderDelayMs);
              options.signal?.addEventListener('abort', () => {
                clearTimeout(timer);
                smoke.abortObserved = true;
                reject(new DOMException('aborted', 'AbortError'));
              }, { once: true });
            });
            const sessionId = body.session?.session_id || 'tv-browser-smoke';
            const receipt = {
              schema: 'thought-vibration.receipt/v1',
              session_id: sessionId,
              status: 'offline-rendered',
              renderer_id: 'thought-vibration.offline-reference/v2.0.0',
              source_id: 'wayglass:thought-vibration-surface',
              input_file_sha256: 'a'.repeat(64),
              wave_file_sha256: 'b'.repeat(64),
              wave_file: sessionId + '.wav',
              format: { sample_rate_hz: 48000, channels: 2, bit_depth: 16, frames: 2400, endian: 'little', codec: 'pcm' },
              measurements: { sample_peak: [0.05, 0.05], rms: [0.03, 0.03], dc_offset: [0, 0], stereo_correlation: 0, integrated_lufs: null, true_peak_dbtp: null, roughness: null },
              claims: [{ domain: 'OBSERVATION-TRUE', statement: 'Browser smoke fixture.' }],
              continuity: { stop_point: body.session?.stop_point ?? null, next_owner: body.session?.next_owner ?? null, unresolved_questions: body.session?.unresolved_questions ?? [] },
            };
            const wavBytes = 'RIFF' + 'browser-smoke-wave';
            return json({
              status: 'offline-rendered',
              receipt,
              receipt_ref: 'thought-vibration.receipt/v1:sha256:' + 'c'.repeat(64),
              receipt_inspection: { status: 'accepted-for-provenance', receipt_valid: true, grants_authority: false },
              artifact: {
                kind: 'offline-diagnostic-wav',
                filename: sessionId + '.wav',
                mime_type: 'audio/wav',
                bytes: wavBytes.length,
                sha256: 'b'.repeat(64),
                data: btoa(wavBytes),
                persisted: false,
                playback: false,
              },
            });
          }

          if (url === '/api/v1/wayglass/kernel/leave') {
            const body = JSON.parse(options.body || '{}');
            smoke.leaveBody = body;
            return json({
              status: 'stopped',
              stop_receipt: {
                schema: 'wayglass.stop-receipt/v0.1',
                receipt_id: 'stop:browser-smoke',
                world_id: body.world_id,
                participant_id: body.participant_id,
              },
              continuation_packet: {
                schema: 'wayglass.continuation-packet/v0.1',
                packet_id: 'packet:browser-smoke',
                world_id: body.world_id,
                participant_id: body.participant_id,
                domain_receipts: (body.thought_vibration_receipts || []).map((receipt) => ({
                  operator_id: 'thought-vibration-ai',
                  receipt_ref: 'thought-vibration.receipt/v1:sha256:' + 'c'.repeat(64),
                  receipt,
                  authority: { canon_commit: false, identity_commit: false },
                })),
              },
            });
          }

          if (url === '/api/v1/wayglass/kernel/enter') {
            const body = JSON.parse(options.body || '{}');
            smoke.enterBody = body;
            return json({
              status: 'entered',
              entered: true,
              continuation_packet: body.continuation_packet,
              stop_receipt: body.stop_receipt,
            });
          }

          throw new Error('Unexpected browser-smoke fetch: ' + method + ' ' + url);
        };

        await globalThis.__wayglassOS.mount('thought-vibration:operator');
        const root = document.querySelector('[data-surface="thought-vibration"]');
        if (!root) throw new Error('Thought Vibration surface did not mount.');

        const intent = root.querySelector('#tv-render-intent');
        intent.checked = true;
        intent.dispatchEvent(new Event('change', { bubbles: true }));
        root.querySelector('#tv-stop-point').value = 'Browser smoke stop point.';
        root.querySelector('#tv-next-owner').value = 'wayglass-browser-smoke';

        root.querySelector('#tv-audio-form').requestSubmit();
        const rendered = await new Promise((resolve, reject) => {
          const deadline = performance.now() + 4000;
          const tick = () => {
            const status = root.querySelector('#tv-render-status').textContent;
            if (status.startsWith('Rendered in memory')) return resolve(status);
            if (status.startsWith('Render rejected')) return reject(new Error(status));
            if (performance.now() > deadline) return reject(new Error('Timed out waiting for browser render.'));
            setTimeout(tick, 20);
          };
          tick();
        });

        const wav = root.querySelector('#tv-download');
        const receiptLink = root.querySelector('#tv-save-receipt');
        const wavHref = wav.getAttribute('href');
        const receiptHref = receiptLink.getAttribute('href');
        if (!wavHref?.startsWith('blob:')) throw new Error('WAV export did not receive a blob URL.');
        if (!receiptHref?.startsWith('blob:')) throw new Error('Receipt export did not receive a blob URL.');
        if (!wav.download.endsWith('.wav')) throw new Error('WAV export filename missing.');
        if (!receiptLink.download.endsWith('.thought-vibration-receipt.json')) throw new Error('Receipt export filename missing.');

        wav.click();
        receiptLink.click();
        if (smoke.downloads.length !== 2) throw new Error('Browser export clicks were not initiated for both artifacts.');

        root.querySelector('#tv-pin').click();
        if (globalThis.__wayglassOS.specialistReceipts().length !== 1) throw new Error('Rendered receipt did not pin to Wayglass stop/return state.');

        root.querySelector('#tv-feather').click();
        if (wav.hasAttribute('href') || receiptLink.hasAttribute('href')) throw new Error('Feather left a download URL attached.');
        if (!smoke.revoked.includes(wavHref) || !smoke.revoked.includes(receiptHref)) throw new Error('Feather did not revoke both generated object URLs.');
        if (!root.querySelector('#tv-render-result').hidden) throw new Error('Feather did not hide the rendered result.');

        smoke.renderDelayMs = 300;
        root.querySelector('#tv-audio-form').requestSubmit();
        await new Promise((resolve) => setTimeout(resolve, 30));
        root.querySelector('#tv-feather').click();
        await new Promise((resolve) => setTimeout(resolve, 30));
        if (!smoke.abortObserved) throw new Error('Feather did not abort an in-flight browser render.');

        const departure = await globalThis.__wayglassOS.leave({
          worldId: 'wayglass:browser-smoke',
          participantId: 'rowan:browser-smoke',
          stopPoint: 'Browser smoke stop point.',
          nextOwner: 'wayglass-browser-smoke',
          unresolvedWonderQuestions: ['Does Return preserve the specialist receipt?'],
          provenanceRefs: ['receipt:browser-smoke'],
        });
        if (departure.status !== 'stopped') throw new Error('Wayglass browser departure did not stop cleanly.');
        if (smoke.leaveBody?.thought_vibration_receipts?.length !== 1) throw new Error('Pinned specialist receipt was not forwarded into browser departure.');
        if (departure.continuation_packet.domain_receipts.length !== 1) throw new Error('Departure did not carry one specialist domain receipt.');
        if (globalThis.__wayglassOS.specialistReceipts().length !== 0) throw new Error('Pinned receipt did not clear after successful stop.');

        const returned = await globalThis.__wayglassOS.enter({
          worldId: 'wayglass:browser-smoke',
          participantId: 'rowan:browser-smoke',
          waygateManifest: { schema: 'wayglass.waygate-manifest/v0.1', waygate_id: 'waygate:browser-smoke', world_id: 'wayglass:browser-smoke', allowed_body_classes: ['host-os'] },
          continuationPacket: departure.continuation_packet,
          stopReceipt: departure.stop_receipt,
        });
        if (!returned.entered || returned.status !== 'entered') throw new Error('Wayglass browser return did not enter cleanly.');
        if (smoke.enterBody?.continuation_packet?.domain_receipts?.length !== 1) throw new Error('Return request lost the specialist domain receipt.');
        if (smoke.enterBody?.stop_receipt?.receipt_id !== 'stop:browser-smoke') throw new Error('Return request lost the stop receipt.');

        return {
          rendered,
          exports: smoke.downloads,
          created_object_urls: smoke.created.length,
          revoked_object_urls: smoke.revoked.length,
          feather_abort_observed: smoke.abortObserved,
          leave_domain_receipts: smoke.leaveBody.thought_vibration_receipts.length,
          return_domain_receipts: smoke.enterBody.continuation_packet.domain_receipts.length,
          stop_receipt_id: smoke.enterBody.stop_receipt.receipt_id,
        };
      })()`);

      assert(evidence?.exports?.length === 2, 'Browser smoke did not return two export initiations.');
      assert(evidence.created_object_urls >= 2, 'Browser smoke did not create export object URLs.');
      assert(evidence.revoked_object_urls >= 2, 'Browser smoke did not revoke export object URLs.');
      assert(evidence.feather_abort_observed === true, 'Browser smoke did not observe Feather abort.');
      assert(evidence.leave_domain_receipts === 1 && evidence.return_domain_receipts === 1, 'Browser smoke did not preserve stop/return domain receipt continuity.');

      console.log(JSON.stringify({
        ok: true,
        url: PREVIEW_URL,
        chrome: chromeBin,
        evidence,
      }, null, 2));
    } finally {
      cdp.close();
    }
  } finally {
    chrome.kill('SIGTERM');
    await rm(profileDir, { recursive: true, force: true });
    if (chrome.exitCode && chrome.exitCode !== 0) {
      process.stderr.write(chromeErr);
    }
  }
}

main().catch((error) => {
  console.error('Wayglass browser smoke failed:', error.stack || error.message);
  process.exitCode = 1;
});
