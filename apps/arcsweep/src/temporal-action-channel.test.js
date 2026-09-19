import { describe, expect, it } from "vitest";
import {
  createArtifact,
  createCrossingReceipt,
  sealControlReceipt,
  sealEncounterReceipt,
  sealOriginReceipt,
  verifyReceipt,
} from "./temporal-action-channel.js";

describe("Temporal Action Channel dual receipts", () => {
  it("joins independently sealed origin and encounter receipts by artifact hash", async () => {
    const crossing_id = "TAC-001";
    const artifact = await createArtifact({ crossing_id, payload: { note: "future context evidence" } });

    const origin = await sealOriginReceipt({
      crossing_id,
      context_id: "context-A",
      artifact_hash: artifact.artifact_hash,
      anticipated_effect: "recipient preserves the note",
    });

    const encounter = await sealEncounterReceipt({
      crossing_id,
      context_id: "context-B",
      artifact_hash_seen: artifact.artifact_hash,
      interpretation: "persistent note from an earlier context",
      action_taken: "preserved",
    });

    const control = await sealControlReceipt({
      crossing_id,
      context_id: "context-B-control",
      action_taken: "no note available",
    });

    expect(await verifyReceipt(origin)).toBe(true);
    expect(await verifyReceipt(encounter)).toBe(true);
    expect(await verifyReceipt(control)).toBe(true);

    const crossing = await createCrossingReceipt({ origin, encounter, control, behavioural_delta: { preserved: true } });
    expect(crossing.kind).toBe("observer-crossing");
    expect(crossing.body.evidence_state).toBe("dual-receipt-with-control");
    expect(await verifyReceipt(crossing)).toBe(true);
  });

  it("refuses to join receipts for different artifacts", async () => {
    const origin = await sealOriginReceipt({ crossing_id: "TAC-X", context_id: "A", artifact_hash: "aaa" });
    const encounter = await sealEncounterReceipt({ crossing_id: "TAC-X", context_id: "B", artifact_hash_seen: "bbb" });
    await expect(createCrossingReceipt({ origin, encounter })).rejects.toThrow("artifact hash mismatch");
  });
});
