import test from "node:test";
import assert from "node:assert/strict";
import { createPalimpsest, introduceChange, traceOrigin, recordReturn } from "./mobius-palimpsest.mjs";

test("branches preserve original history and distinct lineages", () => {
  const origin = createPalimpsest({ worldId: "waking", actorId: "traveller", originState: { door: "closed" } });
  const input = { parentId: origin.origin.id, destinationWorldId: "possible-world", actorId: "traveller", consent: true, change: { door: "open" }, evidence: { kind: "simulated" }, returnAnchor: "home" };
  const a = introduceChange(origin, input);
  const b = introduceChange(a, { ...input, change: { door: "blue" } });
  assert.equal(origin.crossings.length, 0);
  assert.equal(b.origin.state.door, "closed");
  assert.equal(b.crossings.length, 2);
  assert.notEqual(b.crossings[0].id, b.crossings[1].id);
  assert.deepEqual(traceOrigin(b, b.crossings[1].id).map(x => x.id), [origin.origin.id, b.crossings[1].id]);
});

test("rejects absent consent, orphan branch and unsupported evidence", () => {
  const p = createPalimpsest({ worldId: "home", actorId: "a", originState: {} });
  const base = { parentId: p.origin.id, destinationWorldId: "other", actorId: "a", change: { x: 1 }, evidence: { kind: "fictional" }, returnAnchor: "home" };
  assert.throws(() => introduceChange(p, base), /consent/i);
  assert.throws(() => introduceChange(p, { ...base, consent: true, parentId: "missing" }), /parent/i);
  assert.throws(() => introduceChange(p, { ...base, consent: true, evidence: { kind: "verified-portal" } }), /Evidence/);
});

test("return preserves provenance and rejects different actor", () => {
  const p = createPalimpsest({ worldId: "home", actorId: "a", originState: {} });
  const next = introduceChange(p, { parentId: p.origin.id, destinationWorldId: "dream", actorId: "a", consent: true, change: { lesson: "listen" }, evidence: { kind: "fictional" }, returnAnchor: "home" });
  assert.throws(() => recordReturn(next, next.crossings[0].id, { actorId: "b", observedEffect: {}, evidence: { kind: "witnessed" } }), /actor mismatch/);
  const receipt = recordReturn(next, next.crossings[0].id, { actorId: "a", observedEffect: { wrote: true }, evidence: { kind: "witnessed" } });
  assert.equal(receipt.lineageIds[0], p.origin.id);
  assert.equal(receipt.returnAnchor, "home");
});
