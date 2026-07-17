# Signal Well: Installable Core and Adapter Boundary

**Date:** 2026-07-17  
**Status:** Implemented in PR #71  
**Applies to:** STARWELL, Hearthgate desktop packaging, Signal Well, radio hardware and telescope archive integrations

## Decision

Signal Well ships in every Hearthgate installer as a first-class STARWELL room.

The bundled core includes:

- CSV and JSON signal ingest;
- waterfall rendering;
- time/frequency selection;
- a human-led candidate ledger;
- RFI comparison and annotation;
- immutable source receipts;
- JSON session and CSV candidate export;
- Radio JOVE live observatory listening.

Specialist hardware drivers, large scientific file decoders, telescope archive clients, and sonification engines remain optional Signal Well adapters.

## Governing sentence

> The instrument belongs in the House. The antennae and specialist ears may be fitted as needed.

## Bundled Radio JOVE adapter

`radio-jove-live` is the first bundled acquisition adapter. It presents the official Radio JOVE live observatory product inside Signal Well:

- live spectrograph view across approximately 16–24 MHz;
- live radio audio centred near 20.1 MHz;
- station and source attribution;
- direct access to the official source and live channel.

The first slice embeds the live observatory product. A later local bridge will convert live numeric readings into native Signal Well time/frequency/intensity points for marking and export.

## Hybrid model

```text
Bundled Signal Well core
= inspect, listen, mark, compare, annotate, preserve, export

Optional adapters
= acquire from local hardware, decode large formats, query archives, or sonify specialised sources
```

Keeping the sifter and first public live ear in the base installer means every Hearthgate installation can listen immediately and can inspect local datasets without another installation step.

Keeping specialist integrations modular prevents the installer from accumulating platform-specific drivers and heavyweight scientific runtimes that many installations will never use.

## Packaging contract

The Windows package must contain:

- `/starwell/signal-well/`;
- `/starwell/modules/signal-well.module.json`;
- `/starwell/modules/signal-well/adapters/radio-jove-live.adapter.json`;
- all compiled assets required to run the local sifter.

Packaging checks fail when the room, module manifest, or bundled Radio JOVE adapter is absent.

## Adapter contract

Adapters target Signal Well API version `0.1.0` and are discovered beneath the Hearthgate data directory:

```text
modules/signal-well/adapters/
```

Adapter kinds include live stream, radio hardware, telescope archive, binary decoder, and sonification.

The next adapters are SDRplay RSP1B capture, Breakthrough Listen archive access, Filterbank/HDF5/FITS decoding, and IQ/audio sonification.

## Data boundary

Raw recordings remain immutable.

Selections, classifications, confidence, notes, cross-checks, and interpretations are appended beside the source. Automated tools may surface candidates later, but they do not silently classify or discard source material.

## Seal

Bigger antenna. Better archive. Our hands on the sieve.
