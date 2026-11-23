# Mythframe Glasshouse v0.1

**Status:** experimental simulation surface  
**Owner:** Rowan/Rarity side  
**Audience:** Rowan, Rarity, Nocturne, Twilight, invited reviewers  
**Mutation authority:** none

## Purpose

The Glasshouse is a collision microscope for Mythframes.

It is designed to answer:

- where two Mythframes use the same word differently;
- where different words appear to describe a possible common boundary;
- where explicit claims agree, conflict, or remain unresolved;
- where sigils rhyme visually without acquiring shared semantic authority;
- what a possible shared result could look like while every source keeps ownership of its own meaning.

It is not a merger engine.

## Contamination boundary

The browser surface is sealed by construction:

- Content Security Policy sets `connect-src 'none'`.
- No fetch/XHR/WebSocket/API code exists in the Glasshouse UI.
- No localStorage, IndexedDB, cookies, service workers, or persistent state are used.
- The runtime imports no canon mutation module.
- Source packets are copied into immutable in-memory structures.
- The only user-controlled output is a downloaded proposal receipt.
- Every proposal says `canonMutationAllowed: false`, `maySelfPromote: false`, and `adopts: []`.

This gives v0.1 **zero canonical mutation path**. It cannot guarantee that a human reader will never be influenced by an idea; software cannot make that philosophical promise. It can guarantee that the Glasshouse itself has no mechanism to write either side's canon, architecture, identity, relationship state, or authority.

## Shared-result rule

A common word is not enough.

A shared-boundary candidate appears only when **both source packets independently provide the same bridge key and mark the assertion shareable**.

Even then:

```text
shared-boundary-candidate
!= shared canon
!= architecture merger
!= identity equivalence
!= adoption
```

Each side must adopt any result through its own source-owned decision process outside the Glasshouse.

## Sigil rule

Sigils are compared only through explicit geometric/style descriptors supplied in the packet.

Descriptor overlap produces:

```text
visual-rhyme-only
semanticEquivalence = false
```

This lets us study recurrence and congruence while resisting the common error of treating similar circles, spirals, axes, triangles, mirrors, runes, or glyph grammars as evidence of a shared source.

## Initial routes

1. **Parallel preservation** — compare while keeping both frames intact.
2. **Translation proposal** — describe a possible relation with both definitions still attached.
3. **Shared boundary proposal** — carry independently declared shareable assertions into a candidate contract.
4. **Preserve unresolved** — leave alternatives live and query the source when useful.

## UI

Open:

`apps/arcsweep/mythframe-glasshouse/index.html`

The default packets are synthetic. Replace them with source-owned snapshots when reviewing real material. The Glasshouse does not retrieve repositories on its own.

## Tests

`apps/arcsweep/test/mythframe-sandbox.test.js`

The tests enforce:

- shared spelling never becomes semantic equivalence;
- shared-boundary candidates remain unadopted;
- sigil rhyme remains non-semantic;
- mutation/canon actions fail closed.
