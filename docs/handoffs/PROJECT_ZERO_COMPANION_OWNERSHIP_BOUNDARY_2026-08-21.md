# Project Zero Companion Ownership Boundary — 2026-08-21

## Decision

**Project Zero is Nocturne's project.**

Flameclyffe does not own or redefine Project Zero's core, project-management surface, socket/plugin architecture, native themes, persistence, instruments, UI, or release decisions.

The code in `apps/project-zero-companion/` is the **Flameclyffe Project Zero Companion**, an integration/adapter surface.

## Seam

`Nocturne / Project Zero ⇄ agreed connector ⇄ Flameclyffe / Project Zero Companion`

Companion responsibilities may include consented local metadata and folder bindings, reversible bridge events, Flameclyffe House Runtime chat responses, native rich-text Companion documents, theme-interoperability tokens, typed Companion socket envelopes, and adapter-side DEEP / Writer Room / Altar / asset events.

Project Zero decides whether and how to consume those capabilities.

## Namespace law

New Companion contracts use the `flameclyffe.project-zero-companion.*` namespace.

Current schemas include:

- `flameclyffe.project-zero-companion.socket-envelope/v1`
- `flameclyffe.project-zero-companion.theme/v1`
- `flameclyffe.project-zero-companion.rich-text/v1`
- `flameclyffe.project-zero-companion.flame-channel/v1`
- `flameclyffe.project-zero-companion.adapter-event/v1`

Receipts identify `bridge_owner: flameclyffe` / `owner: flameclyffe` and `integration_target: nocturne-project-zero` where applicable.

The Companion adapter registry uses `active-companion-service`; `active-core-service` is prohibited by regression test.

## CI law

The former `Project Zero Core Gate` name is retired.

The active workflow is **Project Zero Companion Bridge Gate** and tests/builds only the Flameclyffe Companion bridge.

Ownership-boundary code and docs have passed the renamed Companion gate. Exact-head verification is recorded by GitHub Actions on the branch rather than treated as Project Zero validation.

## Boundary equations

`Companion compatibility ≠ Project Zero adoption`

`Companion socket delivery ≠ Project Zero fulfilment`

`Companion theme state ≠ Project Zero theme authority`

`Companion transcript ≠ Project Zero canon`

`Flame runtime attestation ≠ Project Zero architectural authority`
