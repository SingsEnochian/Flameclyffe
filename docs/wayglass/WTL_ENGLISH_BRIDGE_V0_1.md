# Wyrdrune bilingual core v0.1 · One Ship / Whole Pizza

WTL is the executable source language. The new library
\`lib/wyrdrune/bidirectional.mjs\` adds a **bounded and reversible**
British-English authoring dialect and lossless glyph transport. It reuses the
one WTL compiler and the deterministic WTL→en-GB gloss engine. No second
interpreter, AI-mediated guesswork, model dispatch or executable side effect.

## Supported English programme syntax

    Circuit 1 (shared):
    Perceive:
      Let depth be 1.
    Compress:
      Nothing to do.
    Release:
      Increase depth by one.
    Verify:
      Nothing to do.
    Integrate:
      Nothing to do.
    Choose:
      Offer depth.
    Return:
      Nothing to do.
    Transcend:
      Nothing to do.

The eight phase headings are required, in order. A programme may have multiple
numbered circuits; \`carried\` means \`mobius scoped\`. Instructions include
Let, Set, Increase by one, Require with optional refusal reason, Declare Withness,
Offer, Carry, and Pause at a named frequency. Simple numeric/Boolean/text
expressions and comparisons use constrained British-English keywords.
Complicated expressions may be **explicitly** represented as
\`WTL expression "<verbatim source expression>"\`: the code remains visible,
not deceptively paraphrased. Unknown prose fails closed.

## APIs and integrity

- \`wtlToEnglish(source, {compile})\` compiles without executing and returns
  both a human English program and the canonical existing source gloss.
- \`englishToWtl(english, {compile})\` compiles the resulting WTL without
  executing it; returns canonical WTL source and typed IR.
- \`roundTripWtl(source, {compile})\` requires structural equivalence of the
  typed IR (ignoring source hash differences due to formatting).
- \`wtlToGlyphTransport\` and \`glyphTransportToWtl\` provide a version-tagged,
  reversible UTF-8 rune encoding. **This is a transport encoding**, not
  the final Skýrunor linguistic/semantic glyph grammar. The existing animated
  runic veil remains visual, not reversible.
- No automatic translation is an authorisation to execute, grant capabilities
  or commit a morph. The operator/declaration syntax that the controlled English
  dialect cannot express raises a specific error; no silent loss.

## Road to the full language

This is a core library and conformance step, not yet a UI toggle in
Whole Pizza's Workbench, a complete conversational English compiler, or
full semantic Skýrunor. Next integration is an editable three-face
WTL / en-GB / glyph view, preserving authorship and handling source
changes and explicit execution consent. Then extend typed-IR coverage
and test multi-language source maps before calling it universal.

Canonical development: \`wayglass/current\`; integrate this source candidate
from existing Whole Pizza PR #676 through One Ship #661 and ledger #583.
