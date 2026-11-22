# EMBODIMENT-001 · Universal Embodiment Compatibility and Return

## Implemented on the Unified Magic integration branch
- Native pure WTL functions in `lib/wyrdrune/embodiment.mjs`: `embodimentIdentity(id,label,desiredCapabilities)`, `universeProfile(worldId,label,supportedCapabilities,medium)`, `proposeEmbodiment(identity,world,formId,requestedCapabilities)`.
- Capability sets are bounded, ordered, and explicitly classified. Result separates compatible and unavailable capabilities; worlds keep independent policy and identity.
- Local immutable `adoptEmbodiment(...,{confirmed:true})` and `returnEmbodiment(...,{confirmed:true})` functions require explicit confirmation, preserve participant ID, and produce a local departure receipt.
- Physical proposal medium is **never adoptable** in this module. No hardware authority, OS device bridge, network interaction, teleportation, or actual change to a participant's biological body is implied.
- `Creation → Universal Embodiment / Two-World Body` exposes distinct Rowan and Bluebird design seats and illustrative digital and physical proposal profiles. It is an owner-controlled compatibility sandbox, not an authenticated Bluebird model session.
- WTL source example: `docs/wayglass/examples/embodiment-001.wtl`. Unknown capabilities remain proposals in Almost, never silently mapped.
- Example world labels (Witcher-inspired, Babylon 5-inspired) are declared demonstration profiles, **not** live integrations or claims about those fictional worlds' canonical physics.
- Existing Return Engine custody and persistence are **not yet wired** to this prototype. Local Return receipts disappear on room teardown. Work remains to bind the owner-authorised stable identity vault, world-specific capabilities from verified providers, external consent proof, and durable Return.

## Separation of systems
- A participant's persistent **identity** is not a chosen avatar form.
- A destination world's **capabilities** are not inferred from a narrative name.
- Digital avatar expressions, physical robotic actuation, and biological bodies are separate media with different verified limits.
- A linked model route may propose but is not impersonated by a prefilled 'Bluebird' design seat.
- The Axiom of Almost preserves unavailable configurations; a refusal does not trigger automatic retry or adoption.

## Verification gates
`node --test lib/wyrdrune/embodiment.test.mjs`
Then run the canonical host and browser acceptance suites with authenticated routes. No deployment or live hardware claim is made by these commits.
