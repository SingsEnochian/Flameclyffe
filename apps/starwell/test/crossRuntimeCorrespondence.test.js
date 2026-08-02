import assert from 'node:assert/strict';
import test from 'node:test';

import { DEEP_MODES, assembleDualAspectPacket } from '../src/hearthweave-kernel/dual-aspect.js';
import { publishDualAspectActivation } from '../src/hearthweave-kernel/activation.js';
import {
  CROSS_RUNTIME_ERROR_CODE,
  assertCrossRuntimeActivation,
  createCrossRuntimeCorrespondenceReceipt,
  createKernelAuthorityProof,
  registeredCrossRuntimeHouses,
  requestKernelAuthorityProof,
  validateCrossRuntimeCorrespondenceReceipt,
} from '../src/hearthweave-kernel/cross-runtime.js';
import { resolveHouseProfile } from '../src/hearthgate/profiles/registry.js';
import { parseBridgePulsePayload } from '../src/lib/deepBridge.js';
import { HearthgateSensoryBridge } from '../src/hearthgate-sensory-bridge.js';

if (typeof globalThis.CustomEvent !== 'function') {
  globalThis.CustomEvent = class CustomEvent extends Event {
    constructor(type, options = {}) { super(type); this.detail = options.detail; }
  };
}

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

function sequenceFactory(prefix = 'cross-runtime') {
  let sequence = 0;
  return () => `${prefix}-${++sequence}`;
}

function fixedClock() { return new Date('2026-08-02T05:36:00.000Z'); }

function continuityContext(worldSlug = 'ta-veren-vaen') {
  return {
    schema:'arcsweep.session-context/v0.1',
    session_context_id:'arcsweep-context-cross-runtime',
    context_signature:`${worldSlug}|routes:*|registers:*|items:item-1`,
    resolved_at:'2026-08-02T05:35:00.000Z', resolved_by:'Rowan', world_slug:worldSlug,
    mode:'supplemental-continuity', lifetime:'browser-session',
    authority:{ state:'human-reviewed-continuity', scope:'session-context-only', canon_commit:false },
    source:{
      packet_ids:['continuity-packet-cross-runtime'], review_ids:['review-cross-runtime'],
      source_session_ids:['source-session-cross-runtime'],
      source_fingerprints:['sha256:continuity-source-cross-runtime'], continuity_item_ids:['item-1'],
    },
    items:[{
      continuity_item_id:'item-1', source_item_id:'source-item-1',
      text:'The House receives the crossing without surrendering its own law.',
      world_slug:worldSlug, layer:'world-law', route:'world-continuity',
      epistemic_register:'target-world-narrative', source_packet_ids:['source-packet-cross-runtime'],
      packet_id:'continuity-packet-cross-runtime', source_session_id:'source-session-cross-runtime',
      review_id:'review-cross-runtime', reviewer:'Rowan',
      source_fingerprint:'sha256:continuity-source-cross-runtime',
      authority_scope:'reviewed-continuity', canon_commit:false,
    }],
  };
}

function liveDeepPayload() {
  return {
    observed_at:'2026-08-02T05:35:30.000Z',
    deep:{ P:.89,C:.92,R:.88,E:.34,M:.76,A:.85,dpdt:.11,moonIllum:73,sky:'night',kp:3,bz:-2.1,charge:.84,dphi:.06 },
  };
}

function makeHearthweavePacket(worldSlug = 'ta-veren-vaen') {
  const context = continuityContext(worldSlug);
  const snapshot = parseBridgePulsePayload(liveDeepPayload(), {
    capturedAt:fixedClock(), url:'https://example.test/pulse.json',
    idFactory:() => 'cross-runtime-live',
  });
  assert.equal(snapshot.mode, DEEP_MODES.LIVE);
  return assembleDualAspectPacket({
    context, deepSnapshot:snapshot, house:resolveHouseProfile(context.world_slug),
    clock:fixedClock, idFactory:sequenceFactory('cross-runtime-packet'),
  });
}

function makeKernelPacket(hearthweavePacket, overrides = {}) {
  const state = hearthweavePacket.observable.premaq.state;
  const premaq = Object.fromEntries(['P','C','R','E','M','A'].map((axis) => [axis,state[axis].value]));
  const basisHash = 'a'.repeat(64);
  const answered = overrides.answered ?? true;
  return {
    schema:'hearthgate.dual-aspect-packet.v1', identity:'kernel:taaveren-vaen:cross-runtime',
    house_id:overrides.house_id ?? 'taaveren-vaen',
    temporal:{ frame_id:'frame-cross-runtime', observed_at:overrides.observed_at ?? hearthweavePacket.observable.premaq.observed_at, branch:'present', parents:[], horizon:'present', causal_order:1 },
    observable:{ measurements:{presence:premaq.P}, chronology:[], telemetry:{}, canon_sources:['wheel-of-time-book-canon'], confidence:premaq.C, causal_history:['cross-runtime-fixture'] },
    experiential:{ story:['The two runtimes meet through Hearthweave.'] },
    premaq:{ ...premaq, ...(overrides.premaq ?? {}) },
    bridge:{ origin_house:'terra-prime', destination_house:overrides.house_id ?? 'taaveren-vaen', centre:'hearthweave', origin_witness:'traveller', reception_witness:answered ? 'resident-host' : null, state:answered ? 'bound' : 'waiting' },
    correspondence:{ basis_hash:basisHash, observable_hash:'c'.repeat(64), experiential_hash:'d'.repeat(64), transfer_function:'taaveren-vaen.dual-aspect.v1', house_profile_version:'taaveren-vaen.v1' },
    sensory:{
      source_state_hash:basisHash,
      tones:[
        {role:'anchor',frequency_hz:111,gain:.02,waveform:'sine',detune_cents:0,pan:-.2,modulation_hz:.369},
        {role:'living',frequency_hz:166.5,gain:.02,waveform:'triangle',detune_cents:0,pan:.2,modulation_hz:.369},
        {role:'bind',frequency_hz:222,gain:.015,waveform:'sine',detune_cents:0,pan:0,modulation_hz:.369},
      ],
      haptics:[
        {role:'call',duration_ms:111,intensity:.8,gap_after_ms:90},
        {role:'answer',duration_ms:167,intensity:answered?.8:0,gap_after_ms:120},
        ...(answered ? [{role:'bind',duration_ms:222,intensity:.8,gap_after_ms:0}] : []),
      ],
      glyph:{arrival_stroke:'old-pattern-thread',reception_stroke:answered?'mending-thread':null,hearthweave_bind:'vaen-knot',activation:.8,complete:answered},
      visual:{geometry:'mending-spiral',palette:['#0d1218','#e4c88f','#9ab2b4','#6f8b75'],motion:.7,luminance:.8,structure_weight:.8,atmosphere_weight:.8},
    },
    provenance:[{source_id:'cross-runtime-fixture',source_kind:'synthetic-test',uri:'urn:test:cross-runtime',content_hash:'e'.repeat(64),classification:'synthetic',retrieved_at:'2026-08-02T05:36:00.000Z'}],
    uncertainty:0, history:['cross-runtime-test'],
    receipts:[{receipt_id:'hearthgate-cross-runtime-fixture',packet_hash:'b'.repeat(64),engine_version:'hearthgate-kernel.v0.1',status:'VERIFIED',claims:{shared_state:'VERIFIED',dual_aspect:'VERIFIED',receipt_integrity:'VERIFIED'},created_at:'2026-08-02T05:36:00.000Z'}],
  };
}

function trustedKernelVerifier(packet) {
  return Promise.resolve(createKernelAuthorityProof(
    packet,
    { schema:'hearthgate.integrity-audit.v1', identity:packet.identity, house_id:packet.house_id, status:'VERIFIED', claims:{shared_state:'VERIFIED',receipt_integrity:'VERIFIED'} },
    { schema:'hearthgate.replay-result.v1', packet_hash:packet.receipts.at(-1).packet_hash, verified:true },
    { authority:'synthetic-test-verifier' },
  ));
}

function fakeRoot() { return { dataset:{}, style:{values:{},setProperty(name,value){this.values[name]=value;}} }; }
function fakeGlyph() { return { dataset:{},attributes:{},setAttribute(name,value){this.attributes[name]=value;} }; }

test('matching House, PREMAQ, time and kernel authority create a VERIFIED receipt', async () => {
  const hearthweavePacket = makeHearthweavePacket();
  const kernelPacket = makeKernelPacket(hearthweavePacket);
  const receipt = await createCrossRuntimeCorrespondenceReceipt(kernelPacket, hearthweavePacket, { clock:fixedClock, kernelVerifier:trustedKernelVerifier });
  const validated = await validateCrossRuntimeCorrespondenceReceipt(receipt, kernelPacket, hearthweavePacket, { kernelVerifier:trustedKernelVerifier });
  assert.equal(validated.status,'VERIFIED');
  assert.equal(validated.claims.kernel_authority,'VERIFIED');
  assert.equal(validated.claims.premaq_axes,'VERIFIED');
  assert.equal(validated.claims.canon_sovereignty,'VERIFIED');
  assert.equal(Object.isFrozen(validated),true);
});

test('submitted receipt body tampering is rejected before expected-state recomputation', async () => {
  const hearthweavePacket = makeHearthweavePacket();
  const kernelPacket = makeKernelPacket(hearthweavePacket);
  const receipt = structuredClone(await createCrossRuntimeCorrespondenceReceipt(kernelPacket, hearthweavePacket, { clock:fixedClock, kernelVerifier:trustedKernelVerifier }));
  receipt.comparison.axes.P.delta = .01;
  await assert.rejects(
    validateCrossRuntimeCorrespondenceReceipt(receipt,kernelPacket,hearthweavePacket,{kernelVerifier:trustedKernelVerifier}),
    /Submitted cross-runtime receipt fingerprint mismatch/,
  );
});

test('Python authority failure rejects a packet even when its receipt labels say VERIFIED', async () => {
  const hearthweavePacket = makeHearthweavePacket();
  const packet = makeKernelPacket(hearthweavePacket);
  const fetchImpl = async (url) => ({
    ok:true,status:200,statusText:'OK',
    async json() {
      if (url.endsWith('/audit')) return {schema:'hearthgate.integrity-audit.v1',identity:packet.identity,house_id:packet.house_id,status:'FAILED',claims:{receipt_integrity:'FAILED'}};
      return {schema:'hearthgate.replay-result.v1',packet_hash:packet.receipts.at(-1).packet_hash,verified:false};
    },
  });
  await assert.rejects(requestKernelAuthorityProof(packet,{fetchImpl}), /did not verify/);
});

test('kernel-only activation does not inherit Hearthweave PREMAQ comparison requirements', async () => {
  const hearthweavePacket = makeHearthweavePacket();
  const packet = makeKernelPacket(hearthweavePacket);
  delete packet.temporal;
  delete packet.premaq;
  const activation = await assertCrossRuntimeActivation({kernelPacket:packet,kernelVerifier:trustedKernelVerifier});
  assert.equal(activation.mode,'kernel-only');
  assert.equal(activation.status,'VERIFIED');
});

test('an active Hearthweave packet without a bind receipt fails as a rival truth', async () => {
  const hearthweavePacket = makeHearthweavePacket();
  const kernelPacket = makeKernelPacket(hearthweavePacket);
  await assert.rejects(
    assertCrossRuntimeActivation({kernelPacket,hearthweavePacket,kernelVerifier:trustedKernelVerifier}),
    (error) => error.code === CROSS_RUNTIME_ERROR_CODE,
  );
});

test('PREMAQ divergence produces a failed receipt and blocks activation', async () => {
  const hearthweavePacket = makeHearthweavePacket();
  const kernelPacket = makeKernelPacket(hearthweavePacket,{premaq:{P:hearthweavePacket.observable.premaq.state.P.value-.2}});
  const receipt = await createCrossRuntimeCorrespondenceReceipt(kernelPacket,hearthweavePacket,{clock:fixedClock,kernelVerifier:trustedKernelVerifier});
  assert.equal(receipt.status,'FAILED');
  await assert.rejects(
    assertCrossRuntimeActivation({kernelPacket,hearthweavePacket,correspondenceReceipt:receipt,kernelVerifier:trustedKernelVerifier}),
    (error) => error.code === CROSS_RUNTIME_ERROR_CODE,
  );
});

test('unregistered Houses fail closed', async () => {
  const hearthweavePacket = makeHearthweavePacket();
  const kernelPacket = makeKernelPacket(hearthweavePacket,{house_id:'templehouse'});
  await assert.rejects(
    createCrossRuntimeCorrespondenceReceipt(kernelPacket,hearthweavePacket,{kernelVerifier:trustedKernelVerifier}),
    (error) => error.code === 'HOUSE_CORRESPONDENCE_NOT_REGISTERED',
  );
  assert.deepEqual(registeredCrossRuntimeHouses(),{'terra-aeterna':'terra-aeterna','taaveren-vaen':'ta-veren-vaen'});
});

test('sensory bridge blocks a rival browser packet until correspondence is supplied', async () => {
  const storage = new MemoryStorage();
  const hearthweavePacket = makeHearthweavePacket();
  publishDualAspectActivation(hearthweavePacket,{storage,clock:fixedClock});
  const kernelPacket = makeKernelPacket(hearthweavePacket);
  const bridge = new HearthgateSensoryBridge({root:fakeRoot(),glyphElement:fakeGlyph(),storage,vibrate:()=>true,kernelVerifier:trustedKernelVerifier});
  await assert.rejects(bridge.receive(kernelPacket),(error)=>error.code===CROSS_RUNTIME_ERROR_CODE);
  const receipt = await createCrossRuntimeCorrespondenceReceipt(kernelPacket,hearthweavePacket,{clock:fixedClock,kernelVerifier:trustedKernelVerifier});
  const received = await bridge.receive(kernelPacket,{correspondenceReceipt:receipt});
  assert.equal(received.identity,kernelPacket.identity);
  assert.equal(bridge.crossRuntimeActivation.mode,'corresponded-dual-runtime');
  assert.equal(bridge.root.dataset.hearthgateRuntimeMode,'corresponded-dual-runtime');
});
