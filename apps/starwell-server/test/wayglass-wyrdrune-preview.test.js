'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');
const createWayglassRouter = require('../wayglass/router');

const source = `mobius {
 perceive { let light = votive("Lantern","Light kept for the journey"); }
 compress { let mark = angelicLetter(1); }
 release { let inscription = enochian("Pa","working letter name"); }
 verify { emit light; }
 integrate { emit mark; }
 choose { emit inscription; }
 return { emit "held"; }
 transcend { emit star(1); }
}`;

test('WTL owner-only HTTP preview preserves Eightfold records and never contacts a model', async () => {
  const old = process.env.ARCSWEEP_RUNTIME_TOKEN;
  const token = 'wayglass-wtl-private-test-' + 'f'.repeat(40);
  process.env.ARCSWEEP_RUNTIME_TOKEN = token;
  const app = express();
  app.use(express.json());
  app.use('/api/v1/wayglass', createWayglassRouter.createWayglassRouter());
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server,'listening');
    const url = `http://127.0.0.1:${server.address().port}/api/v1/wayglass/wyrdrune/preview`;
    const json = async (body, headers={}) => fetch(url,{
      method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)
    });
    const refused = await json({source});
    assert.equal(refused.status,401);
    assert.doesNotMatch(await refused.text(),/Lantern|Pa/);
    const forged = await json({source},{'x-owner-authorized':'true'});
    assert.equal(forged.status,401);
    const signed = await json({source},{authorization:'Bearer '+token});
    assert.equal(signed.status,200);
    const preview = await signed.json();
    assert.equal(preview.status,'preview-only');
    assert.equal(preview.effectPolicy,'no-host-effects');
    assert.equal(preview.dispatch,'none');
    assert.equal(preview.model_turn,false);
    assert.equal(preview.canon_commit,false);
    assert.equal(preview.phaseReceipts.length,8);
    assert.equal(preview.ritualLedger.entries.length,8);
    assert.equal(preview.ritualLedger.entries[0].previousHash,preview.ritualLedger.root);
    assert.equal(preview.ritualLedger.entries[7].entryHash,preview.ritualLedger.terminalHash);
    assert.match(preview.ritualLedger.terminalHash,/^wce1:[0-9a-f]{64}$/);
    assert.deepEqual(preview.values.slice(0,3).map(x=>x.kind),['votive-intention','letter-reference','inscription']);
    assert.equal(preview.values[2].translation,null);
    const repeat = await json({source},{authorization:'Bearer '+token});
    assert.equal((await repeat.json()).receiptHash,preview.receiptHash);
    const denial = await json({source:source.replace('emit "held";','emit bridge("python","run",1);')},{authorization:'Bearer '+token});
    assert.equal(denial.status,400);
    assert.match((await denial.json()).error,/Bridge capability unavailable/);
    const bad = await json({source:'not a Wyrdrune rite'},{authorization:'Bearer '+token});
    assert.equal(bad.status,400);
    const tooLong = await json({source:'x'.repeat(16001)},{authorization:'Bearer '+token});
    assert.equal(tooLong.status,400);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve=>server.close(resolve));
    if(old===undefined) delete process.env.ARCSWEEP_RUNTIME_TOKEN;
    else process.env.ARCSWEEP_RUNTIME_TOKEN=old;
  }
});
