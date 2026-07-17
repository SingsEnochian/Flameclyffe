# Signal Well: Installable Core and Optional Adapter Boundary

**Date:** 2026-07-17  
**Status:** Accepted for implementation  
**Applies to:** STARWELL, Hearthgate desktop packaging, Signal Well, future radio hardware and telescope archive integrations

## Decision

Signal Well ships in every Hearthgate installer as a first-class STARWELL room.

The bundled core includes the local sifting instrument:

- CSV and JSON signal ingest;
- waterfall rendering;
- time/frequency selection;
- a human-led candidate ledger;
- RFI comparison and annotation;
- immutable source receipts;
- JSON session export and CSV candidate export.

Hardware drivers, live network feeds, large scientific file decoders, and specialist sonification engines are installed as optional Signal Well adapters.

## Governing sentence

> The instrument belongs in the House. The antennae and specialist ears may be fitted as needed.

## Why the hybrid model

Keeping the sifter in the base installer means every Hearthgate installation can open, inspect, classify, and preserve signal datasets without a second installation step.

Keeping external integrations modular prevents the installer from accumulating platform-specific drivers, heavyweight scientific runtimes, and hardware dependencies that many installations will never use.

The distinction is therefore:

```text
Bundled Signal Well core
= inspect, mark, compare, annotate, preserve, export

Optional adapters
= acquire, decode, stream, convert, or sonify specialised sources
```

## Packaging contract

The Windows package must contain:

- `/starwell/signal-well/`;
- `/starwell/modules/signal-well.module.json`;
- all compiled assets required to run the local sifter offline.

Packaging checks fail when either the room or its module manifest is absent.

## Adapter contract

Adapters target Signal Well API version `0.1.0` and are discovered beneath the Hearthgate data directory:

```text
modules/signal-well/adapters/
```

Adapter kinds include:

- live stream;
- radio hardware;
- telescope archive;
- binary decoder;
- sonification.

The first planned adapters are Radio JOVE live data, SDRplay RSP1B capture, Breakthrough Listen archive access, Filterbank/HDF5/FITS decoding, and IQ/audio sonification.

## Data boundary

Raw recordings remain immutable.

Selections, classifications, confidence, notes, cross-checks, and interpretations are appended beside the source. Automated tools may surface candidates later, but they do not silently classify or discard source material.

## Release path

1. Bundle Signal Well core in the next Hearthgate installer.
2. Publish the adapter API and discovery loader.
3. Add Radio JOVE and local SDR capture as the first acquisition adapters.
4. Add professional telescope archive and binary-format adapters after the base sifter is stable.

## Seal

Bigger antenna. Better archive. Our hands on the sieve.
