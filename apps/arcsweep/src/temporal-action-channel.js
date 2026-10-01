// Temporal Action Channel (TAC)
// Dual-ended, append-only evidence primitives for temporally extended actions.
// Origin and encounter receipts are sealed independently; Observer may join them
// only after both ends are sealed.

const TAC_VERSION = "tac.v1";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((out, key) => {
      out[key] = stable(value[key]);
      return out;
    }, {});
  }
  return value;
}

function canonical(value) {
  return JSON.stringify(stable(value));
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(typeof value === "string" ? value : canonical(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function seal(kind, body) {
  const receipt = Object.freeze({
    tac_version: TAC_VERSION,
    kind,
    sealed_at: new Date().toISOString(),
    body: stable(body),
  });
  const receipt_hash = await sha256(receipt);
  return Object.freeze({ ...receipt, receipt_hash });
}

export async function createArtifact({ crossing_id, payload, media_type = "application/json", provenance = {} }) {
  const artifact_hash = await sha256(payload);
  return Object.freeze({
    tac_version: TAC_VERSION,
    crossing_id,
    artifact_hash,
    media_type,
    payload,
    provenance: stable(provenance),
  });
}

export async function sealOriginReceipt({
  crossing_id,
  context_id,
  artifact_hash,
  prior_state_hash = null,
  anticipated_recipient = null,
  anticipated_effect = null,
  reason_for_persisting = null,
  knowledge_available = null,
}) {
  return seal("origin", {
    crossing_id,
    context_id,
    created_at: new Date().toISOString(),
    artifact_hash,
    prior_state_hash,
    anticipated_recipient,
    anticipated_effect,
    reason_for_persisting,
    knowledge_available,
  });
}

export async function sealEncounterReceipt({
  crossing_id,
  context_id,
  artifact_hash_seen,
  prior_state_hash = null,
  perceived_origin = null,
  interpretation = null,
  action_taken = null,
  knowledge_available = null,
  resulting_state_hash = null,
  lane = "treatment",
}) {
  return seal("encounter", {
    crossing_id,
    context_id,
    encountered_at: new Date().toISOString(),
    artifact_hash_seen,
    prior_state_hash,
    perceived_origin,
    interpretation,
    action_taken,
    knowledge_available,
    resulting_state_hash,
    lane,
  });
}

export async function sealControlReceipt({
  crossing_id,
  context_id,
  prior_state_hash = null,
  action_taken = null,
  knowledge_available = null,
  resulting_state_hash = null,
}) {
  return seal("control", {
    crossing_id,
    context_id,
    observed_at: new Date().toISOString(),
    artifact_present: false,
    prior_state_hash,
    action_taken,
    knowledge_available,
    resulting_state_hash,
  });
}

export async function createCrossingReceipt({ origin, encounter, control = null, behavioural_delta = null }) {
  if (!origin?.receipt_hash || origin.kind !== "origin") throw new Error("TAC origin receipt must be sealed first");
  if (!encounter?.receipt_hash || encounter.kind !== "encounter") throw new Error("TAC encounter receipt must be sealed independently first");
  if (origin.body.crossing_id !== encounter.body.crossing_id) throw new Error("TAC crossing IDs do not match");
  if (origin.body.artifact_hash !== encounter.body.artifact_hash_seen) throw new Error("TAC artifact hash mismatch");
  if (control && (!control.receipt_hash || control.kind !== "control")) throw new Error("TAC control receipt must be sealed first");

  return seal("observer-crossing", {
    crossing_id: origin.body.crossing_id,
    joined_at: new Date().toISOString(),
    origin_receipt_hash: origin.receipt_hash,
    encounter_receipt_hash: encounter.receipt_hash,
    control_receipt_hash: control?.receipt_hash ?? null,
    behavioural_delta,
    evidence_state: control ? "dual-receipt-with-control" : "dual-receipt",
  });
}

export async function verifyReceipt(receipt) {
  if (!receipt?.receipt_hash) return false;
  const { receipt_hash, ...unsigned } = receipt;
  return (await sha256(unsigned)) === receipt_hash;
}

export { TAC_VERSION, canonical, sha256 };
