import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VIDEO_HANDOFF_SCHEMA, VIDEO_RECEIPT_SCHEMA, WayglassVideoAtelier,
  LtxDesktopLocalClient, normaliseLtxEndpoint, validateVideoHandoff,
} from '../src/ltx-desktop-bridge.js';

const handoff = () => new WayglassVideoAtelier({ now: () => '2026-10-08T23:00:00Z' }).prepare();

test('video atelier creates a stable, non-canonical render handoff', () => {
  const job = handoff();
  assert.equal(job.schema, VIDEO_HANDOFF_SCHEMA);
  assert.equal(job.render_request.model, 'fast');
  assert.equal(job.render_request.resolution, '720p');
  assert.equal(job.render_request.duration, 5);
  assert.equal(job.state, 'prepared-not-rendered');
  assert.match(job.render_request.prompt, /refractive depth/i);
  assert.match(job.authority, /no identity/);
  assert.ok(validateVideoHandoff(JSON.parse(JSON.stringify(job))));
});

test('invalid scene, empty prompt, and altered paid-capable settings fail closed', () => {
  const atelier = new WayglassVideoAtelier();
  assert.throws(() => atelier.prepare({sceneId: 'fictional-unknown'}), /Unknown/);
  assert.throws(() => atelier.prepare({prompt: '   '}), /nonempty/);
  assert.throws(() => validateVideoHandoff({...handoff(), render_request: {...handoff().render_request, model: 'pro'}}), /Unsupported/);
});

test('LTX desktop only permits authenticated loopback origins', () => {
  assert.equal(normaliseLtxEndpoint(), 'http://127.0.0.1:41954');
  assert.equal(normaliseLtxEndpoint('http://localhost:8123'), 'http://localhost:8123');
  for(const endpoint of ['https://localhost:41954','http://192.168.1.2:41954','http://evil.com','http://127.0.0.1:41954/api','http://user:pass@localhost:41954']) {
    assert.throws(() => normaliseLtxEndpoint(endpoint), /loopback/);
  }
  assert.throws(() => new LtxDesktopLocalClient({token: ''}), /nonempty/);
});

test('LTX refuses paid/cloud fallback before any video POST', async () => {
  const calls = [];
  const client = new LtxDesktopLocalClient({
    token: 'synthetic-not-real',
    fetchImpl: async (url, opts) => {
      calls.push({url, method: opts.method || 'GET'});
      return new Response(JSON.stringify({force_api_generations: true}), {status:200});
    },
  });
  await assert.rejects(client.render(handoff()), /Paid API fallback/);
  assert.deepEqual(calls.map(c => c.method), ['GET']);
});

test('LTX local engine happy path returns a distinct non-canonical receipt', async () => {
  const paths = [];
  let sent;
  const client = new LtxDesktopLocalClient({
    token: 'synthetic-not-real',
    fetchImpl: async (url, opts) => {
      const suffix = new URL(url).pathname;
      paths.push(suffix);
      assert.equal(opts.headers.Authorization, 'Bearer synthetic-not-real');
      if (suffix === '/api/runtime-policy') return Response.json({force_api_generations:false});
      if (suffix === '/health') return Response.json({status:'ok',gpu_info:{name:'testGPU'}});
      if (suffix === '/api/generate') {
        sent = JSON.parse(opts.body);
        return Response.json({status:'complete',video_path:'/tmp/example.mp4'});
      }
      throw new Error('Unexpected HTTP route');
    },
  });
  const job = handoff();
  const receipt = await client.render(job, {startImagePath:'/tmp/pony.png',endImagePath:'/tmp/human.png'});
  assert.deepEqual(paths, ['/api/runtime-policy','/health','/api/generate']);
  assert.equal(sent.imagePath, '/tmp/pony.png');
  assert.equal(sent.lastImagePath, '/tmp/human.png');
  assert.equal(sent.prompt, job.render_request.prompt);
  assert.equal(sent.model, 'fast');
  assert.equal(receipt.schema, VIDEO_RECEIPT_SCHEMA);
  assert.equal(receipt.status, 'engine-reported-complete');
  assert.equal(receipt.filesystem_verified, false);
  assert.equal(receipt.canon_commit, false);
});

test('LTX generation errors and cancellations never claim completion', async () => {
  const client = new LtxDesktopLocalClient({
    token: 'synthetic-not-real',
    fetchImpl: async url => {
      const pathname = new URL(url).pathname;
      if (pathname === '/api/runtime-policy') return Response.json({force_api_generations:false});
      if (pathname === '/health') return Response.json({status:'ok'});
      return Response.json({status:'cancelled'});
    },
  });
  await assert.rejects(client.render(handoff()), /cancelled/);
  await assert.rejects(client.render(handoff(), {endImagePath:'/tmp/human.png'}), /requires a start frame/);
});
