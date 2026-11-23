# Fiction becomes native, carried Wyrdrune · One Ship / Whole Pizza

Status: implementation candidate in PR #661; no deployment or physical device attestation claimed.

A passage of user-authored prose is **source**, not a generic prompt. The deterministic
\`lib/wyrdrune/fiction-mobius.mjs\` transforms it to a bounded typed scene AST, then
canonical \`mobius scoped\` WTL cycles with all Eightfold phases, an explicit
\`require\` gate, a staged \`choose\` event, a \`return\` receipt event and
\`transcend { carry story_step = next_step; }\`. Each line represents a
separate cycle; one authored narrative moves across crossings and carries
a counter. This *executes* on the existing Wyrdrune engine, not a parallel
fiction interpreter.

## Example

    ::scene The Green Lantern
    A green lantern glowed beside the doorway.
    Falka: "The gate remembers our names."
    ::cue audio soft glass harmonics
    ::change the fictional door opens
    Beyond the threshold, another room began.

Regular prose is data, not an instruction to the machine. Strict leading
directives are \`::scene\`, \`::cue audio|image|video\`, and \`::change\`.
Dialogue identification is strictly syntactic and does not authenticate a
speaker or assert model agency. Unsupported \`::\` commands fail closed.

\`::cue\` and \`::change\` execute **as typed proposal events only**; there
is no audio/video/image renderer, world mutation, model call or physical-world
action attached. A cue's execution in a WTL cycle must never be represented
as having produced the proposed media. Outputs are source-bound
\`wayglass.fiction-event/v1\` and \`wayglass.fiction-return/v1\` records,
with \`observation_kind=authored-fiction\` and \`physically_verified=false\`.
An iPad runner and the native Program Workbench use the same module.
The Writing Room offers an explicit transfer, not automatic execution.

**Integrity**: initial authored text SHA-256, canonical WTL source SHA,
crossing count, staged event equality, final carried \`story_step\`,
Wyrdrune checkpoints. One failed Verify or active Feather prevents new
commit for its affected cycle. WTL execution remains separately
owner-invoked through the existing host route or offline iPad runner.
No unrestricted natural-language understanding or self-modifying code
is claimed: the first implementation's living behaviour is actual
phase progression, authored scene events and carried state.

## Deferred but required

* Author-reviewable fictional world-state transformations, bounded
  typed operators and conditional narrative branches without giving
  narrative text permission to mutate the host.
* One Return ledger shared by Writing Room, Watercolour, Spellbook,
  Observatory and other consumers, with process-cold recovery.
* An explicitly granted projection of committed fiction events into
  Watercolour, audio, images and video; Feather stops adapters.
* Semantic Skýrunor grammar for fiction events, and source-mapped
  round trips to British English without invented interpretation.
