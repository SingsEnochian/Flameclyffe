# QhyNLP UI Reference

Source: https://codepen.io/Kumplex-music/pen/myddeGQ

Author: Kumplex-music

Original title shown in paste: The complete QhyNLP UI Reference.

Notice in paste: Copyright 2025 Kumplex Media Holdings Group P.L.L.C and Kumplex Media Group LLC.

Category: tabbed documentation UI, DSL reference panel, tool/features/examples layout, utility-style reference page skin.

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

## What the pasted CSS teaches

This is a flat utility-style documentation skin.

Useful parts:

- simple system-font base and readable line height
- centered section wrapper with generous padding
- clear heading and subheading hierarchy
- tab row with active and hover states
- content sections hidden or shown by class
- reusable card surface with hover lift
- responsive grid using auto-fit and minmax
- dark code block for syntax examples
- button, alert, success, border, scrollbar, and pill utility classes
- basic dark-mode hooks for cards and code blocks

## Adaptation targets

- ReferenceTabs
- SyntaxExampleBlock
- FeatureListPanel
- CollapsibleExample
- ToolCardGrid
- CodexReferencePage
- DSLReferencePanel
- reference-page.css
- reference-utilities.css

## DEEP use

Use as a compact reference panel for instrument syntax, patch grammar, consent rules, signal logs, workflow snippets, or internal command examples.

## Wiki use

Use as a page template for language guides, rune/mode syntax, tool inventories, workflow manuals, or Terra Aeterna codex pages.

## Terra Aeterna adaptation notes

- replace the purple utility palette with emerald, gold, ivory, loch green, and moon mauve
- keep the tabbed documentation structure
- make code blocks feel like codex panels rather than generic developer mockups
- use data-driven sections and tool cards
- allow a plain pass version for accessibility and readability

## Implementation cautions

- do not copy the raw markup, class names, or names directly because the pasted source includes an explicit copyright notice
- adapt the general documentation pattern only
- replace inline onclick behavior with React state
- use semantic button elements for tabs
- add aria-selected, role tablist, role tab, and role tabpanel if building accessible tabs
- keep code blocks copyable but clearly labeled
- generate tool cards from data
- avoid relying on Tailwind or DaisyUI-specific classes unless the project explicitly includes them
- avoid scaling cards on hover if it causes layout shift or motion discomfort
