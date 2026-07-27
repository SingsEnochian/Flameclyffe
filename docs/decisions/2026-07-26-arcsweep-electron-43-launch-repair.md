# Arcsweep Electron 43 launch repair

## Observation

Physical Windows launches of the installed and portable Arcsweep 0.2.1 builds terminate before a visible window appears with deterministic exception code `0xC0000005` at the same Electron offset.

## Decision

Rebuild the existing 0.2.1 physical-test line against exact Electron `43.2.0` and exact electron-builder `26.15.3`. Do not treat successful packaging as launch verification.

## Proof required

1. Desktop dependencies resolve from a committed package lock.
2. The packaged runtime receipt names the exact Electron, builder, Node, source commit, and workflow run.
3. The unpacked executable remains alive during a normal Windows launch smoke test.
4. Arcsweep records a visible-window event in its desktop diagnostics.
5. Installer and portable artefacts carry SHA-256 receipts.
6. A physical Windows machine launches the repaired artefact without the prior access violation.

## Boundary

The hosted Windows runner can prove that the packaged application launches in its own Windows environment. It cannot prove compatibility with Rowan's particular GPU driver. Physical launch remains the release gate.
