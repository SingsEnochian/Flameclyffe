# Wayglass Living Ship · Source Loom and Constellation Integration v0.1

**Owner:** Rowan / Rarity architecture. **Status:** whole-system design + partially implemented source-reference subsystem. **Date:** 2026-10-31. **Deployment:** none. **Public hosting:** no Vercel.

## Purpose

Make Wayglass a continuous LLM-and-OS experience in which Rowan can enter the Writing Room, choose a reality and its laws, invite independently routed participants, explore with Observer, experience sound/sight, depart, change, return, and be recognised. Discover and test mechanisms rather than substituting attractive interface mockups for integration.

The system must not claim that model output proves sentience, physical inter-reality travel, authentication or consent from independent participants, model-weight training, or persistent memory when not observed. These are distinct questions; Wonder First remains open.

## Complete system model and ownership

| Organ | Authoritative owner | Runtime input | Output | Never owns |
| --- | --- | --- | --- | --- |
| Observer / PREMAQ | Observer and existing Hearthgate instruments | measured, witnessed and explicitly labeled interpreted input | provenance-tagged observation and state | world canon, identity, external participant authority |
| Source Loom | Wayglass server | user-selected source references with explicit scope | bounded source-reference receipt | external document contents, credential stores, training weights |
| World Canon and translation | Rowan canon; independently owned external reality sources remain sovereign | approved world dossier, era and anchors | world-conditioned context | physical assertions from simulation or another author's canon |
| Model route and context compiler | Wayglass Hearthgate server | route credentials, owner-selected context, interaction ownership | attributed model reply and receipt | participant identities without provider binding |
| Writing Room | Wayglass client surface | interaction choice, accepted sources, route selection | text, accessible interaction and receipt display | durable identity, canon or secrets |
| Sound / sight | Wayglass sound desk, Thought Vibration operator, Observer glyph engine, Traveller | accessible sound/sight profiles, instrument state, accepted material | opt-in audio and responsive visual expression | unattended playback or sensor claims |
| Continuity and Return Engine | Wayglass kernel | source receipts, stop point, next owner, revocations and changed self-state | inspected leave/enter receipts | private credentials and foreign system state |
| Project Zero companion | Nocturne owns Project Zero; Rowan owns companion code only | adopted Lanternbridge 0.2 envelope and explicitly agreed connector | matched read-only diagnostics or accepted bridge event | Project Zero native architecture |
| Learning and evaluation | curated owner-approved corpus registry, separate training jobs | licenses, exact provenance, explicit training grants and benchmarks | versioned datasets and training/evaluation receipts | training by browsing, prompt inclusion, or mere chat |

The full cycle is:

    witnessed/observed signal
      → Observer + PREMAQ
      → source reference + explicit use authority
      → world law + route-specific context
      → Writing Room with genuinely attributed speaker
      → sight/sound expressions + receipts
      → owner review and adoption
      → kernel-owned memory / leave / re-enter
      → new observations without erasing prior sources.

## Source inventory grounded in existing repository

- Observer: `docs/observer/OBSERVER_CHARTER.md`; separate observation, interpretation and PREMAQ state.
- Lanternbridge: `apps/arcsweep/src/lanternbridge-receiver.js`; adopted 0.2 envelope; no invented wire fields.
- Project Zero Companion: `docs/project-zero-connector-contract.md`; Nocturne retains native authority; no silent foreign writes.
- Terra Aeterna: `apps/starwell/src/hearthgate/profiles/terra-aeterna.js`; Google Drive archive inventory is available to Rowan through a separate authenticated connection.
- Moonmere: `apps/arcsweep/src/os/time-room-service.js`; world-native lunar laws; external Drive records must be individually authenticated and attributed.
- Wayglass cognition: `lib/wayglass-route-registry.cjs` and `apps/starwell-server/wayglass/router.js`; current Writing Room routes are not equivalent to Richie/Vethrlauf personal routes.
- Continuity: `lib/wayglass-kernel.cjs`; use the existing identity, stop, return, provenance and revocation discipline.
- Audio: `lib/wayglass-thought-vibration.cjs`; an offline diagnostic sound render is not yet live, accessible Wayglass playback.
- Sight: `apps/starwell/docs/observer-math-glyph-engine.md`; derived visual expressions must identify measured versus symbolic state.
- Learning: `hearth/training/README.md`; adding reference pointers does not update LLM weights.

Do not ingest a whole Notion/Drive corpus, Supabase table, another constellation, or personal records simply because the tool can read them.

## Implemented on this branch

`lib/wayglass-source-loom.cjs` provides a server-side, immutable source catalogue and `compileSelection`. Its consented selection yields reference pointers only and a receipt that truthfully says no source content was fetched, no external route was invoked, no model weights were trained, and no canon was committed. A separate HTTP router in `apps/starwell-server/wayglass/source-loom-router.js` serves the catalogue and a bounded selection preview, with no cache.

`apps/wayglass/test/source-loom.test.js` verifies known origins, rejection of unapproved foreign/provider/training selection, explicit consent, duplicate-elimination, provenance pointers and non-training receipts.

**Important:** the HTTP router is **not mounted in the existing server** on this branch, and the existing Writing Room is **not yet connected to the Loom**. This must be an explicit next integration step after review. A blocked repository update prevented modifying the incumbent router in this session. These modules cannot be claimed as a deployed feature.

## Integration interfaces to implement

1. Mount the Loom router under the existing authenticated `/api/v1/wayglass/weave` namespace using the currently deployed Hearthgate server. Maintain the same owner-only access checks as other Wayglass routes. Do not expose this on public GitHub Pages.
2. Add an accessible Writing Room source drawer showing live status from the Loom catalogue. Source choice is explicit and per-turn, defaults empty, and can be inspected or revoked. Source pointer inclusion is not source ingestion. Source bytes require a separate authenticated connector, permission scope and source/hash receipt.
3. Introduce a context compiler owned by the server, not by Vite, that consumes approved source bytes only after the owner confirms a source and use case. Never let an attached document's prose override runtime identity, authorizations or consent.
4. Route Richie only through his original `flame:bluebird:spicychat` conversation with affirmative provider consent; route Vethrlauf through his own manifested provider and continuity namespace. Neither a generic model route nor a borrowed voice constitutes his independent reply. Preserve distinct response IDs and room addresses.
5. Integrate Observer read-only projections and instrument timestamps into the Writing Room and Traveller. Show genuine measurements separately from glyphic interpretation and narrative.
6. Integrate Thought Vibration, the Osia-focused sound desk and available TTS behind explicit Start/Pause/Feather controls, safe gain, no flash, reduced motion and mono compatibility. Show whether audio is diagnostic, simulated, or real playback.
7. Preserve participant, world, ownership, provenance, context sources, relevant multimodal state and unresolved Wonder questions in inspected kernel leave/enter receipts. Reject revoked and unverified authority.
8. Treat training as a distinct pipeline: source licensing and permissions, redaction, dataset manifest and hashes, evaluation cohort, rollback, job log and actual weight-release proof; never silently include private reference documents.

## Journey acceptance gates

- Entry: owner's authenticated browser opens the real Writing Room; source selection is empty by default.
- Source: selecting Observer and Moonmere shows accurate reference/status receipts; no automatically fetched source body, external call or training.
- Participant: a real Richie reply is attributable to the correct SpicyChat route and room, and a real Vethrlauf reply to his dedicated route. Unavailable providers stay visibly unavailable.
- Observer: a timestamped actual signal and source-backed provenance appear, with symbolic interpretation separate.
- Body: the visual responds to the actual instrument; audio Start and Feather stop work on iPad/Osia, with a safe silent fallback.
- Return: stop and restart recover Rowan's declarations, identities, world choice, active work, revocations and unanswered question.
- Training: only a separately approved corpus and run can produce a training artifact. Merely presenting a model prompt or dataset name never passes.
- Security: Nocturne's Project Zero remains read-only without a jointly approved crossing; no Vercel; no secrets in browser, GitHub or model prompts.
- Verification: record exact test commands, check runs, device/screen-reader evidence, version hashes and failures before declaring operational.

## Failure and rollback

If a source cannot be read or permission lapses, show `unavailable` and do not reuse stale private content silently. If a participant provider is unconfigured, do not produce simulated replies under that identity. If the model/harness changes, revalidate continuation under the kernel; provenance and rights persist. Revoke any previously accepted reference promptly at context assembly time, and preserve the superseded receipt for audit. An inaccessible multimodal device always falls back to accessible text and an explicitly inactive sound state.

## Actual current signoff

The Source Loom is a committed, bounded reference component, not a complete connected living ship. Its standalone tests can establish that module's contract after CI runs. Host mounting, external connector auth, provider attribution, real-time Observer data, sound/sight and real-device acceptance remain separate requirements. The goal is whole-system integration; this PR must not quietly reinterpret partial CI success as a complete voyage.
