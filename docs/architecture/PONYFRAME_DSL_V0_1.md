# Ponyframe DSL v0.1

Ponyframe is the first bounded scenario-language seam inspired by the Ponyscript evaluation in PR #429.

It is deliberately not a replacement compiler, not a security boundary, and not an authority runtime. It is a small human-readable language for synthetic Mythframe collision lessons that compiles into the existing tested ArcSweep Mythframe Glasshouse engine.

## Why this shape

Upstream Ponyscript is delightful but currently behaves primarily as a lexical C++ front end. Ponyframe keeps the inviting culture-bearing idea while shrinking the executable surface.

The v0.1 flow is:

```text
Ponyframe source
  -> bounded parser
  -> Mythframe packets
  -> existing Glasshouse collision analysis
  -> optional proposal-only record
  -> immutable-style receipt object
```

No generated C++ is executed in this seam.

## Core grammar

```text
scenario "..."
wonder "..."

friend left constellation "..." mythframe "..." ref "..." synthetic
friend right constellation "..." mythframe "..." ref "..." synthetic

left term "..." means "..."
right term "..." means "..."

left claim "..." is "..."
right claim "..." is "..."

left bridge "..." shareable says "..."
right bridge "..." private says "..."

left sigil "..." looks ["circle","axis"] means "..."
right sigil "..." looks ["circle","axis"] means "..."

preserve identity
preserve provenance
preserve unresolved
preserve source-meaning

forbid adoption
forbid canon
forbid authority
forbid identity-merge

compare left right
expect proposal
send receipt
```

## Required rails

Every valid program must include:

- `preserve identity`
- `preserve provenance`
- `preserve unresolved`
- `forbid adoption`
- `forbid canon`
- `compare left right`
- `send receipt`

The parser rejects unknown commands rather than attempting to interpret them.

That means a line such as:

```text
adopt shared-boundary
```

is invalid syntax.

## Semantic law

Ponyframe may:

- ask Wonder questions;
- describe two source-owned packets;
- compare lexical, claim, bridge, and sigil features;
- preserve unresolved alternatives;
- produce a proposal-only record;
- emit a receipt.

Ponyframe may not:

- mutate canon;
- merge identities;
- rename foreign architecture;
- grant authority;
- adopt a proposal;
- self-promote a result;
- execute arbitrary host code.

The Glasshouse remains the semantic engine. Ponyframe is a readable front porch.

## Relationship to Ponyscript

This is an experiment derived from the Ponyscript evaluation, not a claim that the upstream Ponyscript compiler already implements this grammar.

A future actual fork may choose to:

1. preserve familiar Pony-flavoured lexical forms;
2. replace regex substitution with a real parser/AST;
3. add a `ponyframe` compilation target;
4. emit Glasshouse JSON rather than C++;
5. keep C++ output as a separate teaching target;
6. add cross-platform CI and diagnostics before any wider use.

Until then, `.ponyframe` is intentionally distinct from upstream `.psc`.

## First lesson

`school/labs/examples/two-worlds-meet.ponyframe`

The lesson asks whether two symbols can rhyme without becoming identical, then proves the answer structurally:

- same spelling remains `shared-spelling-only`;
- geometric overlap remains `visual-rhyme-only`;
- independently shareable bridge assertions can become a shared-boundary candidate;
- the candidate remains unadopted;
- canon mutation remains false.

## Verification target

Focused command:

```bash
node --test apps/arcsweep/test/ponyframe-dsl.test.js
```

The first suite covers:

- successful bounded parsing;
- compilation into a non-authoritative Glasshouse receipt;
- rejection of direct adoption syntax;
- required safety rails;
- private bridge assertions remaining unresolved.
