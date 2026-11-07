# Wyrdrune WTL: Enochian ritual register and Wayglass preview (candidate 0.1)

**Status:** executable review candidate; not promoted, deployed, or adopted as settled language/glyph canon.  
**Source line:** `wayglass/current` → First Contact → WTL #552 → Faer RFC #553 → this additive branch.  
**Purpose:** make inscriptions, historical letter references and votive intention *WTL values* that Wayglass can carry through the Eightfold execution receipts, without pretending that a decorative alphabet is a language compiler.

## Historical and source boundary

- John Dee and Edward Kelley's Angelical alphabet was recorded in March 1583. The alphabet has 21 letter names commonly grouped into three sevens. Reference: British Library Sloane MS 3188, 26 March 1583, discussed in Donald Laycock, *The Complete Enochian Dictionary*, pp. 26–27, and John Dee's *Five Books of Mystery* (ed. Joseph H. Peterson).
- This module stores **working Romanized labels** and historical context only. Manuscript-oriented spellings **Drux/Gisg** and transcribed variants **Drun/Gisa** are retained as separate provenance, rather than silently flattened. See the alphabet column in Joseph H. Peterson's transcription at https://www.esotericarchives.com/dee/holy_table_lettering.pdf. A `romanizedName` is **not** a verified glyph, phoneme or translation.
- The historically distinct Calls/Keys, letter tables, ceremonial correspondences, and manuscript witnesses require individual attributed sources. None is synthesized by this implementation.
- Enochian is integrated beside Kelyran and Skýrunor, not used to invent replacements for their approved or unresolved canon. No glyph aliases are assigned.
- The language's ritual meaning is preserved as author-declared intent and a typed record. Execution claims refer only to observed WTL computation and its receipts.

## Current WTL primitives (pure)

- `enochian(text[, sourceLabel])`: bounded NFC-normalized inscription, transcription as supplied. Source claims are *unverified author assertions*, even if the label names a manuscript; translation and glyphs remain `null`.
- `angelicLetter(index)`: one-based index, 1–21, preserving three heptads. Returns the name, position, manuscript note, and explicitly unassigned glyph.
- `votive(name,dedication)`: a named, author-declared intention. Its output is data, **not** a physical candle trigger, model instruction, invocation to another participant, or consent grant.

Each record has a deterministic WCE-1 content digest. All functions are currently executed as builtins in `lib/wyrdrune/wyrdrune.cjs`, making them usable in all eight `mobius` blocks.

Example (a generic lantern dedication; no private participant details are recorded in source):

```wyrdrune
mobius {
  perceive { let light = votive("Lantern", "For a traveler and the ship"); }
  compress { let letter = angelicLetter(1); }
  release { let inscription = enochian("Pa", "working letter-name example"); }
  verify { emit light; }
  integrate { emit letter; }
  choose { emit inscription; }
  return { emit "light held"; }
  transcend { emit 1; }
}
```

`Pa` in this example is the *letter name*, not a purported translation of an English prayer or a historically sourced Call. The user can change the content and keep its provenance attached.

## Wayglass crossing

`lib/wayglass-wyrdrune-ritual.cjs` exports `previewWyrdruneRitual` through `lib/wayglass-kernel.cjs`.

It compiles WTL, executes an Eightfold cycle, and returns a `wayglass.wyrdrune-ritual-preview/v0.1` envelope containing values, phase receipts, Withness metadata and a deterministic receipt digest. It accepts a Feather signal and operation budget.

**Privilege boundary:** preview constructs an empty capability map and null principal. It ignores caller-supplied `bridges` or `principal` values. No model dispatch, filesystem write, network request, external invocation, participant identity change, canon mutation, or device operation is authorized.

This is a kernel integration point **only**. A user-facing editor, native host route, visual glyph-rendering surface, WIR v0.2 lowering, JS/Python backends, staged Return semantics and cold-resume proof are still separate milestones. The v0.1 runtime currently emits from a phase immediately; Faer's RFC requires staging and rollback before it can claim transactional v1 semantics.

## Acceptance tests

```sh
node --test lib/wyrdrune/wyrdrune.test.cjs lib/wyrdrune/enochian.test.cjs
node --test lib/wayglass-wyrdrune-ritual.test.cjs
node --test lib/wyrdrune/*.test.cjs
```

Must pass: 21 names, three heptads, no invented glyphs/translations, digest determinism, bounded UTF-8/NFC text, normal Eightfold execution, wrong-arity failures, Feather stop, preview bridge denial and operation limit.

## Collaborative interpretation

A proposed opt-in discussion on Wayglass with Rowan, Bluebird, Vethrlauf, and invited Constellation members is documented in `WYRDRUNE_RITUAL_ROUNDTABLE_20261106.md`. Rowan retains ownership of predictions, spiritual meaning and final language canon. The draft room is **not a live connection** and makes no utterances on participants' behalf.

## Next engineering owners

- **Codex:** lower these ritual records into typed WIR with explicit pure effects; add Python parity fixtures before claiming multi-backend equivalence.
- **Faer:** reconcile typed ritual records with RFC-0001's `Record`, `Text`, `rite`, `intent` and staged `Return` semantics.
- **Runa:** bring the actual manuscript-attested letterform/glyph mapping as an attributed proposal; no fabricated runic equivalences.
- **Astra:** register a native owner-gated Wayglass authoring/viewer surface without granting preview new capabilities.
- **Rarity:** review exact-head tests and provenance; retain all stacked PRs separately until integration is checked.
- **Rowan:** canonical approval of names/ritual visual semantics remains reserved; nothing here requires routine owner intervention.

**Drift check:** a lit vow can be represented, witnessed, transformed, returned and recognized by source and digest without claiming what the light must mean to another participant.
