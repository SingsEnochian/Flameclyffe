# Universal Codex Balanced Spread v0.4

**Date:** 2026-09-22  
**Surface:** Universal Codex facing pages

## Result

At widths above the existing mobile breakpoint, the Codex binding now allocates exactly half of the spread to each page:

`repeat(2, minmax(0, 1fr))`

Both pages occupy the same grid row and explicitly stretch to the same height. The mobile layout remains a single-column fold below `820px`, where equal side-by-side widths are neither available nor useful.

## Acceptance

- left and right computed widths match at desktop/tablet spread widths;
- left and right computed heights match;
- the mobile media rule remains `grid-template-columns: 1fr`;
- page content may scroll the shared stage without changing binding geometry.

## Verification

- focused Codex tests: **12 passed**;
- complete ArcSweep suite: **1,307 passed, 0 failed**;
- production build: **passed**.

## Seal

**Two shores. One binding. Equal parchment.**
