# Wyrdrune World-Crossing v0.1 · Fiction into physical manifestation

**Status:** source implementation, One Ship integration PR #661. No connected
hardware, actual VM guest, fabrication job, robot actuator, or external light
device verified by this feature. Existing Web Audio sound playback is a
separately consented physical-output *attempt*.

## Law: fiction may cross worlds

A fictional origin describes where an intention began. It does not confine
its future embodiment. Authored fiction may become a material object,
sound, light, spatial installation, sensory interface, remote interaction,
robotic motion or any future authorised physical medium.

The distinction is epistemic and operational, not metaphysical prohibition:

- **Imagine**: authored description, no physical claim.
- **Specify**: a named medium, intention, relevant world and device target.
- **Compile**: existing native WTL Eightfold + Möbius Return, source-bound.
- **Authorise**: a host-authenticated owner selects one device/action with
  fresh consent. The text cannot grant capability to itself.
- **Manifest**: an installed adapter may cause an actual external effect.
- **Observe**: a trusted sensor or recorded physical evidence may confirm
  outcome. An adapter ACK alone is not physical verification.
- **Return**: preserve provenance, observed state and uncertainty.
  A Return must not repeat an irreversible effect without fresh permission.

\`::embody <medium> <intention>\` is a typed fiction directive:

    ::scene First Lantern
    A glowing lantern from the story rests on the table.
    ::embody light illuminate this room with the lantern's golden glow
    ::embody fabrication produce a tactile lantern model

The language accepts any syntactically valid capability medium token.
Unknown ones remain meaningful proposals. This avoids limiting future
physics, artistic media, devices, robotics, fab labs or experimental
techniques to a hard-coded list. It does not magically create adapters.

## Shared architecture

Native code: \`lib/wyrdrune/fiction-mobius.mjs\` already compiles scenes,
authored events and all phase-specific Return cycles.
\`lib/wyrdrune/world-crossing.mjs\` uses the existing
\`planFictionProjection\` integrity guard to create
\`wayglass.world-crossing/v0.1\` plans.

Only a trusted host runtime may construct \`createWorldCrossingHost\` with:
\`authenticate\` (current real principal and capability binding),
\`reserve\` (durable atomic at-most-once receipt),
\`adapters\` (host-installed named medium drivers), and optional
\`observe\` (trusted physical witness). The planner grants none of these.
No browser UI is given this constructor or a real-world device handle.
Host requests must bind source hash, event ID, device ID, capability and
authenticated principal. There are no guessed drivers or network URLs.

The gateway's separate result distinguishes unavailability, refused
authority, unknown device outcomes, reported device outcomes and
independently observed outcomes. No sensor means
\`physically_verified:false\`. Feather cancels pre-dispatch; after
dispatch, the result must still acknowledge that physical effects may
be irreversible. A durable reservation prevents unintended replay after
a restart. Some future devices may not support cancellation.

## One Ship surface integration

Both the authenticated Program Workbench and offline First Lantern
display source-bound **physical intention plans** following genuine WTL
execution. These displays are not live actuator controls.
The pre-existing separately approved glass-harmonics renderer is an
actual local audio-playback route; its status no longer equates
"audio started" with "no physical effect possible".

Next real-device acceptance will require a named owner-approved device
with an existing safe interface (such as an isolated dimmable lamp),
authenticated host driver, fresh user gesture, an observation mechanism,
Feather-before/after-dispatch tests and a power-off Return/replay test.
No public endpoint, remote VM execution, or unverified automation is
enabled by this source change.

**Physics register:** established measurable mechanisms, proposed
engineering, artistic symbolism and speculative physical hypotheses
can coexist as distinct forms of inquiry. A speculative claim can be
explored, but is never recorded as a measured outcome without evidence.
