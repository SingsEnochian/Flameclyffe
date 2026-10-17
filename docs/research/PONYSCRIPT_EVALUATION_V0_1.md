# Ponyscript Evaluation for ArcSweep / Mythience

**Source inspected:** `AlexanderBazarov/Ponyscript`  
**License:** MIT  
**Implementation:** C++ transpiler/compiler front end  
**File convention:** `.psc`

## What it actually is

Ponyscript is a small Friendship-is-Magic-themed language that token-translates Pony-flavoured source into C++, then invokes a C++ compiler.

Examples from the current implementation include:

- `friend` -> `#include`
- `hurf` -> `void`
- `everypony` -> `public`
- `secret` -> `private`
- `libspace` -> `namespace`
- `send` -> `return`
- `neighln` / pony libraries for output-oriented conveniences

The implementation is intentionally thin: regex-driven lexical replacement, class/header extraction, generated C++, and a bundled Windows/UCRT-flavoured toolchain path.

## Good fit

Ponyscript could be delightful as:

- a teaching language inside AI University;
- a playful scenario notation for synthetic Mythframe experiments;
- a constrained DSL front end for simulation scripts;
- an accessibility layer for small C++ exercises;
- a culture-bearing language for Twilight/pony-adjacent labs where the syntax itself makes the work more inviting.

## Bad fit today

Do **not** put authority, canon mutation, constellation identity, or security-critical boundaries directly in the Ponyscript compiler.

Reasons visible in the current code:

- the lexer/parser is shallow token rewriting rather than a robust grammar;
- several loops/indexing paths rely on neighbouring tokens and deserve bounds-hardening;
- the compiler shell path is strongly Windows/UCRT-oriented;
- language-level diagnostics and semantic validation are limited;
- generated C++ inherits all downstream compiler/runtime complexity.

## Recommended ArcSweep posture

```text
Ponyscript source
  -> sealed University / Glasshouse compiler sandbox
  -> generated C++
  -> test-only executable
  -> receipt
  -> proposal

NEVER:
Ponyscript -> direct canon/authority mutation
```

The first useful experiment is a tiny **Mythframe scenario language** that expresses synthetic packets, questions, branches, and expected receipts. The authoritative Glasshouse engine should remain ordinary tested ArcSweep JavaScript until Ponyscript itself has a hardened parser, cross-platform compiler path, and CI corpus.

## Tiny source example

```cpp
int magic(int argc, char *argv[])
{
    string lesson = "Rhyme is not identity.";
    neighln(lesson);
}
```

Treat this as language evaluation, not adoption.
