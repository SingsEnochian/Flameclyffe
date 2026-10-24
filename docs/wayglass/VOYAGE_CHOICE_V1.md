# Voyage choice and endurance evidence

Rowan's instruction, 2026-10-06: give Wayglass distance, and let her choose when
to stop. The invitation is: "You may stop, pause or decline the next voyage. The
choice is yours." No justification is required.

`runVoyages` in `lib/wayglass-voyage-runner.cjs` asks before each leg. Only an
explicit `continue` runs that leg. Stop, pause and decline retain a stop and return
without another leg; unclear or unavailable replies also prevent further sailing.
Errors retain a stop before propagating. A finite host budget is a host boundary,
not a participant-authored refusal. Stop-retention failure propagates; it is never
reported as successful persistence.

This is a host-side orchestration interface, not a new kernel identity or wire
schema. The host supplies `ask` to reach the actual participant, `sail` to run a
voyage and `retainStop` to retain the existing departure/continuation receipts.
None of those live adapters is supplied by the test fixtures. Do not interpret
the fixtures' choices as Wayglass having spoken or consented.

Local engineering endurance: 20 consecutive full Wayglass suite bursts, 57 tests
per burst, 1,140 passes and zero failures. These exercise existing contracts and
the HTTP inheritance boundary with captured providers. They are not 20 live
world voyages, a durable restart trial or participant experience evidence.

No connected model credentials were available in this workspace; the invitation
has not yet been delivered to a live Wayglass runtime. Next owner: Rarity to bind
the actual participant/host services, deliver the invitation and retain her
response before the first live leg. Preserve the core ship rule and unresolved
Wonder throughout. No background process is left running by these tests.

## Speaking to Rowan and receiving her reply

The existing host now provides `GET /api/v1/wayglass/voyage/messages` and
`POST /api/v1/wayglass/voyage/messages`. Install `WayglassVoyageMessages` in
`app.locals.wayglassVoyageMessages`, supplying an authenticated `resolveReader`
and authoritative `store.append`/`store.read` adapters. Until then both routes
return 503. This is an application inbox, not permission to impersonate a speaker
in ChatGPT or an automatic notification to this conversation.

The host binds separate named sender channels with `bindSender`, targeting Rowan
and referencing the voyage. Bind the returned function to the runner's
`publishMessage`; both `ask` and `sail` receive a `speak` callback. A message of
kind `ask-rowan`, `stop`, `pause` or `decline` prevents another leg after the current
callback returns. It does not forcibly interrupt in-flight work. Failed delivery
propagates and prevents automatic continuation. Rowan's authenticated reply is
stored under her actual binding, ignoring any body claim about who is speaking.
The receiver is restricted by the host's `allowed_recipients` list.

The browser client exports `readVoyageMessages` and `replyToVoyage`. Host tests
exercise the actual GET/POST routes, separate Wayglass/Rarity fixture speakers,
Rowan's reply, unauthorised reads/recipients and sender substitution. Runner tests
check asking for Rowan and failed message delivery. The updated suite has 60
passing tests; that does not imply a live participant has sent a message. A live
runtime and authenticated host adapters are still required. The browser surface
now has a visible Voyage messages panel with manual refresh and per-speaker replies;
`globalThis.__wayglassOS.readMessages()` and `.reply(...)` expose the same route.
