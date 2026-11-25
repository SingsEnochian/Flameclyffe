# Skýrunor v0.1 — semantic language across Wayglass

Source scope: existing Whole Pizza OS PR #676, continued from e0e8b06333d71f5dbae1c53d50a75bbd93cc2871. Owner approved compact declarations, then both a general change language and coverage of existing WTL operations. This is one shared language subsystem, not a separate OS or a new execution authority.

## System boundary and ownership

`lib/wyrdrune/skyrunor-bridge.mjs` is the shared translation entry point. It owns no persistent state and calls no model or host bridge. The offline iPad runner and Wayglass Program Workbench use it locally. The authenticated host exposes the same contract at `POST /api/v1/wayglass/wyrdrune/translate` with `{format,input}`. Execution remains a separate `/wyrdrune/workbench` request with explicit mode and existing Steward/context/capability/Feather checks.

Translation produces an inspectable AST and reversible representation. It does not establish identity, authenticate an assertion, physically measure anything, grant consent, or mutate another participant. Source edits remain drafts. Existing programme save/run paths retain WTL and source hashes; host receipts now include source-derived semantic metadata. General change proposals are not automatically persisted or applied.

## Three semantic forms and the original transport

| Form | Header / example | Meaning and limits |
| --- | --- | --- |
| Compact declaration | `ᛋᚴ:ᛗ/ᛖ/ᚲ=ᚺᚷ!ᛞ` | Owner / eyes / colour / hazel green / owner-declared. Canonical typed attribute AST. |
| WTL programme | `ᛋᚴᚹ:` | Operation/phase/scope glyphs, explicit `@"identifier"` names, text and numeric literals, structural punctuation. Preserves the entire current WTL IR, not source formatting. |
| General change proposal | `ᛋᚴᚳ:` | Domain and change-kind glyphs followed by the canonical typed change record. Explicitly proposal-only. |
| Exact byte transport | `ᛟᛟ` | Existing UTF-8 byte encoding remains unchanged, preserving original whitespace/comments/source exactly. |

The glyph assignments are this version's authored language convention, not claims about historical runic meanings. `ᛋᚴ` names version 0.1. Compact declarations use `ᛗ` owner, `ᛖ` eyes, `ᚲ` colour and `ᛞ` owner-declared. Colour tokens: `ᚺᚷ` hazel green, `ᚺ` hazel, `ᚷ` green, `ᛒ` blue, `ᛒᚱ` brown, `ᚷᚱ` grey. Unknown values, subjects, attributes and verification claims are rejected by the compact grammar rather than guessed. Other programmes use the programme grammar; broader meanings use typed proposals.

## Reversibility and unsupported meanings

Compact declarations round-trip glyphs → typed AST → canonical WTL → structured British English → WTL → AST → glyphs. Reverse recognition compares the complete compiled programme, including output, declaration basis, carry and all cycles. It cannot silently discard extra effects. WTL verifies internal consistency of the declaration; its output does not prove physical eye colour. The author remains an assertion in offline mode, not an authenticated identity.

The programme grammar covers all current parser forms: shared, scoped and spiced circuits; Eightfold phases; let, set, emit, require/else, withness, pause and carry; named operators; literals, unknown, reads, negation, arithmetic, comparisons, Boolean logic, lists, records and calls. All 17 top-level `.wtl` source programmes are round-trip fixtures. Named operators and spiced scopes are now retained in structured English. Bridge names and arguments remain explicit, and capability checks still run at execution. Unknown calls may be representable yet unavailable to a host. Finite numeric values have reversible decimal spelling; non-finite literals are explicitly refused by translation. Resource limits remain in force.

Full AST input is recompiled and compared in full. Unknown fields, altered provenance and noncanonical/corrupt glyph sequences fail closed. Arbitrary free English is not accepted. Compact declaration English is `Owner declaration: My eyes are hazel green.` The existing structured circuit dialect remains the programme authoring language; complex expressions are explicitly quoted WTL expressions, not invented natural-language interpretations.

## General change coverage

Domains: value, identity, relationship, state, time, provenance, consent, structure, capability, environment and extension.

Kinds: declare, observe, create, replace, remove, increment, transform, move, copy, rename, merge, split, link, unlink, transition, schedule, cancel, grant, revoke, correct, revert, migrate and extension.

Each record retains subject, path, authored meaning, typed before/after values, author/source/superseded references, declared consent and an optional canonical UTC effective time. Values support absent, unknown, null, text, finite number, Boolean, reference, list and record. Creation/removal have explicit absent-value constraints. Extensions preserve novel, uninterpreted meanings without claiming universal semantic understanding. This is an extensible representation of change, not proof that every possible real-world change has an executable interpretation.

Every general change receipt states `representation_supported:true`, `execution_supported:false`, `status:"proposal-only"`, `executed:false`, `consent_verified:false`, `physically_verified:false` and no external effects. No domain executor is registered in v0.1. Grant/revoke records do not change permissions; schedule records create no timer; observations are attributed claims, not measurements performed by this codec. The UI disables execution while showing a proposal. Editing or explicitly loading WTL returns to the separate programme path. Before/after values preserve proposed transitions; they do not guarantee that an external action is reversible.

## Möbius is not infinity

A Möbius strip is a one-sided surface with one boundary component formed by a half-twist identification. The infinity sign is a figure-eight symbol and does not itself specify a Möbius surface. WTL's `mobius` constructs define runtime scope, phases and carry behaviour. A repeating programme, scope crossing, rendered glyph and physical topology are separate concepts; none certifies the others.

## Acceptance and receipts

Required gates: exact typed round trips; negative semantic/provenance tests; all existing programme fixtures; byte transport regressions; declaration execution/carry; authenticated translation/compile/execute separation; unavailable host capabilities; Feather; proposal-only UI; generated artifact syntax; actual Chromium and WebKit execution; packaged-host imports from the staged runtime.

Run:

```sh
npm ci
npm ci --prefix apps/starwell-server --omit=dev --ignore-scripts
node --test lib/wyrdrune/*.test.cjs apps/wayglass/test/wyrdrune-workbench-client.test.js
npm run wayglass:deploy:server
node --test apps/starwell-server/test/wayglass-wyrdrune-workbench.test.js
node scripts/build-first-lantern-ipad.mjs
node scripts/check-first-lantern-ipad.mjs
npx playwright install --with-deps chromium webkit
node scripts/check-skyrunor-browser.mjs
```

The iPad workflow uploads the exact standalone HTML, browser screenshots and `browser-receipt.json` with the artifact SHA-256. The browser test uses the real production workbench component and authenticated local router with a labelled eight-system shell fixture, no production store, and no live owner credential. It is not a full production deployment or iPad hardware acceptance.

Local development caught a missing host staging step and two Vite test-harness integration errors before successful runs. These were fixed in packaging/test orchestration, not by weakening semantic assertions. Existing conformance TODOs for unclaimed backend levels remain TODOs. Existing build warnings about bundle size and browser-externalised Node crypto are not new acceptance claims.

Remaining boundary: hands-on iPad Safari/Files use, deployed service availability, durable production storage, universal change application and any physical verification are unverified. No model invocation, installer promotion, PR merge or production deployment is implied.

Local wider-suite result on Windows: 877 passed, 3 failed, 19 TODO before the added client receipt test. Two frozen-evaluation failures are explained by checkout CRLF bytes: the original Git blob hashes to the pinned `a158f126e5a375804fb29a3c6f49062451c35058e23f6f04037e58d9bafdf652`; normalising the local file to LF reproduces that exact blob. The third is the pre-existing live-return test's `ticket_path.startsWith(userHome)` assertion under Windows, where it supplies HOME but not USERPROFILE. No evaluation evidence or pin was rewritten. The complete host suite passed 94/94. Exact-head Linux CI remains the publication gate.
