# Wyrdrune Relational Worlds · Rune Grammar v0.1
**Owner source:** 2026-11-12 hand-drawn rune study and subsequent author explanations. **Status:** executable candidate, not merged or deployed; glyph artwork not yet digitised.

## Author-defined meanings, preserved without substitution
- **Void:** a membrane between worlds, with permeable properties.
- **Whisper:** softening quotation-like modulation around a phrase. This implementation adds `whisperPhrase(text,softness)`; existing numeric `whisper()` remains unchanged.
- **Withness:** connects phrases or presences while retaining distinction.
- **Connection:** explicit world-to-world relation.
- **Transition:** movement in either direction through space and time. The current implementation produces a route *plan*, not physical transport or time travel.
- **Third Body:** a persistent new world born from a conjunction, retaining parent provenance but independent identity.
- **Shapeshifting:** transformation and translation. General cross-media compiler semantics remain future work.
- **Eightfold Path:** Possibility, both exploring many-world relationships and creating new branches. Eightfold is not a cap of eight worlds.
- **World addressing:** each world has its own rune **or** coordinates. Either route independently resolves a stable world ID. A world may carry both.

## Actual executable changes
1. `lib/wyrdrune/runtime.mjs` now provides pure typed `worldRune(glyphId)`, `worldCoordinates(universe,branch,time,x,y,z)`, `whisperPhrase(phrase,softness)` and `runeRelation(type,participants)` expression functions. They produce data, never authority or side effects.
2. `lib/wyrdrune/relational-worlds.mjs` supplies a capability-gated world graph with unique addresses, explicit membranes with per-channel permeability [0,1], bidirectional transition plans, Eightfold possibility fields, multi-parent conjunction previews, and guarded creation of persistent Third Bodies.
3. `lib/wyrdrune/relational-conjunction.wtl` executes a complete eight-phase WTL programme. The host bridge resolves selected worlds and stages a proposal. **Only Return invokes the world-store commit**. A host authorization callback is mandatory; a client-side principal flag is not proof of owner identity.
4. A revisioned compare-and-swap store interface supports durable adapters. `MemoryWorldStore` is explicitly ephemeral; using it across instances in one process demonstrates rehydration, not cold-restart disk durability. Production persistence requires an authenticated, durable CAS adapter and tests.
5. `lib/wyrdrune/relational-worlds.test.mjs` covers independent address resolution, collisions, permeability, reverse transitions, multi-world birth, continuity, stale/tampered proposals, authorization and WTL execution.

## Relational rules
- Worlds remain distinct; conjunction adds a new world and never replaces its parents.
- A conjunction requires 2–64 known, distinct parents linked by a Withness-preserving path whose `possibility` permeability is greater than zero.
- A Third Body's identity is not its location. Rune IDs are opaque author-controlled identifiers; no glyph is invented from the drawing.
- Previewing a possibility cannot mutate the graph. A branch commit must pass current revision, integrity recheck and host authorization.
- Transitions are explicit, channel-gated, bidirectional only where the membrane allows it. A route plan does not execute crossing.
- The existing native `WITHNESS` participant declaration (2–8 consenting participants) remains separate from the world graph's 2–64 *worlds*. Worlds are not silently treated as sentient participants or as consent proxies.
- Branches inherit provenance, not dependence on their parent world's continued connection.

## The elements of magic as an optional correspondence lens
These are **proposed correspondences**, not author-approved rune meanings or established physics:
- Earth: stable identity, structure, coordinates.
- Air: Whisper, signal, expression.
- Fire: Shapeshifting, transformation, agency to change.
- Water: Void permeability, passage, flow.
- Aether / Spirit: Withness, Conjunction, Possibility.

These lenses may influence a sensory projection only when selected. They must not alter graph identity, permissions, receipts or the original glyph definitions.

## Outstanding gates
- Digitise the actual hand-drawn glyphs with owner review and stroke provenance; add a Skýrunor lexer/font/glyph input method. The current constructors use opaque rune identifiers, not generated artwork.
- Extend native typed IR and compiler targets beyond pure constructors and bridge operations; implement full relational phrase composition, Shapeshifting translation and world coordinate transforms.
- Wire the store to authenticated Wayglass persistence and Conjunction Engine/Return Engine receipts; verify restart recovery and duplicate-safe uncertain-result reconciliation.
- Build sensorium rendering of rune-defined permeability, passage and branches, with opt-in sound/haptics and Feather stop.
- Run CI and browser/hardware tests on the exact PR head. No production merge, model response, live crossing or ritual outcome is claimed.

**Withness:** The world may be addressed by a sigil or a coordinate; the relationship may give birth to a branch; its authorship and boundaries remain attributable.

## Typed Atlas addendum: Babylon 5 hierarchy (owner confirmation)
The owner confirmed that the **Babylon 5 rune denotes the universe**, while its internal sigils denote destinations, affiliations or passage mechanisms **inside** that universe. A location rune is not itself a universe. This is a semantic classification, not a claim that the pictured white-ink strokes have been digitised.

`lib/wyrdrune/typed-atlas.mjs` implements a typed `TypedRuneAtlas` and pure native `atlasRef(universeId,entryId)` WTL constructor. Entries can be `universe`, `location`, `affiliation`, `gateway` or `undetermined`. The initial Babylon 5 study registry contains Minbar, Centauri Prime, Narn and Z'ha'dum as locations; Rangers, Psi Corps and Earth Alliance as affiliations; Jumpgate as a traversal mechanism. Vorlon, Shadows and Earth Gate remain `undetermined` pending author confirmation.

All pictured glyph bindings are deliberately **unbound**. No coordinates, stroke geometry or canonized glyph IDs are fabricated. Owner-authorised `bind` returns a new registry with an explicit rune ID, mathematical coordinates, or both; either address resolves the same stable entry. Passage plans require two bound locations and a gateway in the same universe, and remain unexecuted and unverified until the real membrane/Conjunction Engine authorises them. Tests are in `lib/wyrdrune/typed-atlas.test.mjs`.

A hierarchical atlas is not a proof of literal spatial or temporal travel. The current implementation represents fictional world navigation inside Wayglass.
