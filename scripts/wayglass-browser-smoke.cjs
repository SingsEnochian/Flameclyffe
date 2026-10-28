const assert = require('node:assert/strict');
const fs = require('node:fs/promises');

const modulePath = process.env.WAYGLASS_PLAYWRIGHT_MODULE;
if (!modulePath) throw new Error('WAYGLASS_PLAYWRIGHT_MODULE is required.');
const { chromium } = require(modulePath);

const APP_URL = process.env.WAYGLASS_SMOKE_URL || 'http://127.0.0.1:5186';

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(body),
  });
}

function fakeWaveBase64() {
  const wave = Buffer.alloc(48);
  wave.write('RIFF', 0, 'ascii');
  wave.writeUInt32LE(40, 4);
  wave.write('WAVE', 8, 'ascii');
  wave.write('fmt ', 12, 'ascii');
  wave.writeUInt32LE(16, 16);
  wave.writeUInt16LE(1, 20);
  wave.writeUInt16LE(1, 22);
  wave.writeUInt32LE(48000, 24);
  wave.writeUInt32LE(96000, 28);
  wave.writeUInt16LE(2, 32);
  wave.writeUInt16LE(16, 34);
  wave.write('data', 36, 'ascii');
  wave.writeUInt32LE(4, 40);
  return wave.toString('base64');
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ acceptDownloads: true });

  let renderRequests = 0;
  let leaveRequest = null;
  let enterRequest = null;

  await page.addInitScript(() => {
    globalThis.__wayglassRevokedObjectUrls = [];
    const original = URL.revokeObjectURL.bind(URL);
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value(url) {
        globalThis.__wayglassRevokedObjectUrls.push(String(url));
        return original(url);
      },
    });
  });

  await page.route('**/api/v1/wayglass/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (pathname === '/api/v1/wayglass/routes' && request.method() === 'GET') {
      return json(route, {
        routes: [{ route_id: 'browser:smoke', label: 'Browser Smoke', model: 'fixture' }],
      });
    }

    if (pathname === '/api/v1/wayglass/thought-vibration' && request.method() === 'GET') {
      return json(route, {
        schema: 'wayglass.specialist-operator/thought-vibration-v2',
        label: 'Thought Vibration AI',
        version: '2.0.0',
      });
    }

    if (pathname === '/api/v1/wayglass/thought-vibration/render' && request.method() === 'POST') {
      renderRequests += 1;
      const payload = request.postDataJSON();
      assert.equal(payload.include_wave, true);
      assert.equal(payload.session.output.playback, false);
      assert.equal(payload.session.render_intent_confirmed, true);

      if (renderRequests === 2) {
        await new Promise((resolve) => setTimeout(resolve, 900));
      }

      const receipt = {
        schema: 'thought-vibration.receipt/v1',
        session_id: payload.session.session_id,
        status: 'offline-rendered',
        renderer_id: 'thought-vibration.browser-smoke/v0',
        source_id: payload.session.source_id,
        input_file_sha256: 'a'.repeat(64),
        wave_file_sha256: 'b'.repeat(64),
        wave_file: payload.session.session_id + '.wav',
        format: {
          sample_rate_hz: 48000,
          channels: 2,
          bit_depth: 16,
          frames: 2,
          endian: 'little',
          codec: 'pcm',
        },
        measurements: {
          sample_peak: [0, 0],
          rms: [0, 0],
          dc_offset: [0, 0],
          stereo_correlation: null,
          integrated_lufs: null,
          true_peak_dbtp: null,
          roughness: null,
        },
        claims: [
          {
            domain: 'OBSERVATION-TRUE',
            statement: 'Browser smoke fixture supplied deterministic offline bytes.',
          },
        ],
        continuity: {
          stop_point: payload.session.stop_point ?? null,
          next_owner: payload.session.next_owner ?? null,
          unresolved_questions: payload.session.unresolved_questions ?? [],
        },
      };

      try {
        return await json(route, {
          status: 'offline-rendered',
          receipt,
          receipt_ref: 'thought-vibration.receipt/v1:sha256:' + 'c'.repeat(64),
          receipt_inspection: {
            status: 'accepted-for-provenance',
            receipt_valid: true,
            grants_authority: false,
          },
          artifact: {
            kind: 'offline-diagnostic-wav',
            filename: payload.session.session_id + '.wav',
            mime_type: 'audio/wav',
            bytes: 48,
            sha256: 'b'.repeat(64),
            persisted: false,
            playback: false,
            data: fakeWaveBase64(),
          },
        });
      } catch (error) {
        if (renderRequests === 2) return;
        throw error;
      }
    }

    if (pathname === '/api/v1/wayglass/kernel/leave' && request.method() === 'POST') {
      leaveRequest = request.postDataJSON();
      return json(route, {
        status: 'stopped',
        stop_receipt: {
          schema: 'wayglass.stop-receipt/v0.1',
          receipt_id: 'browser-smoke-stop',
        },
        continuation_packet: {
          schema: 'wayglass.continuation-packet/v0.1',
          packet_id: 'browser-smoke-packet',
          domain_receipts: leaveRequest.thought_vibration_receipts || [],
        },
      });
    }

    if (pathname === '/api/v1/wayglass/kernel/enter' && request.method() === 'POST') {
      enterRequest = request.postDataJSON();
      return json(route, {
        status: 'entered',
        entered: true,
        receipt: {
          schema: 'wayglass.world-entry-receipt/v0.1',
          packet_id: enterRequest.continuation_packet?.packet_id ?? null,
        },
      });
    }

    return json(route, {});
  });

  try {
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Thought Vibration/ }).click();

    await page.locator('#tv-render-intent').check();
    await page.locator('#tv-stop-point').fill('Browser smoke stop.');
    await page.locator('#tv-next-owner').fill('Wayglass Browser Smoke');
    await page.locator('#tv-unresolved').fill('Does the pinned specialist receipt survive stop/return?');

    await page.locator('#tv-render').click();
    await page.waitForFunction(() => !document.querySelector('#tv-render-result')?.hidden);

    const wavLink = page.locator('#tv-download');
    const receiptLink = page.locator('#tv-save-receipt');
    const wavHref = await wavLink.getAttribute('href');
    const receiptHref = await receiptLink.getAttribute('href');

    assert.match(wavHref || '', /^blob:/);
    assert.match(receiptHref || '', /^blob:/);

    const [wavDownload] = await Promise.all([
      page.waitForEvent('download'),
      wavLink.click(),
    ]);
    assert.match(wavDownload.suggestedFilename(), /^tv-[A-Za-z0-9]+\.wav$/);
    const wavPath = await wavDownload.path();
    assert.ok(wavPath);
    assert.ok((await fs.stat(wavPath)).size > 44);

    const [receiptDownload] = await Promise.all([
      page.waitForEvent('download'),
      receiptLink.click(),
    ]);
    assert.match(
      receiptDownload.suggestedFilename(),
      /^tv-[A-Za-z0-9]+\.thought-vibration-receipt\.json$/,
    );
    const receiptPath = await receiptDownload.path();
    assert.ok(receiptPath);
    const exportedEvidence = JSON.parse(await fs.readFile(receiptPath, 'utf8'));
    assert.equal(exportedEvidence.schema, 'wayglass.thought-vibration-evidence/v0.1');
    assert.equal(exportedEvidence.receipt.schema, 'thought-vibration.receipt/v1');
    assert.equal(exportedEvidence.artifact.playback, false);
    assert.equal(exportedEvidence.artifact.persisted, false);

    await page.locator('#tv-pin').click();
    await page.waitForFunction(() =>
      document.querySelector('#tv-render-status')?.textContent?.includes('Receipt pinned to next Return Engine departure')
    );
    assert.equal(await page.evaluate(() => globalThis.__wayglassOS.specialistReceipts().length), 1);

    const departure = await page.evaluate(async () => globalThis.__wayglassOS.leave({
      worldId: 'wayglass:browser-smoke',
      participantId: 'rowan:browser-smoke',
      reason: 'pause',
      identityDeclarations: [
        { entity_id: 'rowan:browser-smoke', declaration: 'browser smoke participant' },
      ],
      provenanceRefs: ['receipt:browser-smoke'],
      stopPoint: 'Browser smoke stop.',
      nextOwner: 'wayglass:browser-smoke',
    }));

    assert.equal(departure.status, 'stopped');
    assert.equal(departure.continuation_packet.packet_id, 'browser-smoke-packet');
    assert.ok(leaveRequest);
    assert.equal(leaveRequest.thought_vibration_receipts.length, 1);
    assert.equal(
      leaveRequest.thought_vibration_receipts[0].schema,
      'thought-vibration.receipt/v1',
    );
    assert.equal(await page.evaluate(() => globalThis.__wayglassOS.specialistReceipts().length), 0);

    const entry = await page.evaluate(async (storedDeparture) => globalThis.__wayglassOS.enter({
      worldId: 'wayglass:browser-smoke',
      participantId: 'rowan:browser-smoke',
      waygateManifest: {
        schema: 'wayglass.waygate/v0.1',
        waygate_id: 'waygate:browser-smoke',
        world_id: 'wayglass:browser-smoke',
        allowed_body_classes: ['host-os'],
        provenance_refs: ['receipt:browser-smoke-gate'],
      },
      continuationPacket: storedDeparture.continuation_packet,
      stopReceipt: storedDeparture.stop_receipt,
    }), departure);

    assert.equal(entry.status, 'entered');
    assert.equal(entry.entered, true);
    assert.ok(enterRequest);
    assert.equal(enterRequest.continuation_packet.packet_id, 'browser-smoke-packet');
    assert.equal(enterRequest.stop_receipt.receipt_id, 'browser-smoke-stop');

    await page.locator('#tv-feather').click();
    assert.equal(await wavLink.getAttribute('href'), null);
    assert.equal(await receiptLink.getAttribute('href'), null);
    assert.equal(await page.locator('#tv-render-result').isHidden(), true);
    const revoked = await page.evaluate(() => globalThis.__wayglassRevokedObjectUrls);
    assert.ok(revoked.includes(wavHref));
    assert.ok(revoked.includes(receiptHref));

    await page.locator('#tv-render').click();
    await page.waitForFunction(() =>
      document.querySelector('#tv-render-status')?.textContent?.includes('Rendering deterministic diagnostic PCM')
    );
    await page.locator('#tv-feather').click();
    await page.waitForTimeout(1100);

    assert.equal(await page.locator('#tv-render-result').isHidden(), true);
    assert.equal(await wavLink.getAttribute('href'), null);
    assert.equal(await receiptLink.getAttribute('href'), null);
    assert.match(await page.locator('#tv-render-status').textContent(), /Feather: pending browser render cancelled/);
    assert.equal(renderRequests, 2);

    console.log(JSON.stringify({
      status: 'passed',
      browser: 'chromium',
      checks: [
        'wav-download-initiated',
        'json-receipt-download-initiated',
        'feather-revokes-object-urls',
        'feather-cancels-inflight-render-without-late-output',
        'pinned-specialist-receipt-handed-to-stop',
        'stop-return-continuity-request-roundtrip',
      ],
    }));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
