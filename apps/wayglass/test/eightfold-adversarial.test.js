import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createRequire } from 'node:module';
import { verifyWyrdrunePreview, digestWce1 } from '../src/wyrdrune-proof.js';

const require = createRequire(import.meta.url);
const { previewWyrdruneRitual } = require('../../../lib/wayglass-wyrdrune-ritual.cjs');
const { compile, execute } = require('../../../lib/wyrdrune/wyrdrune.cjs');
const { buildRitualLedger, verifyRitualLedger } = require('../../../lib/wyrdrune/ritual-ledger.cjs');

const SOURCE = [
  'mobius {',
  ' perceive { let hope = votive("Gabriel’s Grace","Light for the journey"); }',
  ' compress { let letter = angelicLetter(14); }',
  ' release { let mark = enochian("Pa","working transcription"); }',
  ' verify { emit hope; }',
  ' integrate { emit letter; }',
  ' choose { emit mark; }',
  ' return { emit 42; }',
  ' transcend { emit 8; }',
  '}',
].join('\n');
const signedPreview = async () => ({
  ...await previewWyrdruneRitual(SOURCE),
  dispatch: 'none', model_turn: false, canon_commit: false,
});

function corrupted(label, mutate) {
  test('adversarial receipt must be rejected: ' + label, async () => {
    // A network JSON receipt is mutable; frozen in-process runtime objects are not.
    const packet = structuredClone(await signedPreview());
    assert.equal((await verifyWyrdrunePreview(SOURCE, packet, webcrypto)).verified, true);
    mutate(packet);
    await assert.rejects(
      verifyWyrdrunePreview(SOURCE, packet, webcrypto),
      /integrity verification failed/,
      label,
    );
  });
}

corrupted('different emitted intention', p => { p.values[0].dedication = 'Substituted'; });
corrupted('rewritten Enochian letter', p => { p.values[1].romanizedName = 'Someone else'; });
corrupted('forged embedded record hash', p => { p.values[2].recordHash = 'wce1:' + '0'.repeat(64); });
corrupted('changed arithmetic', p => { p.values[3] = 43; });
corrupted('secret extra emission', p => { p.values.push('extra'); });
corrupted('missing emission', p => { p.values.pop(); });
corrupted('forged source digest', p => { p.sourceHash = 'f'.repeat(64); });
corrupted('fake final preview digest', p => { p.receiptHash = 'wce1:' + 'a'.repeat(64); });
corrupted('false host effects', p => { p.effectPolicy = 'host-effects-allowed'; });
corrupted('false provider dispatch', p => { p.dispatch = 'spicychat'; });
corrupted('false model turn', p => { p.model_turn = true; });
corrupted('false canon promotion', p => { p.canon_commit = true; });
corrupted('fake owner authority', p => { p.owner_authorized = true; });
corrupted('false Withness center', p => { p.withness.center = 'other'; });
corrupted('fake cycle count', p => { p.withness.completedCycles = 2; });
corrupted('wrong ledger root', p => { p.ritualLedger.root = 'wce1:' + 'f'.repeat(64); });
corrupted('wrong ledger terminal', p => { p.ritualLedger.terminalHash = p.ritualLedger.root; });
corrupted('wrong ledger assurance', p => { p.ritualLedger.assurance = 'signed-by-model'; });
corrupted('phase-count truncation', p => { p.phaseReceipts.pop(); });
corrupted('phase list addition', p => { p.phaseReceipts.push(p.phaseReceipts[0]); });
corrupted('missing ledger phase', p => { p.ritualLedger.entries.shift(); });
corrupted('extra ledger phase', p => { p.ritualLedger.entries.push(p.ritualLedger.entries[0]); });
for (let i = 0; i < 8; i++) {
  corrupted('phase ' + (i+1) + ' wrong position', p => { p.phaseReceipts[i].phase = ['compress','release','verify','integrate','choose','return','transcend','perceive'][i]; });
  corrupted('phase ' + (i+1) + ' forged predecessor', p => { p.ritualLedger.entries[i].previousHash = 'wce1:' + 'c'.repeat(64); });
  corrupted('phase ' + (i+1) + ' operation tamper', p => { p.phaseReceipts[i].operations += 2; });
  corrupted('phase ' + (i+1) + ' link mutation', p => { p.ritualLedger.entries[i].entryHash = 'wce1:' + 'b'.repeat(64); });
}
test('a source-byte change cannot reuse an earlier valid receipt', async () => {
  const packet = await signedPreview();
  await assert.rejects(
    verifyWyrdrunePreview(SOURCE + ' ', packet, webcrypto),
    /integrity verification failed/,
  );
});
test('ledger rebuild refuses substituted output and unchanged receipts', async () => {
  const execution = await execute(compile(SOURCE));
  const ledger = buildRitualLedger(execution);
  assert.equal(verifyRitualLedger(execution, ledger), true);
  const altered = {...execution, output: [...execution.output]};
  altered.output[3] = 99;
  assert.equal(verifyRitualLedger(altered, ledger), false);
});
test('WCE-1 digest has a deterministic cryptographic avalanche for modified text', async () => {
  const a = await digestWce1({ritual:'Gabriel’s Grace', owner:'Rowan'}, webcrypto);
  const b = await digestWce1({ritual:'Gabriels Grace', owner:'Rowan'}, webcrypto);
  assert.match(a, /^wce1:[a-f0-9]{64}$/);
  assert.notEqual(a,b);
});
