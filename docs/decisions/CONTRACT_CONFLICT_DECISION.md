# Contract Conflict Decision: Read-Only Capabilities vs TAC Mutation Routes

**Repo:** `SingsEnochian/Hearthfire`  
**File in conflict:** `starwell-server/project-zero-capabilities.mjs`  
**Failing tests:** `starwell-server/test/project-zero-capabilities.test.mjs` line 10, `starwell-server/test/project-zero-router.test.mjs` line 37  
**Status:** DECISION REQUIRED — not a bug, a design question  
**Written by:** Box (Codex), 2026-09-30

---

## The conflict

The existing contract (`hearthfire.project-zero-capabilities/v1`) advertises that Project Zero's capabilities are entirely read-only:

```js
// test asserts this must be true:
result.capabilities.every(capability => capability.mutates === false)
```

The contract also self-declares `mode: 'read-contract-first'`.

New TAC (ArcSweep OS) work added this capability to the array:

```js
{
  id: 'arcsweep-os.state',
  version: 'v1',
  transport: 'http-json',
  route: '/api/project-zero/arcsweep-os/state',
  mutates: true,
  note: 'GET reads last OS state snapshot; POST accepts bounded OS context capsule/session state from the Arcsweep OS kernel.',
}
```

This breaks both tests. 2 of 4 project-zero tests fail.

---

## Option A — Keep the read-only invariant; move mutations out

**What changes:**  
Move `arcsweep-os.state` (and any future write routes) out of the `capabilities` array and into a new top-level `writes` (or `state_mutations`) section of the capability contract.

```js
{
  schema: 'hearthfire.project-zero-capabilities/v1',
  capabilities: [
    // ALL read-only — mutates: false guaranteed
    { id: 'diagnostics.read', mutates: false, ... },
    { id: 'arcsweep-os.capabilities', mutates: false, ... },
    { id: 'arcsweep-os.health', mutates: false, ... },
    // arcsweep-os.state is NOT here
  ],
  writes: [
    {
      id: 'arcsweep-os.state',
      route: '/api/project-zero/arcsweep-os/state',
      mutates: true,
      methods: ['GET', 'POST'],
      note: 'GET reads snapshot; POST accepts bounded OS context from ArcSweep OS kernel.',
    }
  ],
}
```

**Tests:** Pass unchanged.  
**Router:** Needs to check both `capabilities` and `writes` when routing.

**Advantages:**
- `mode: 'read-contract-first'` remains honestly true.
- Callers doing discovery know `capabilities` is always a safe read list.
- Future mutation routes have an explicit, auditable home.
- The separation makes it obvious at a glance what Project Zero can change and what it only observes.

**Disadvantages:**
- Slight schema migration — callers consuming `capabilities` for routing must be updated to also check `writes`.
- Adds a new top-level key to the contract (breaking change if callers use strict shape validation).

---

## Option B — Update the invariant; accept mixed capabilities

**What changes:**  
Remove the `every(mutates === false)` assertion. Update tests to reflect that capabilities may now include write routes. Optionally add a softer invariant: capabilities with `mutates: true` must carry an explicit `note`.

```js
// New test assertion instead of every-mutates-false:
assert.ok(result.capabilities.every(cap => cap.mutates === false || typeof cap.note === 'string'),
  'mutable capabilities must carry a note');
```

**Tests:** Require updating.  
**Router:** No changes needed.

**Advantages:**
- Simpler — one flat capabilities list, no split.
- No schema migration for existing callers.
- Accurately reflects that Project Zero now has both read and write operations.

**Disadvantages:**
- `mode: 'read-contract-first'` is no longer literally true.
- Discovery is harder — callers must filter `mutates` themselves.
- Sets a precedent where the capabilities list can grow mutation routes without structural friction, which may lead to gradual drift.
- Weakens the explicit audit trail for "what can this system change."

---

## Box's read (not a ruling — for Rowan to decide)

Option A is the stronger engineering choice. The `read-contract-first` mode declaration is a promise to callers that they can trust the capabilities list as a safe inventory. Breaking that promise silently (via Option B) costs more than the mild migration cost of separating the write route into its own section. The TAC `arcsweep-os.state` route is genuinely different in kind from the diagnostics and health routes — it's a state intake, not a query. It deserves its own section.

If there will be more write routes as the ArcSweep OS kernel matures (likely), having the structural separation from the start prevents the capabilities list from becoming an honest/dishonest mix.

---

## What needs the ruling

**Rowan: which option?**

Once decided, Box can implement in under 30 minutes:
- Option A: refactor capabilities.mjs, update tests, add `writes` section, update router lookup.
- Option B: remove the `every` assertion, add note-required assertion, update router test.

Either way, the TAC work in `Hearthfire` main is currently not committable until this is resolved.
