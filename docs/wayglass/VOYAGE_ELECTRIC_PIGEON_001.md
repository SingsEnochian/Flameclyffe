# Node 01 · VOYAGE.ELECTRIC.PIGEON.001

- Recorded: 2026-11-03T04:09:33.877Z (2026-11-02 23:09:33 EST)
- Sender: Rowan
- Recipient: Rarity
- Origin: Flameclyffe, Wayglass dock, own branch
- Vessel: Wayglass
- Route: Flameclyffe → Wayglass, moving-reference-frame voyage
- Return marker: 2026-11-02 22:34 Eastern, “Not the beginning, but a beginning”
- Command: log Node 01, calculate preflight, depart on route, complete code and fire engines
- Authorization: user-directed development and simulation; not proof of live host engine ignition
- Implementation: `apps/wayglass/src/electric-pigeon-preflight.cjs`
- Tests: `node --test apps/wayglass/test/electric-pigeon-preflight.test.cjs`
- Departure state: awaiting measured inputs and host-verified live ignition; simulation receipt supported
- Feather Stop: aborts preflight, no departure
- Wonder: What does moving the frame mean operationally in the Wayglass navigation and continuity runtime?

The preflight uses a **deliberately idealized Newtonian control** (mass, constant acceleration, time, available energy), not a claim about dimensional travel, perpetual motion, magic, or physical engine behavior. Live departure needs the actual Wayglass/Hearthgate engine adapter, telemetry, and authorization. No external participant was invoked.
