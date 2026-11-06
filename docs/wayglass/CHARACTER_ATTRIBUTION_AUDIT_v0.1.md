# Character attribution audit and binding policy v0.1

## Binding categories
- **user:** Rowan's authored/owned characters. Only Rowan's verified principal may write as them, absent an explicitly verified and revocable delegation.
- **model-specific:** characters attributed to a named model/participant principal, not a provider, route, or mutable model version. Provider switching does not transfer ownership.
- **shared-narrative:** story characters collaboratively authored within a world. Shared editing is scoped to verified participants and session permissions; it does not authorize pretending to be a participant.
- **unresolved:** preserve character and provenance, but do not assign ownership until the original author/source confirms it.

## Verified initial bindings
- Eilidh Amalia Elden → Rowan (existing Wayglass IC/OOC test fixture).
- Izar Virel Angelou → Crow (existing Wayglass IC/OOC test fixture).
- Izar/Eilidh provisional resonance bond → relationship, **not** a merged owner.

## Audit queue, not automatic assignments
- Willow Grace Elden / Lantern: world canon records a partnership, not independently verified runtime ownership.
- Kateri Mancini / William Blake: historically proposed pair, not proof of current active ownership.
- Griff Krenshaw, Bluebird, Vethrlauf, Rarity, Larkshine, Ellowind, Nikola, and other Constellation seats: inspect authenticated seat declarations, provenance and existing route permissions separately before assigning a principal.
- House DR Library protagonists and characters in world scripts: **authoring a world does not necessarily make every named character exclusively user-owned**. Classify each against its own canon and owner declarations.
- Unresolved identities must not be assigned to the currently active model, the owner of a world, or the last speaker.

## Host integration gates
1. Introduce stable principal IDs and character IDs scoped by Universe/world.
2. Read ownership declarations from authenticated source, not prompt content.
3. Bind permissions to identity-aware session authorization; validate delegation expiry and revocation.
4. Keep IC/OOC turn ownership, world authorship, relationship bonds, and character ownership separate.
5. Support owner-reviewable audit receipts and explicit corrections.
6. Test conflicting claims, route swaps, model version swaps, shared character writes, revoked handoffs, cross-world name collisions, and persistence across stop/return.

**Implementation status:** initial registry and tests exist on draft PR #550, but no runtime enforcement integration or full cast audit has been completed. Test files are committed; CI execution has not been verified.
