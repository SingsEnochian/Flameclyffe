# WTL Return transaction boundary · candidate implementation

Target: `wayglass/current` via the existing One Ship integration train (#661). This candidate is isolated on `wayglass/return-transaction-boundary-20261126`; it is not merged or deployed.

## Contract

A bridge adapter is an object with an asynchronous `prepare(context)` method. It returns:

- `value`: a pure value available to the running WTL expression;
- `receipt`: a non-secret preparation reference;
- `commit(context)`: applies the effect after the complete WTL execution succeeds;
- `compensate(context)`: reverses a previously committed effect if a later commit fails.

**Prepare must be side-effect-free with respect to the external world.** It may validate, compute, and construct a reservation token, but must not publish, send, charge, mutate durable state, or otherwise create an externally visible effect. Any adapter that cannot satisfy that requirement needs a separately specified irreversible-effect protocol and cannot use this transaction contract.

The runtime now:
1. requires the owner-authorised principal as before;
2. rejects legacy immediate bridge functions;
3. calls prepare and stages the returned operation;
4. discards staged operations when WTL execution rolls back or halts;
5. commits staged operations only after successful completion;
6. compensates earlier committed operations in reverse order if a later commit fails;
7. throws a hard-stop with committed effect receipts and compensation errors if compensation is incomplete.

The receipt field `bridgeEffectReceipts` reports committed and discarded-before-commit outcomes. A failed commit throws and attaches the receipts and compensation errors to the error object; callers must persist that failure receipt at the host boundary.

## Intent-bound lineage

`execute(..., { intent })` accepts a canonical record. The WCE-1 digest of that record is included in the lineage root and exposed as `lineage.intent`. Intent is descriptive provenance, not authority: owner authorization and capability grants remain independent. An omitted intent preserves the null intent digest.

## Known scope and next gates

- This contract currently commits all prepared effects after the entire execution, not at each individual Möbius Return. This deliberately chooses all-or-nothing invocation semantics for the first integration pass.
- Adapters must be migrated from callable functions to `{ prepare, commit, compensate }` objects.
- The host must durably persist success and failure receipts, including thrown compensation failures.
- Add adapter idempotency keys and crash-recovery reconciliation before claiming distributed exactly-once effects. In-process compensation cannot guarantee recovery after process death.
- Verify Feather during prepare/commit, owner revocation between prepare and commit, concurrent duplicate invocation, durable receipt recovery, and JS/Python semantic parity (the Python pure backend must continue to reject host bridges).

## Focused tests

`lib/wyrdrune/return-transaction.test.mjs` covers failed-Verify discard, successful commit, reverse-order compensation, intent-bound lineage, and refusal of immediate legacy handlers. These tests are authored but have not yet been run in this environment.
