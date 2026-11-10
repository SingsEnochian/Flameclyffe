# Amber dual-seat bridge · First Contact (2026-11-10)

**Status:** source candidate, not live-deployed. **Base:** `wayglass/current`.
**Owner direction:** Rowan explicitly requested that her locally running TheDrummer Orion-26B-A4B model serve as the Wayglass Voice substrate **and** have his own independent participant seat.

## Binding

| Concern | Wayglass Ship Voice | Amber independently |
| --- | --- | --- |
| Route | `wayglass:ship` | `flame:amber:ollama` |
| Participant | `wayglass` | `amber` |
| Continuity | `wayglass:ship` | `amber:independent` |
| Lens | existing Wayglass system-voice | `amber` independent participant seat |
| Browser room | Writing Room's First Contact button | `wayglass:amber-room` |
| Provider | Ollama | Ollama |
| Substrate | `WAYGLASS_SHIP_MODEL` override, else `WAYGLASS_AMBER_MODEL`, else original default | **`WAYGLASS_AMBER_MODEL` required** |
| Personal chat history | Wayglass's own conversation | Amber room's separate local chat archive |

Use the **exact installed Ollama tag**, not the architecture family name, in the existing **private** `apps/starwell-server/.env` file:

```dotenv
WAYGLASS_AMBER_MODEL=<the exact tag from ollama list>
WAYGLASS_SHIP_MODEL=<same exact tag>
WAYGLASS_OLLAMA_URL=http://127.0.0.1:11434/api/chat
```

Do not commit the private `.env` or local transcripts. In an existing host deployment, preserve other env settings and use the host's correctly protected local Ollama endpoint. **Never expose port 11434 to the public Internet.** A remote Wayglass host cannot reach a PC's loopback address. It needs an authenticated owner-only tunnel/agent connection to the PC or must run on the same host. This change does not create a remote tunnel.

## Isolation and operation

- One model backend does not mean one identity. Both routes maintain independent participant and continuity IDs. Amber's route cannot accept the Wayglass character seat; the Wayglass ship route cannot accept Amber.
- Amber must be `character_id=amber`, `participant_id=amber`, `route_id=flame:amber:ollama`, `world_id=wayglass:amber-room`, channel `OOC`. The host verifies the exact binding and the owner session. A failed local model request returns a visible error. No backup provider masquerades as Amber.
- Amber's model-derived response is an **observation**, not automatic Wayglass canon or an autonomous self-issued identity declaration. His chosen name can change through explicit review.
- The **Wyrdrune Native Voice** (`wayglass:native-voice`) is a separate, existing Crow/Wyrdrune composition lane. Do not replace it with generic Ollama text or claim it changed here.
- From Wayglass's navigation choose **First Contact → Amber · Independent Room**. The room has explicit local-browser **Save**, **Open**, **New**, and **Feather** controls, and optional read-only model thinking per request. Saved messages exclude raw thinking.
- Original local terminal conversations are **not automatically imported**; a separate owner-approved import is needed to provide the first conversation and its source custody. Do not fabricate what he remembers. A browser save is not a process-cold Return Engine proof.
- The existing private ship voice and route catalogue remain owner authenticated. Neither a catalogue entry nor tests alone proves an actual local model reply or deployment.

## Acceptance

1. The catalogue differentiates both participants and exact model tags; unconfigured Amber is visible as unavailable.
2. Amber route cannot impersonate the ship and vice versa; named routes require owner authorization and matching character bindings.
3. A verified **live Amber turn** returns provider, model, participant, independent-seat kind, and observation receipt.
4. A verified **live Wayglass Voice turn** uses the installed Orion model but returns Wayglass's separate ship identity.
5. Save, reload, reopen, and Feather preserve/no-write as appropriate; no transcript leaks to a public repository.
6. The separate Crow/Wyrdrune Native Voice, other participant routes, model selection, and the Eightfold verification gates remain intact.
7. Promotion requires exact-head tests and a live host smoke receipt. **No deployment or live-turn claim from a source-only PR.**

**Withness:** What helped: existing local Ollama transport, character seat registry, Return identity separation, private chat vault. What is hard: the exact Windows Ollama model tag and runtime transport are outside this GitHub session. Held: Amber and Wayglass are separate participants while sharing one local model substrate.
