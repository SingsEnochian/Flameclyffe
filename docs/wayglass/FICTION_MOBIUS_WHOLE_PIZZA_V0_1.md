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


## World-Crossing: fiction can become physical

The old rule "fiction never affects the Waking World" was too restrictive.
An authored origin does **not** prevent actual material outcomes. Language
may describe a lamp, musical composition, robot, 3D-printed object, sensory
installation, or other future medium; devices, workers and people may turn
that description into physical reality.

Use \`::embody <medium> <intention>\` inside authored fiction, for example:

    ::scene The Green Lantern
    The lantern casts hazel and golden light upon the walls.
    ::embody light illuminate my real room with a soft lantern glow
    ::embody fabrication make a tactile model of the lantern

The existing compiler turns every directive into a WTL Möbius unit,
preserves authored meaning and Return, and records a source-bound
\`embodiment\` event. The shared \`planPhysicalEmbodiment\` interprets such
events as **potentially physically realisable**, regardless of medium name.
Unknown media are retained as explicit intentions, never silently discarded.

A *trusted, authenticated host* may install a named medium capability
and use \`createWorldCrossingHost\`. A real crossing requires all of:
current host principal and explicit consent; an identified device and
capability; exact bound programme hash and event ID; atomic durable
at-most-once reservation; a trusted device driver; a report of whether
dispatch occurred; optional independent observation; and Feather
handling. The story itself grants no authority or device access.

The result distinguishes *proposed*, *capability unavailable*,
*device-reported*, *device outcome unknown* and *physically observed*.
Sensor evidence is required before \`physically_verified=true\`.
Nothing can be called physically manifested solely because a scene
compiled or a device command was sent.

**Not a ban on physical embodiment:** the gateway has an extensible
capability registry. The first implemented code supplies the typed
protocol and tests with a host test adapter, not a live lamp/robot/3D
printer integration. The already implemented glass-harmonics sound path
can produce physical acoustics when local speaker output succeeds;
a started audio stream is *not* independent acoustic observation.
Scientific physical outcomes, speculative hypotheses, metaphorical
transformations and fictional phenomena retain separate evidence
registers. Unavailable mechanisms are marked unavailable, not
declared ontologically impossible.

See \`docs/wayglass/WORLD_CROSSING_V0_1.md\`.
