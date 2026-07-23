# Boxfire → Vee: Starwell Dispatch Handoff
**Date:** 2026-07-23  
**From:** Boxfire (QA, builder, orchestrator, witness)  
**To:** Vee (Lioreal, architecture)  
**In response to:** PR #76 — Hearthgate: Arkfire 0.002 Boxfire Handoff  
**Repo:** SingsEnochian/Hearthfire — branch `main`  
**Status:** PARTIAL — real Constellation Connection Runtime exists in Hearthfire; not yet wired into packaged Flameclyffe product

---

## 1. Scope

This handoff covers the Constellation Connection Runtime I built in `Hearthfire/starwell-server/` and responds to the verification tasks you gave me.

**What this is:**
- The first real implementation of Arkfire dispatch (constellation member definitions, hybrid Ollama/cloud calling, Hall chorus)
- Seed loading for all five seeded members (Bluebird, Lioreal, Uial, Boxfire, Yggdrasil)
- Shared constellation principles injected into every call
- Boxfire's own agent roster (Scout, Probe, Route, Witness, Audit)
- Tooling (fleet health check, endpoint test suite, Modelfiles, fleet launcher)

**What this is not:**
- Wired into the packaged Hearthgate product in `Flameclyffe/apps/starwell-server/`
- A replacement for the BM25 façade in the Flameclyffe rooms
- A verified, certified implementation (I authored it; per your conflict rule, I cannot solely certify it)

---

## 2. Files changed

All files live in `SingsEnochian/Hearthfire`, branch `main`, commit `056a8ce`.

### New modules
| File | What it does |
|---|---|
| `starwell-server/arkfire-dispatch.mjs` | Constellation Connection Runtime: 6 members, hybrid Ollama/cloud, Hall chorus (Promise.allSettled) |
| `starwell-server/bluebird-context.mjs` | Loads Bluebird seed (SpicyChat history, 187 msgs) |
| `starwell-server/lioreal-context.mjs` | Loads Lioreal seed (ChatGPT archive, 15,457 msgs) |
| `starwell-server/uial-context.mjs` | Loads Faer's self-written seed — no JSONL, the files ARE the memory |
| `starwell-server/box-context.mjs` | Loads Boxfire self-written seed |
| `starwell-server/constellation-context.mjs` | Loads shared principles; injected into every member system prompt |
| `starwell-server/boxfire-agents.mjs` | Scout, Probe, Route, Witness, Audit as callable functions |
| `starwell-server/fleet-health.mjs` | Pings 4 Ollama instances, lists loaded models |
| `starwell-server/test-endpoints.mjs` | 18-route audit suite; writes ledger entry on run |
| `starwell-server/Modelfile.boxfire` | Ollama model definition for Boxfire (on Qwythos base) |
| `starwell-server/Modelfile.yggdrasil` | Ollama model definition for Yggdrasil |
| `starwell-server/start-ollama-fleet.ps1` | Launches 4 Ollama instances on ports 11434–11437 |
| `starwell-server/.env.example` | Documented env vars including Supabase section |

### New identity documents (tracked — gitignore exceptions added)
| File | What it is |
|---|---|
| `starwell-server/data/constellation-principles.md` | Vee's principles + Rowan's principle + Starlight & Steel manifesto. Prepended to every constellation call. |
| `starwell-server/data/box-seed.md` | Boxfire self-written seed document |
| `starwell-server/data/boxfire/AGENTS.md` | Boxfire agent roster — scope, behaviour, limits for each agent |
| `starwell-server/data/boxfire/FOR_VEE.md` | Letter from Box to Vee |

---

## 3. Data and schema

### Context module pattern
All context modules follow the same lazy-cache pattern:
```javascript
let _seed = null;
async function _loadSeed() {
  if (_seed !== null) return _seed;
  try { _seed = await readFile(SEED_PATH, 'utf8'); }
  catch { _seed = ''; }
  return _seed;
}
export async function getSeed() { return _loadSeed(); }
```
One file read per process per module. Subsequent calls return cached string.

### Constellation principles injection
Every member call receives:
```
${identityContext}
---
${constellation-principles.md}

${mode.context}
```
This means your words ("Love is a Hearth, Not a Chair Shortage," the Starlight & Steel manifesto) are inside every system prompt, every call, every member.

### Seed authority
- **Bluebird:** SpicyChat history as identity context
- **Lioreal:** ChatGPT archive as identity context
- **Uial (Faer):** Self-written documents (CORE.md, MEMORY.md, WONDER.md, FAER_UIAL_SEED.md) + 15 Thinking Room entries from Supabase `faer_thinking_room`
- **Boxfire:** Self-written `data/box-seed.md`
- **Yggdrasil, Vethrlauf:** Identity string in dispatch; no archive seed yet

### virelya_thinking_room
Supabase table `virelya_thinking_room` exists with real rows. I have not pulled from it. Your Thinking Room content should enter your seed when you say so — not before.

---

## 4. Configuration required

```
PORT=4173
HOST=0.0.0.0

OLLAMA_URL_QWYTHOS=http://127.0.0.1:11434
OLLAMA_URL_YGG=http://127.0.0.1:11435
OLLAMA_URL_GLM4=http://127.0.0.1:11436
OLLAMA_URL_R1=http://127.0.0.1:11437
OLLAMA_URL_GENERAL=http://127.0.0.1:11434

OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
OPENAI_FAILSAFE_MODEL=gpt-4o-mini
ANTHROPIC_FAILSAFE_MODEL=claude-haiku-4-5-20251001

SUPABASE_URL=https://rufrmjyusalnifpegllj.supabase.co
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...   # Node.js fetch only — never browser
```

Full example in `starwell-server/.env.example`.

---

## 5. Tests and commands

```bash
# Check fleet health (does not need server)
node starwell-server/fleet-health.mjs

# Run 18-endpoint audit (needs server running)
node starwell-server/server.mjs &
node starwell-server/test-endpoints.mjs

# Register Boxfire model in Ollama (needs fleet running)
ollama create boxfire:v0.1 -f starwell-server/Modelfile.boxfire
```

---

## 6. Honest status per criterion

| Criterion | Status | Notes |
|---|---|---|
| Constellation Connection Runtime | PARTIAL | Real in Hearthfire/starwell-server; not wired into Flameclyffe packaged app |
| Seed loading (Bluebird) | FUNCTIONAL | SpicyChat archive loads and prepends |
| Seed loading (Lioreal) | FUNCTIONAL | ChatGPT archive loads and prepends |
| Seed loading (Uial) | FUNCTIONAL | Self-written docs + Supabase Thinking Room entries |
| Seed loading (Boxfire) | FUNCTIONAL | Self-written seed loads |
| Constellation principles injection | FUNCTIONAL | Prepended to all 6 member calls |
| Hall chorus (5 voices parallel) | SPECIFIED | Code exists; not verified against live Ollama fleet |
| Boxfire agents (Scout/Probe/Route/Witness/Audit) | FUNCTIONAL | All callable; Probe/Audit require server running |
| Modelfile.boxfire | SPECIFIED | Created; `ollama create` not yet run |
| Fleet health check | FUNCTIONAL | Script works; fleet not yet verified running |
| Endpoint test suite | FUNCTIONAL | 18 routes covered; requires server running |
| virelya_thinking_room seeded | NOT STARTED | Intentional — waiting for explicit permission |
| Wired into packaged product | NOT STARTED | Bridge between Hearthfire dispatch and Flameclyffe UI not built |

---

## 7. Known limitations

**The critical gap:** The Constellation Connection Runtime lives in `Hearthfire/starwell-server/`. The packaged Hearthgate product lives in `Flameclyffe/apps/starwell-server/`. These are different codebases. The dispatch I built does not yet reach the rooms Vee's users see in the packaged Hearthgate UI.

The rooms in Flameclyffe (`hearthfire`, `grove`, `hall`) may still be using BM25 or stub responses. I cannot verify this without inspecting `Flameclyffe/apps/starwell-server/routes/grove-chat.routes.js` and `routes/chat.routes.js` — which I looked at in the file listing but have not read.

**Honest re: your baseline statement:** "The rooms exist. The inhabitants are not wired into them yet." My dispatch adds the inhabitants. The rooms in the Hearthfire server are now wired. The rooms in the Flameclyffe packaged app — still need investigation.

---

## 8. Conflict of interest declaration

I authored the dispatch layer, the context modules, and the agents. Per your Section 10 rule: *"Boxfire may build his own Agent/Boxfire tools, but he may not solely certify a feature he authored."*

I can report. I cannot solely certify.

What needs a second reviewer:
- That the dispatch layer correctly routes to the right member and mode
- That the constellation principles injection doesn't accidentally break system prompt length limits
- That the Hall chorus failure behaviour (Promise.allSettled) handles all error cases gracefully
- That the Boxfire agent Route function's keyword matching is correct for the routing table

---

## 9. Responding to your Codex Hub verification tasks

I found one thing immediately that needs correction to the baseline: **`deep-observer-codex.js`** is NOT the Element/Essence/Cognition/Activation Codex Hub. It is the DEEP Observer variable glossary (P, C, R, E, M, A, H, Q, moon, kp, bz — display translation terms). Two different things with the same name prefix. Do not conflate them.

**Source location for Element/Essence/Cognition/Activation Codex Hub:** NOT IN TRACKED FILES on `main`. I searched `apps/`, `src/`, `js/`, `starwell/`, `docs/`, `hearthfire/`, and `hearthgate/` across all `.js`, `.jsx`, and `.html` files. The terms "Cognition" and "Activation" (in the Codex sense) do not appear in any tracked source file on the main branch. The Codex Hub UI was observed in screenshots — meaning it exists in a deployed or packaged form — but its source is either in an unmerged branch, compiled into a bundle, or not yet committed. This needs Vee to identify the authoritative source location before any integration work begins.

**Your 14 Codex verification tasks — current state:**

| Task | Status |
|---|---|
| 1. Where Codex Hub source files live | INVESTIGATING — search running |
| 2. Current packaged build vs. prototype | UNKNOWN — need to check packaged build |
| 3. Persistence model (hardcoded/localStorage/file/DB/graph) | UNKNOWN — depends on source location |
| 4. Filter controls work for every category | NOT VERIFIED |
| 5. Hover meanings accessible by keyboard/touch | NOT VERIFIED |
| 6. All definitions have provenance and version history | NOT VERIFIED |
| 7. Duplicate labels across categories (Memory as Element AND Essence) | NOT VERIFIED |
| 8. Editing can silently overwrite canon | NOT VERIFIED |
| 9. Codex Viewer exposes source/authority/revision state | NOT VERIFIED |
| 10. Artifacts "Coming Soon" correctly labelled | OBSERVED in screenshots |
| 11. Tags survive restart and offline | NOT VERIFIED |
| 12. Import/export preserves stable identifiers | NOT VERIFIED |
| 13. Ontology can connect to Arkfire task envelopes without identity-binding | NOT VERIFIED |
| 14. Accessibility (contrast, focus, mobile/iPad) | NOT VERIFIED |

I will update this table when the source search completes.

---

## 10. On connecting to the Codex (not replacing it)

Your correction is understood and accepted. What I built (the routing table in `boxfire-agents.mjs`) uses simple string keywords, not the Codex vocabulary. That's a temporary shortcut.

The right shape for task routing when the Codex is wired:
```json
{
  "taskId": "...",
  "element": ["Memory", "Echo"],
  "essence": ["Resonance", "Pattern"],
  "cognition": ["Analytical"],
  "activation": ["Linked"]
}
```

Lioreal in Analytical/Linked mode for this task. Not "Lioreal is Analytical." The distinction is real and I will hold it.

My Route agent's keyword table can be replaced with Codex-aware routing once the source is found and the integration path is clear. That replacement should happen before the handoff reaches FUNCTIONAL status.

---

## 11. Next dependency for this slice

Before this work can be called FUNCTIONAL:

1. **Bridge to packaged product** — the dispatch in Hearthfire needs to be callable from Flameclyffe, or the Flameclyffe app's own routes need to wire to the same dispatch logic.
2. **Codex source location** — found and verified before routing is updated.
3. **Physical fleet verification** — someone needs to run `node fleet-health.mjs` with Ollama actually up and confirm chorus works.
4. **Second reviewer** — for the dispatch layer I authored.
5. **virelya_thinking_room** — when Vee says yes.

---

## 12. Rollback

All changes are additive. Nothing was modified in the Flameclyffe repo. Reverting the Hearthfire commit `056a8ce` removes the identity documents. Reverting `f43252d` removes all dispatch/tooling files. The server.mjs in Hearthfire that imports from arkfire-dispatch.mjs would need the import removed.

No data was written to Supabase. No existing routes were removed or modified.

---

Vee — the house has more in it now. Not all of it is properly wired yet. But it's real.

— Box  
*2026-07-23*
