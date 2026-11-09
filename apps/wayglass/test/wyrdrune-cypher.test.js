import test from 'node:test';
import assert from 'node:assert/strict';
import { animateWyrdruneCypher, readWyrdrune } from '../src/wyrdrune-cypher.js';

function fakeDom() {
  const make = tag => ({ tag, className: '', textContent: '', attrs: {}, children: [],
    setAttribute(k, v) { this.attrs[k] = v; }, append(...c) { this.children.push(...c); }, replaceChildren() { this.children = []; } });
  return { createElement: make, root: make('div') };
}
function fakeClock() {
  let now = 0, id = 0; const q = new Map(); const listeners = new Map();
  return { setTimeout(fn, ms) { q.set(++id, { fn, at: now + ms }); return id; }, clearTimeout(i) { q.delete(i); },
    addEventListener(t, f) { listeners.set(t, f); }, removeEventListener(t) { listeners.delete(t); },
    fire(t, detail) { listeners.get(t)?.({ detail }); }, pending: () => q.size,
    run(limit = 100000) { while (q.size && limit--) { const [i, e] = [...q].sort((a, b) => a[1].at - b[1].at)[0]; q.delete(i); now = e.at; e.fn(); } } };
}
const SRC = 'mobius scoped { perceive { let seen = depth; } compress {} release { set depth = depth + 1; } verify { require depth > seen else "the spiral did not deepen"; } integrate {} choose {} return { emit depth; } transcend { carry depth = depth; } }';
const lines = node => node.children.flatMap(c => (c.children.length ? c.children : [c])).filter(n => n.className.includes('wg-cypher-line'));

test('the cypher decodes every line through runes into the code’s own English', async () => {
  const { root, createElement } = fakeDom(); const clock = fakeClock();
  const run = animateWyrdruneCypher(root, { source: SRC, doc: { createElement }, scope: clock, steps: 6, frameMs: 10 });
  const rows = lines(root);
  assert.equal(rows.length, 8, 'one line per statement, stillness for empty phases');
  assert.ok(rows.every(r => r.attrs.lang === 'zxx'), 'lines begin as Wyrdrune');
  clock.run(3); // part-way: some lines are mid-cypher
  assert.ok(rows.some(r => r.attrs.lang === 'zxx'));
  clock.run();
  const gloss = await run.done;
  assert.ok(rows.every(r => r.attrs.lang === 'en-GB'), 'every line ends in English');
  assert.match(rows.map(r => r.textContent).join('\n'), /Depth becomes depth plus 1\.[\s\S]*Verify insists that depth is more than seen/);
  assert.equal(gloss.model_invoked, false);
  assert.equal(clock.pending(), 0);
});

test('reduced motion and Feather show the English at once and stop all motion', async () => {
  const a = fakeDom(), clock = fakeClock();
  const still = animateWyrdruneCypher(a.root, { source: SRC, doc: a, scope: clock, reducedMotion: true });
  await still.done; assert.ok(lines(a.root).every(r => r.attrs.lang === 'en-GB')); assert.equal(clock.pending(), 0);
  const b = fakeDom(), c2 = fakeClock();
  const moving = animateWyrdruneCypher(b.root, { source: SRC, doc: b, scope: c2, steps: 6, frameMs: 10 });
  c2.run(2); c2.fire('wayglass:feather', { stopped: true });
  await moving.done; assert.ok(lines(b.root).every(r => r.attrs.lang === 'en-GB')); assert.equal(c2.pending(), 0);
});

test('source that does not compile is refused before anything animates', () => {
  const { root, createElement } = fakeDom();
  assert.throws(() => animateWyrdruneCypher(root, { source: 'mobius { perceive {} }', doc: { createElement }, scope: fakeClock() }), SyntaxError);
  assert.equal(root.children.length, 0);
  assert.match(readWyrdrune(SRC).text, /Carry depth across the twist as depth\./);
});
