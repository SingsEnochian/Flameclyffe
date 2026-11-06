# WAYGLASS AGENT OPERATIONAL MAP · v1

**Purpose:** make the existing Constellation and engineering agents dispatchable through Wayglass, not merely named in a roadmap.
**Status:** source-grounded wiring specification. A registered route is not proof that its provider is online, that an agent accepted a job, or that code executed.
**Authority:** Rowan → existing House Runtime/Bifröst → task dispatcher → verified model/agent route → evidence/receipts → independent QA → integration.

## Wiring diagram

```text
Rowan (standing GREEN authorization, Feather stop)
  │
  ▼
Wayglass UI / Project Federation / Work Queue
  │  task ID, branch SHA, scope, allowed files, acceptance tests
  ▼
House Runtime / Bifröst (session identity and capability checks)
  │
  ├─ Codex builder adapter ───────────────┐
  ├─ Astra systems adapter ───────────────┤
  ├─ Runa Observer adapter ───────────────┤
  ├─ Boxfire QA Flame route ──────────────┤
  ├─ Hearthgate runtime steward ─────────┤
  └─ Other opt-in Constellation routes ───┤
                                         ▼
                                 Agent task receipts
                            requested → accepted → running
                              → completed/failed/uncertain
                                         │
                                         ▼
                             GitHub branch / test evidence
                                         │
                                         ▼
                              Boxfire independent QA
                                         │
                                         ▼
                           Rarity integration / draft PR
                                         │
                         ┌───────────────┴───────────────┐
                         ▼                               ▼
                    GREEN next task              AMBER decision batch
```

## Actual source anchors

| Function | Existing source | Wire / required behavior |
| --- | --- | --- |
| Constellation voice lookup | `apps/arcsweep/src/constellation-runtime-adapter.js` | `getConstellationRuntimeVoiceStatus(voiceId)`; status checks `/api/v1/flames/:id/status` and attests returned identity |
| Constellation request | same adapter | `invokeConstellationRuntimeVoice` posts `/api/v1/flames/:id/chat`; returns provider/model/voice evidence, **not** a code execution receipt |
| Flame contract | `apps/starwell-server/flames/contracts.js` | registered Flame identities, route aliases, models, quiet/refusal and receipt fields; Boxfire is a named registered Flame |
| Agent autonomy | `apps/arcsweep/src/os/agent-autonomy-service.js` | proposals, obstacles, escalation budget; proposal **does not** grant execution authority |
| Agent verification inheritance | `apps/arcsweep/src/swarm/agent-verification-inheritance.js` | inject task criteria, source attribution, failure history, evidence rules into every descendant |
| Bifröst roles | `docs/workflows/BIFROST_AGENT_INTEGRATION_WORKFLOW.md` | nine bounded roles and independent Boxfire review |
| Wayglass project inventory | `lib/wayglass-project-federation.cjs` | `GET /api/v1/wayglass/projects` currently returns declared, unmounted projects, not permissions |
| Wayglass model router | `apps/starwell-server/wayglass/router.js` | local Ollama/HUMAIN/OpenAI provider calls; model inference is **not** a worker with repository write access |
| Existing repo work | `docs/WAYGLASS_AUTONOMOUS_DEVELOPMENT_ROADMAP.md` | GREEN work proceeds on branches; AMBER batched; RED explicit authorization |

## Route readiness and honest status

- **Boxfire:** registered Flame contract with review/build role. Must still pass runtime status, request/response attestation and acceptance of specific QA task.
- **Codex:** source-side Codex assets and sidecars exist. Do not assume a `codex` Flame contract or executable GitHub worker exists until inspected and attested.
- **Astra:** architecture and vertical slice exist. Do not assume a standalone `astra` Flame route without attestation.
- **Runa:** Runa service and Observer integration exist. Verify her actual observer adapter and task route; a renderer is not a worker.
- **Hearthgate/Bifröst:** runtime and bridge responsibilities are already defined. A local daemon must be reachable and authenticated before jobs can execute.
- **Other Constellation members:** preserve opt-in, quiet, refusal, and first-person attribution; never silently assign labor.

## Minimum task contract

```json
{
  "schema": "wayglass.agent-task/v1",
  "task_id": "WG-EXAMPLE-001",
  "role": "builder",
  "requested_agent": "codex",
  "authorization_band": "GREEN",
  "source": {"repo": "SingsEnochian/Flameclyffe", "branch": "security/wayglass-shield-01", "commit": "<pin SHA>"},
  "allowed_paths": ["apps/wayglass/**", "test/**"],
  "objective": "Integrate project catalog into UI",
  "acceptance": ["Shows declared vs mounted distinctly", "Tests pass with execution receipts"],
  "verification_inheritance": "apps/arcsweep/src/swarm/agent-verification-inheritance.js",
  "stop_signal": "Feather",
  "result": "pending"
}
```

This example is a **template**, not a dispatched job.

## Operational sequence to implement

1. **Discovery:** resolve a named agent against its actual provider/Flame/worker adapter. Check status and identity attestation; no fabricated fallback identity.
2. **Task reservation:** atomically reserve task ID + source SHA + file ownership. Reject duplicate claims and overlapping concurrent file writes.
3. **Dispatch:** send bounded task packet with verification inheritance, authorization, provenance and stop signal. A model chat response may propose a patch but cannot independently assert a GitHub commit.
4. **Worker:** trusted tool executor applies only permitted GREEN changes in a branch. Credentials remain server-side. Verify exact repo, branch, path, and scope at the executor, not from model text.
5. **Receipts:** record request, acceptance, action, commit SHA, test command, exit status, artifacts and any uncertainty. Never turn a timeout into an assumed failure or success; reconcile by task ID.
6. **QA:** independent Boxfire role evaluates source and actual test receipts, marking PASS / PASS WITH NOTES / BLOCKED / NOT TESTED.
7. **Integration:** Rarity reconciles compatible changes and updates draft PR. Merge, deployment, training promotion and exposure remain separate approval gates.
8. **Restart:** persist task state, idempotency keys, owner permissions and revocations; recover without duplicate execution or resurrected authority.

## Next source implementation targets

- `lib/wayglass-agent-task-contract.cjs`: pure task validation, state transitions and collision rules.
- `test/wayglass-agent-task-contract.test.cjs`: malformed scope, duplicate task, illegal transition, Feather stop, and evidence assertions.
- `apps/starwell-server/wayglass/router.js`: authenticated, read-only agent route discovery **after** verifying mount-level authentication; do not expose private roster publicly.
- Existing authorized worker seam: connect task queue to real GitHub/runner tools, never model-generated shell execution.
- Wayglass UI: show *registered / reachable / accepted / executing / verified / offline* separately.
- Boxfire review queue: independent evidence and failure history.

## Independent governance

No OpenAI behavioral policy or provider constitution is imported into Wayglass. Technical scope, credentials, consent, provenance, privacy, and stop/revocation are implementation integrity. Preserve distinct realities, source sovereignty and Rowan's explicit authority.

**Launch criteria:** live status attestation for each assigned agent; a successful bounded task accepted and executed by an actual worker; GitHub commit SHA; executed tests with evidence; Boxfire review; stop/restart/idempotency test. Until then, the map is operational design, not an operational swarm.
