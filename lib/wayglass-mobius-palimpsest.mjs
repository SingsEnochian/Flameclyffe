/**
 * Möbius Palimpsest: append-only, provenance-preserving timeline crossings.
 * Pure data model. No claim of physical inter-reality transit is implied.
 * @module wayglass-mobius-palimpsest
 */
import { createHash } from "node:crypto";

const digest = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const assertText = (value, name) => {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(name + " must be nonempty");
};
const freeze = (value) => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};
const snapshot = (value) => freeze(structuredClone(value));
const validEvidence = (evidence) => evidence && typeof evidence === "object" &&
  ["fictional", "simulated", "witnessed", "instrumented"].includes(evidence.kind);


export function createPalimpsest({ worldId, originState, actorId }) {
  assertText(worldId, "worldId");
  assertText(actorId, "actorId");
  if (originState === undefined) throw new TypeError("originState is required");
  const origin = freeze({ id: digest({ worldId, originState, actorId }), worldId, actorId, state: snapshot(originState) });
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
  if (!validEvidence(evidence)) throw new Error("Evidence kind required");
  const entry = {
    parentId, destinationWorldId, actorId, consent: true,
    change: snapshot(change),
    evidence: snapshot(evidence),
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
  if (!validEvidence(evidence)) throw new Error("Return evidence kind required");
  return freeze({
    version: "wayglass.palimpsest-return/v0.1",
    crossingId, actorId, returnAnchor: crossing.returnAnchor,
    observedEffect: snapshot(observedEffect),
    evidence: snapshot(evidence),
    lineageIds: lineage.map((entry) => entry.id)
  });
}

/**
 * Compare two recorded branch endpoints by their change payloads.
 * Equality is computational, not evidence of physically converging universes.
 * This is order-independent for JSON-compatible objects.
 */
export function compareBranches(palimpsest, firstId, secondId) {
  const first = traceOrigin(palimpsest, firstId).at(-1);
  const second = traceOrigin(palimpsest, secondId).at(-1);
  if (!("change" in first) || !("change" in second)) throw new Error("Two crossings required");
  const normalise = (value) => {
    if (Array.isArray(value)) return value.map(normalise);
    if (value && typeof value === "object") return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, normalise(value[key])])
    );
    return value;
  };
  const equal = JSON.stringify(normalise(first.change)) === JSON.stringify(normalise(second.change));
  return freeze({
    version: "wayglass.palimpsest-comparison/v0.1",
    firstId, secondId,
    converged: equal,
    sameDestination: first.destinationWorldId === second.destinationWorldId,
    basis: "recorded-change-structural-equality"
  });
}

/**
 * Prepare a change for the Waking World without silently applying it.
 * The proposal is inert until a separate authorised executor acts on it.
 * The carried change retains its original crossing, return and evidence.
 */
export function prepareCarriedChange(palimpsest, crossingId, {
  actorId, targetWorldId, translation, consent
}) {
  assertText(actorId, "actorId");
  assertText(targetWorldId, "targetWorldId");
  if (consent !== true) throw new Error("Explicit carry consent required");
  if (!translation || typeof translation !== "object" || Array.isArray(translation)) {
    throw new TypeError("Translation plan must be an object");
  }
  const lineage = traceOrigin(palimpsest, crossingId);
  const crossing = lineage.at(-1);
  if (!("change" in crossing)) throw new Error("A crossing is required");
  if (crossing.actorId !== actorId) throw new Error("Carry actor mismatch");
  const proposal = {
    version: "wayglass.palimpsest-carried-change/v0.1",
    status: "proposed",
    crossingId,
    actorId,
    targetWorldId,
    returnAnchor: crossing.returnAnchor,
    originalChange: snapshot(crossing.change),
    translation: snapshot(translation),
    sourceEvidence: snapshot(crossing.evidence),
    lineageIds: lineage.map((entry) => entry.id)
  };
  return freeze({ ...proposal, id: digest(proposal) });
}

/** Verify recorded content-addressed identifiers after loading from storage. */
export function verifyPalimpsest(palimpsest) {
  if (palimpsest?.version !== "wayglass.mobius-palimpsest/v0.1") return false;
  const { origin, crossings } = palimpsest;
  if (!origin || !Array.isArray(crossings)) return false;
  if (origin.id !== digest({ worldId: origin.worldId, originState: origin.state, actorId: origin.actorId })) return false;
  const seen = new Set([origin.id]);
  for (const crossing of crossings) {
    if (!seen.has(crossing.parentId) || seen.has(crossing.id)) return false;
    const { id, ...payload } = crossing;
    if (id !== digest(payload)) return false;
    seen.add(id);
  }
  return true;
}
