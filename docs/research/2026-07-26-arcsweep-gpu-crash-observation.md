# Arcsweep Windows GPU crash observation

## Physical evidence

Both the installed and portable Arcsweep 0.2.1 builds crash before launch with Windows exception `0xC0000005` at the same Electron binary offset on every attempt.

## Interpretation

The repeated native offset places the failure beneath ordinary application JavaScript and renderer error handling. The repair therefore replaces the Electron runtime first, while preserving the application code unless the newer runtime exposes a separate incompatibility.

## Epistemic boundary

The deterministic signature supports a runtime or driver interaction diagnosis. It does not by itself identify the exact faulty instruction or prove that every Windows GPU driver will behave identically.
