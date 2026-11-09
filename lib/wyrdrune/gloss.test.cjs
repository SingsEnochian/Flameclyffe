'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { compile } = require('./wyrdrune.cjs');
const lineage = require('./lineage-backend.cjs');
const load = () => import('./gloss.mjs');
const wrap = (b, scoped = true) => `mobius${scoped ? ' scoped' : ''} { ${['perceive','compress','release','verify','integrate','choose','return','transcend'].map((p, i) => p + ' { ' + (b[i] || '') + ' }').join(' ')} }`;

test('every statement and expression has a faithful English reading', async () => {
  const { glossProgram } = await load();
  const g = glossProgram(compile(wrap(['let energy_prior = 2;', 'set energy_prior = (energy_prior + 1) * 4;', 'emit -energy_prior / 2;',
    'require energy_prior >= 9 and not (energy_prior < 0) or unknown else "too little";', 'emit enochian("Pa","working name");',
    'emit angelicLetter(14);', 'emit energy_prior;', 'emit "after"; carry energy_prior = energy_prior;'])));
  const t = g.text;
  assert.match(t, /Let energy prior be 2\./);
  assert.match(t, /Energy prior becomes \(energy prior plus 1\) times 4\./);
  assert.match(t, /Hold ready to offer when the cycle comes home: minus energy prior divided by 2\./);
  assert.match(t, /Verify insists that energy prior is at least 9 and it is not so that energy prior is less than 0 or the unknown\. If not \(“too little”\), the whole cycle is undone/);
  assert.match(t, /an Enochian inscription of “Pa”, labelled “working name”/);
  assert.match(t, /the Angelical letter numbered 14/);
  assert.match(t, /Offer, as the cycle comes home, energy prior\./);
  assert.match(t, /Offer “after”\./, 'after Return an emit goes straight out');
  assert.match(t, /Carry energy prior across the twist as energy prior\./);
  assert.match(t, /Compress, what is distilled:/);
  assert.equal(g.model_invoked, false); assert.equal(g.language, 'en-GB'); assert.equal(g.deterministic, true);
});

test('plain v0.1 circuits read as shared and offer immediately; empty phases read as stillness', async () => {
  const { glossProgram } = await load();
  const t = glossProgram(compile(wrap(['emit 1;'], false))).text;
  assert.match(t, /shares what earlier circuits bound/);
  assert.match(t, /Offer 1\./);
  assert.match(t, /Nothing here; this phase passes in stillness\./);
});

test('the canonical WTL beside each line compiles back to the same programme', async () => {
  const { glossProgram } = await load();
  for (const file of ['living-learning.wtl', 'story-soundscape.wtl', 'full-spectrum.wtl', 'resonance-atlas.wtl']) {
    const ir = compile(readFileSync(join(__dirname, file), 'utf8'));
    const g = glossProgram(ir);
    const rebuilt = g.units.map(u => 'mobius' + (u.scoped ? ' scoped' : '') + ' { ' +
      u.phases.map(p => p.phase + ' { ' + p.lines.filter(l => !l.still).map(l => l.wtl).join(' ') + ' }').join(' ') + ' }').join('\n');
    const again = compile(g.operators.map(o => o.wtl).join('\n') + '\n' + rebuilt);
    assert.deepEqual(again.units, ir.units, file + ': the gloss shows exactly the compiled programme');
    assert.ok(!/unreadable/.test(g.text), file + ' reads completely');
  }
});

test('lineage-mode programmes read as their own lineages; a non-programme is refused', async () => {
  const { glossProgram } = await load();
  assert.match(glossProgram(lineage.compile(wrap(['let a = 1;'], false))).text, /a lineage of its own/);
  assert.throws(() => glossProgram({ schema: 'nope' }), /compiled Wyrdrune programme/);
});
