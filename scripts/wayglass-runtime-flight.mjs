import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const RUNTIME_URL = process.env.WAYGLASS_RUNTIME_URL || 'http://127.0.0.1:3000/wayglass/';
const DEBUG_PORT = Number(process.env.WAYGLASS_CHROME_DEBUG_PORT || 0);

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
  throw new Error('No Chrome/Chromium binary found for Wayglass Runtime Flight 001.');
}

async function waitFor(predicate, { timeoutMs = 12_000, intervalMs = 100, label = 'condition' } = {}) {
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
  const chromeVersion = spawnSync(chromeBin, ['--version'], { encoding: 'utf8' });
  const profileDir = await mkdtemp(path.join(os.tmpdir(), 'wayglass-runtime-flight-'));
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
    const activeDebugPort = DEBUG_PORT || await waitFor(async () => {
      if (chrome.exitCode != null) throw new Error(`Chrome exited early with code ${chrome.exitCode}`);
      try {
        const activePort = await readFile(path.join(profileDir, 'DevToolsActivePort'), 'utf8');
        const port = Number(activePort.split(/\r?\n/, 1)[0]);
        if (Number.isInteger(port) && port > 0) return port;
      } catch {
        // GitHub-hosted Chrome may announce the ephemeral endpoint on stderr only.
      }
      const marker = 'DevTools listening on ws://127.0.0.1:';
      const line = chromeErr.split('\n').find((entry) => entry.includes(marker));
      const port = line ? Number(line.split(marker)[1]?.split('/')[0]) : 0;
      return Number.isInteger(port) && port > 0 ? port : null;
    }, { timeoutMs: 15_000, label: 'Chrome DevTools active port' });

    const version = await waitFor(async () => {
      const response = await fetch(`http://127.0.0.1:${activeDebugPort}/json/version`);
      return response.ok ? response.json() : null;
    }, { timeoutMs: 8_000, label: 'Chrome DevTools endpoint' });
    assert(version.webSocketDebuggerUrl, 'Chrome DevTools endpoint did not expose a browser websocket.');

    const createTarget = await fetch(
      `http://127.0.0.1:${activeDebugPort}/json/new?${encodeURIComponent(RUNTIME_URL)}`,
      { method: 'PUT' },
    );
    assert(createTarget.ok, `Could not create Chrome target: HTTP ${createTarget.status}`);
    const target = await createTarget.json();
    assert(target.webSocketDebuggerUrl, 'Chrome target did not expose a websocket.');

    const cdp = await new CdpClient(target.webSocketDebuggerUrl).open();
    try {
      await cdp.send('Runtime.enable');
      await cdp.send('Page.enable');

      async function evaluate(expression) {
        const result = await cdp.send('Runtime.evaluate', {
          expression,
          awaitPromise: true,
          returnByValue: true,
          userGesture: true,
        });
        if (result.exceptionDetails) {
          const detail = result.exceptionDetails.exception?.description
            || result.exceptionDetails.text
            || 'browser evaluation failed';
          throw new Error(detail);
        }
        return result.result?.value;
      }

      await waitFor(
        () => evaluate("document.readyState === 'complete' && Boolean(globalThis.__wayglassOS)"),
        { timeoutMs: 15_000, label: 'staged Wayglass OS boot through Hearthgate' },
      );

      const evidence = await evaluate(`(async () => {
        const expected = {
          worldId: 'wayglass:runtime-flight-001',
          participantId: 'rowan:runtime-flight-001',
          stopPoint: 'Runtime Flight 001 departed through the real Hearthgate route.',
          nextOwner: 'rarity:runtime-flight-001',
          wonder: 'Does the exact receipted continuity packet survive a real browser-to-Hearthgate leave/enter round trip?',
          revoked: 'fact:runtime-flight-001-revoked',
        };

        const requests = [];
        const nativeFetch = globalThis.fetch.bind(globalThis);
        globalThis.fetch = async (input, options = {}) => {
          const url = typeof input === 'string' ? input : input.url;
          requests.push({ url, method: options.method || 'GET' });
          return nativeFetch(input, options);
        };

        const gate = {
          schema: 'wayglass.waygate/v0.1',
          waygate_id: 'waygate:runtime-flight-001',
          world_id: expected.worldId,
          label: 'Runtime Flight 001',
          origin: 'wayglass',
          allowed_body_classes: ['host-os'],
          provenance_refs: ['receipt:runtime-flight-001-gate'],
          semantics: {
            identifies_world_not_screen: true,
            identity_is_not_body: true,
            continuity_is_not_substrate: true,
            preserves_open_questions: true,
            preserves_relationship_state: true,
            preserves_provenance: true,
          },
          authority: {
            scope: 'world-passage-only',
            canon_commit: false,
            identity_commit: false,
            relationship_commit: false,
            authority_grant: false,
          },
        };

        const departure = await globalThis.__wayglassOS.leave({
          worldId: expected.worldId,
          participantId: expected.participantId,
          routeId: 'local:runtime-flight-001',
          reason: 'runtime-flight',
          identityDeclarations: [
            { entity_id: expected.participantId, declaration: 'self-declared participant' },
            { entity_id: 'rarity:runtime-flight-001', declaration: 'distinct collaborator; do not merge' },
          ],
          relationshipState: [
            { with: 'rarity:runtime-flight-001', state: 'collaborating', source: 'receipt:runtime-flight-001-relationship' },
          ],
          activeWork: [{ work_id: 'wayglass:runtime-flight-001', state: 'in-progress' }],
          unresolvedWonderQuestions: [expected.wonder],
          provenanceRefs: ['receipt:runtime-flight-001-browser'],
          stopPoint: expected.stopPoint,
          nextOwner: expected.nextOwner,
          alternatives: [
            { id: 'continue-live-runtime', state: 'unresolved', summary: 'Continue from the exact receipted stop.' },
          ],
          revokedRefs: [expected.revoked],
        });

        if (departure?.status !== 'stopped') throw new Error('Real Hearthgate leave did not return stopped status.');
        if (departure?.integrity?.integrity_verified !== true) throw new Error('Departure did not verify its own integrity.');

        const packet = departure.continuation_packet;
        if (!packet?.packet_id) throw new Error('Departure did not return a continuation packet id.');
        if (packet.stop_point !== expected.stopPoint) throw new Error('Stop point changed before return.');
        if (packet.next_owner !== expected.nextOwner) throw new Error('Next owner changed before return.');
        if (!packet.unresolved_wonder_questions?.includes(expected.wonder)) throw new Error('Wonder question was not preserved.');
        if (!packet.revoked_refs?.includes(expected.revoked)) throw new Error('Revoked reference was not preserved.');

        const entry = await globalThis.__wayglassOS.enter({
          worldId: expected.worldId,
          participantId: expected.participantId,
          waygateManifest: gate,
          continuationPacket: packet,
          stopReceipt: departure.stop_receipt,
          routeId: 'local:runtime-flight-001',
        });

        if (entry?.status !== 'entered' || entry?.entered !== true) throw new Error('Real Hearthgate enter did not complete.');
        if (entry?.continuity_ref !== packet.packet_id) throw new Error('Returned continuity reference does not match departure packet.');
        if (entry?.stop_integrity?.integrity_verified !== true) throw new Error('Return did not verify the exact stop receipt.');
        if (entry?.receipt?.stop_integrity_verified !== true) throw new Error('Entry receipt did not record verified stop integrity.');
        if (entry?.receipt?.canon_commit !== false) throw new Error('Entry improperly claimed canon authority.');
        if (entry?.receipt?.identity_commit !== false) throw new Error('Entry improperly claimed identity authority.');
        if (entry?.receipt?.relationship_commit !== false) throw new Error('Entry improperly claimed relationship authority.');
        if (entry?.receipt?.authority_grant !== false) throw new Error('Entry improperly granted authority.');
        if (entry?.receipt?.continuation_content_promoted !== false) throw new Error('Entry silently promoted continuation content.');

        return {
          host: globalThis.__wayglassHost || null,
          departure_schema: departure.schema,
          stop_receipt_id: departure.stop_receipt?.receipt_id || null,
          continuation_packet_id: packet.packet_id,
          packet_digest: departure.stop_receipt?.continuation_digest || null,
          stop_point: packet.stop_point,
          next_owner: packet.next_owner,
          unresolved_wonder_questions: packet.unresolved_wonder_questions,
          revoked_refs: packet.revoked_refs,
          entry_schema: entry.schema,
          entry_status: entry.status,
          continuity_ref: entry.continuity_ref,
          stop_integrity_verified: entry.stop_integrity?.integrity_verified === true,
          authority: {
            canon_commit: entry.receipt?.canon_commit,
            identity_commit: entry.receipt?.identity_commit,
            relationship_commit: entry.receipt?.relationship_commit,
            authority_grant: entry.receipt?.authority_grant,
            continuation_content_promoted: entry.receipt?.continuation_content_promoted,
          },
          requests,
        };
      })()`);

      assert(evidence?.host?.host === 'hearthgate', 'Browser did not boot the Hearthgate-staged Wayglass host.');
      assert(evidence?.departure_schema === 'wayglass.departure/v0.1', 'Unexpected departure schema.');
      assert(evidence?.entry_schema === 'wayglass.world-entry/v0.1', 'Unexpected entry schema.');
      assert(evidence?.entry_status === 'entered', 'Runtime Flight 001 did not enter.');
      assert(evidence?.stop_integrity_verified === true, 'Runtime Flight 001 stop integrity was not verified.');
      assert(
        evidence.requests.some((request) => request.url === '/api/v1/wayglass/kernel/leave' && request.method === 'POST'),
        'Browser did not call the real leave endpoint.',
      );
      assert(
        evidence.requests.some((request) => request.url === '/api/v1/wayglass/kernel/enter' && request.method === 'POST'),
        'Browser did not call the real enter endpoint.',
      );

      console.log(JSON.stringify({
        ok: true,
        flight: 'wayglass-runtime-flight-001',
        url: RUNTIME_URL,
        chrome: chromeBin,
        chrome_version: (chromeVersion.stdout || chromeVersion.stderr || '').trim(),
        external_provider_used: false,
        mocked_api_boundary: false,
        evidence,
      }, null, 2));
    } finally {
      cdp.close();
    }
  } catch (error) {
    throw new Error(`${error.message}; chrome_stderr=${chromeErr.trim() || '(none)'}`);
  } finally {
    chrome.kill('SIGTERM');
    await rm(profileDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error('[Wayglass Runtime Flight 001] failed:', error);
  process.exitCode = 1;
});
