# QhyNLP UI Reference

Source: https://codepen.io/Kumplex-music/pen/myddeGQ

Author: Kumplex-music

Original title shown in paste: The complete QhyNLP UI Reference.

Notice in paste: Copyright 2025 Kumplex Media Holdings Group P.L.L.C and Kumplex Media Group LLC.

Category: tabbed documentation UI, DSL reference panel, tool/features/examples layout.

## What the pasted HTML teaches

This is a compact documentation/reference interface for a proposed English-like programming or workflow language.

Useful parts:

- boxed tabs for switching between documentation sections
- separate sections for syntax, features, examples, and tools
- code mockup block for English-like workflow syntax
- feature list with icon-led bullets
- collapsible example panel
- tool cards for linter, tester, and documentation generator concepts
- simple section visibility toggle

## Adaptation targets

- ReferenceTabs
- SyntaxExampleBlock
- FeatureListPanel
- CollapsibleExample
- ToolCardGrid
- CodexReferencePage
- DSLReferencePanel

## DEEP use

Use as a compact reference panel for instrument syntax, patch grammar, consent rules, signal logs, workflow snippets, or internal command examples.

## Wiki use

Use as a page template for language guides, rune/mode syntax, tool inventories, workflow manuals, or Terra Aeterna codex pages.

## Implementation cautions

- do not copy the raw markup or names directly because the pasted source includes an explicit copyright notice
- adapt the general documentation pattern only
- replace inline onclick behavior with React state
- use semantic button elements for tabs
- add aria-selected, role tablist, role tab, and role tabpanel if building accessible tabs
- keep code blocks copyable but clearly labeled
- generate tool cards from data
