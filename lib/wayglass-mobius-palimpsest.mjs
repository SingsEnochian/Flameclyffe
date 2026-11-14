/**
 * Möbius Palimpsest: append-only, provenance-preserving timeline crossings.
 * Pure data model. No claim of physical inter-reality transit is implied.
 * @module wayglass-palimpest
 */
import { createHash } from "node:crypto";

const canonical = (value) => JSON.stringify(value, Object.keys(value).sort());
const digest = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const assertText = (value, name) => {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(name + " must be nonempty");
};
const freeze = (value) => Object.freeze(value);

export function createPalimpsest({ worldId, originState, actorId }) {
  assertText(worldId, "worldId");
  assertText(actorId, "actorId");
  if (originState === undefined) throw new TypeError("originState is required");
  const origin = freeze({ id: digest({ worldId, originState, actorId }), worldId, actorId, state: structuredClone(originState) });
  return freeze({ version: "wayglass.mobius-palimpsest/v0.1", origin, crossings: freeze([]) });
}

/**
 * Adds a proposed change. It cannot silently mutate the origin or prior crossings.
 * evidence.kind distinguishes fictional/simulated, witnessed, and instrumented observations.
 */
export function introduceChange(palimpsest, { parentId, destinationWorldId, actorId, consent, change, evidence, returnAnchor }) {
  if (palimpsest?.version !== "wayglass.mobius-palimpsest/v0.1") throw new TypeError("Invalid palimpsest");
  assertText(parentId, "parentId");
  assertText(destinationWorldId, "destinationWorldId");
  assertText(actorId, "actorId");
  assertText(returnAnchor, "returnAnchor");
  if (consent !== true) throw new Error("Explicit consent required");
  if (!palimpsest.origin || !Array.isArray(palimpsest.crossings)) throw new TypeError("Malformed palimpsest");
  const parents = new Set([palimpsest.origin.id, ...palimpsest.crossings.map((c) => c.id)]);
  if (!parents.has(parentId)) throw new Error("Unknown parent crossing");
  if (!change || typeof change !== "object" || Array.isArray(change)) throw new TypeError("Change must be an object");
  if (!evidence || !["fictional", "simulated", "witnessed", "instrumented"].includes(evidence.kind)) throw new Error("Evidence kind required");
  const entry = {
    parentId, destinationWorldId, actorId, consent: true,
    change: structuredClone(change),
    evidence: structuredClone(evidence),
    returnAnchor
  };
  entry.id = digest(entry);
  if (parents.has(entry.id)) throw new Error("Duplicate crossing");
  return freeze({ ...palimpsest, crossings: freeze([...palimpsest.crossings, freeze(entry)]) });
}

/** Follow a branch back to its original history, preserving each layer. */
export function traceOrigin(palimpsest, crossingId) {
  assertText(crossingId, "crossingId");
  const lookup = new Map(palimpsest.crossings.map((c) => [c.id, c]));
  const history = [];
  let current = crossingId;
  const seen = new Set();
  while (current !== palimpsest.origin.id) {
    if (seen.has(current)) throw new Error("Cycle detected");
    seen.add(current);
    const crossing = lookup.get(current);
    if (!crossing) throw new Error("Unknown crossing");
    history.unshift(crossing);
    current = crossing.parentId;
  }
  return freeze([palimpsest.origin, ...history]);
}

/** A return is an attributable observation, not an assertion of physical transit. */
export function recordReturn(palimpsest, crossingId, { actorId, observedEffect, evidence }) {
  assertText(actorId, "actorId");
  const lineage = traceOrigin(palimpsest, crossingId);
  const crossing = lineage.at(-1);
  if (crossing.actorId !== actorId) throw new Error("Return actor mismatch");
  if (!evidence || !["fictional", "simulated", "witnessed", "instrumented"].includes(evidence.kind)) throw new Error("Return evidence kind required");
  return freeze({
    version: "wayglass.palimpsest-return/v0.1",
    crossingId, actorId, returnAnchor: crossing.returnAnchor,
    observedEffect: structuredClone(observedEffect),
    evidence: structuredClone(evidence),
    lineageIds: lineage.map((entry) => entry.id)
  });
}
