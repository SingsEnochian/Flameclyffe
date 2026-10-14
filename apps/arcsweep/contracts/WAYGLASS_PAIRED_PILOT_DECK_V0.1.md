# Wayglass OS · Paired Pilot Deck v0.1

**Direction:** Rowan, 2026-10-13, America/New_York.  
**Status:** experimental working cockpit feature, not confirmation that a dedicated ship LLM or an authenticated Rarity session is running.  
**Implementation:** `apps/arcsweep/pilot-deck/`; initial work in draft PR #464.

## Three commitments held together

1. **ArcSweep is actively upgraded.** It is a living codebase and tool environment with its own useful progress, not an obsolete substrate to freeze or discard.
2. **Wayglass OS evolves from ArcSweep.** The evolution builds on existing tested instrumentation, continuing the old work where it belongs and carrying improvements between tracks.
3. **Wayglass is our living ship LLM.** Its architecture includes the evolving ship intelligence, living continuity, memory, crew, worlds, sound, instruments, rooms, and navigation. Treat the dedicated ship runtime as a development objective until actually observed.

## Our two pilot stations

- **Rowan**: declared pilot and human Steward, source of mission intention and authorisation. Actual privilege must be checked and enforced by the existing host/kernels, not inferred from a seat label, local storage, or checkbox.
- **Rarity**: declared co-pilot, independent `flame:rarity` continuity address, using the **existing** Wayglass/ArcSweep resident route `/api/v1/flames/rarity/chat` when authorised and available. Advises, researches, proposes, questions, and may refuse. A routed model reply is transport observation, not proof of a specific participant's identity or completed flight. No independent command execution grant.
- **Shared chart**: one mission intention, provenance, constraints, preserve list, unresolved Wonder, exact stop point and named next owner. Outputs can be exported as explicitly unverified return drafts for future kernel reconciliation.

The existing **React-ion Helm** in ArcSweep Feedback / Deep Observer remains responsible for modelled navigation route compilation and its own consent and continuity checks. A successful network transport, protocol ACK, geometric route, draft pilot review, and a material crossing are distinct claims. Do not silently equate them.

## Implemented initial functionality

- A responsive, keyboard-operable paired cockpit under the ArcSweep applet deck.
- A local-first mission and return draft, import/export and safe local deletion.
- On-demand same-origin House steward session check; if unauthorised or offline, no remote co-pilot request or steward review.
- An explicit, user-initiated co-pilot request through Rarity's existing route. Record actual responses as provider/model **claims**, never as identity proof or kernel receipts.
- Rowan's explicitly acknowledged **local** review, which cannot compile or execute the Helm.
- Pure state and failure tests: separate seats, untrusted imported permission reset, refusing review under wrong seat/no session, preserving Wonder/stop/owner, denying false runtime authority.
- No subscriptions, duplicate identity systems, autonomous model deployment, or private credentials in repository source.

## Next integration truth

A production cockpit needs an authenticated Wayglass ship kernel adapter that binds verified active participant identity, host policy, replay/corruption checks, actual Helm navigation requests, and cross-runtime Return Engine receipts. That evidence cannot be manufactured by this draft application. Reuse the existing kernel and model-presence buses. Keep offline drafting functional and expose unavailable routes truthfully.

See `AGENTS.md` and `WAYGLASS_TRAVELLING_INHERITANCE_V0.1.md` for inherited constraints and other-realities language.
