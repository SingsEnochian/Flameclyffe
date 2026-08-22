# PR112 POST-STACK CI TRIGGER FIXTURE RECEIPT

**Timestamp:** 2026-08-22 05:00 EDT
**Branch:** `feature/ipad-somatic-haptics-v1`
**PR:** #112 — iPad somatic compression–release renderer

## Purpose

This is a no-runtime-change fixture receipt whose path intentionally matches the PR CI filters.

The first receipt commit was placed under `docs/handoffs/`, which is correct as documentation but outside the STARWELL Static Bundle and Hearthgate Windows Installer pull-request path filters.

This file lives under `apps/starwell/test/fixtures/` so the fresh post-stack PR #112 workflows attach without modifying runtime code, package manifests, workflow files, renderer behaviour, Bifröst behaviour, tone routing, haptic routing, canon state, release publication, or deployment state.

## Required evidence after this commit

```text
STARWELL Static Bundle:       must run on the new PR #112 head
Hearthgate Windows Installer: must run on the new PR #112 head
Fresh artifact IDs:           required before promotion
Fresh artifact digests:       required before promotion
```

## Promotion boundary

Do not mark PR #112 ready for review, merge, deploy, or publish release artefacts until fresh post-stack CI is green and Rowan explicitly authorises the next transition.
