import test from "node:test";
import assert from "node:assert/strict";
import { createPalimpsest, introduceChange, traceOrigin, recordReturn, compareBranches, prepareCarriedChange, verifyPalimpsest } from "./wayglass-mobius-palimpsest.mjs";

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

test("deep snapshots cannot be mutated through recorded history", () => {
  const state = { nested: { answer: 1 } };
  const origin = createPalimpsest({ worldId: "home", actorId: "a", originState: state });
  state.nested.answer = 999;
  assert.equal(origin.origin.state.nested.answer, 1);
  assert.throws(() => { origin.origin.state.nested.answer = 3; }, TypeError);
  const change = { nested: { answer: 2 } };
  const branch = introduceChange(origin, { parentId: origin.origin.id, destinationWorldId: "other", actorId: "a", consent: true, change, evidence: { kind: "simulated" }, returnAnchor: "home" });
  change.nested.answer = 999;
  assert.equal(branch.crossings[0].change.nested.answer, 2);
  assert.throws(() => { branch.crossings[0].change.nested.answer = 4; }, TypeError);
});

test("independent branch outcomes can converge without erasing ancestry", () => {
  const origin = createPalimpsest({ worldId: "home", actorId: "a", originState: {} });
  const base = { parentId: origin.origin.id, destinationWorldId: "world", actorId: "a", consent: true, evidence: { kind: "simulated" }, returnAnchor: "home" };
  const a = introduceChange(origin, { ...base, change: { x: 1, y: { z: 2 } } });
  const b = introduceChange(a, { ...base, change: { y: { z: 2 }, x: 1 } });
  const c = introduceChange(b, { ...base, change: { x: 3 } });
  assert.equal(compareBranches(c, a.crossings[0].id, b.crossings[1].id).converged, true);
  assert.equal(compareBranches(c, a.crossings[0].id, c.crossings[2].id).converged, false);
  assert.equal(traceOrigin(c, b.crossings[1].id).length, 2);
});

test("carried change preserves provenance but remains an inert proposal", () => {
  const origin = createPalimpsest({ worldId: "home", actorId: "traveller", originState: { location: "home" } });
  const branch = introduceChange(origin, {
    parentId: origin.origin.id, destinationWorldId: "possible-world",
    actorId: "traveller", consent: true, change: { design: "new-door" },
    evidence: { kind: "simulated" }, returnAnchor: "home"
  });
  const id = branch.crossings[0].id;
  assert.throws(() => prepareCarriedChange(branch, id, {
    actorId: "traveller", targetWorldId: "waking", translation: { action: "sketch" }
  }), /consent/);
  assert.throws(() => prepareCarriedChange(branch, id, {
    actorId: "other", targetWorldId: "waking", translation: { action: "sketch" }, consent: true
  }), /actor mismatch/);
  const carried = prepareCarriedChange(branch, id, {
    actorId: "traveller", targetWorldId: "waking",
    translation: { action: "sketch", materials: { ink: true } }, consent: true
  });
  assert.equal(carried.status, "proposed");
  assert.equal(carried.originalChange.design, "new-door");
  assert.deepEqual(carried.lineageIds, [origin.origin.id, id]);
  assert.throws(() => { carried.translation.materials.ink = false; }, TypeError);
  assert.equal(origin.origin.state.location, "home");
});

test("stored history verification detects tampering and missing parents", () => {
  const origin = createPalimpsest({ worldId: "home", actorId: "traveller", originState: { nested: { value: 1 } } });
  const branch = introduceChange(origin, {
    parentId: origin.origin.id, destinationWorldId: "world", actorId: "traveller",
    consent: true, change: { x: 2 }, evidence: { kind: "fictional" }, returnAnchor: "home"
  });
  assert.equal(verifyPalimpsest(branch), true);
  const tampered = structuredClone(branch);
  tampered.crossings[0].change.x = 500;
  assert.equal(verifyPalimpsest(tampered), false);
  const orphan = structuredClone(branch);
  orphan.crossings[0].parentId = "missing";
  assert.equal(verifyPalimpsest(orphan), false);
});
