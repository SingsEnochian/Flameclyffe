# Signal Well Source Array and Live Recording

**Date:** 2026-07-17  
**Status:** Implemented as the next Signal Well slice  
**Branch:** `feat/signal-well-source-array-recorder`

## Decision

Signal Well is not a Jupiter-only receiver. It becomes a source array spanning every public signal family we can presently reach, while preserving a route for our own local hardware.

The initial array contains:

- Radio JOVE: Jupiter, the Sun, galactic background, terrestrial and ionospheric radio;
- e-CALLISTO: global near-live solar dynamic spectra and FITS archives;
- BRAMS: continuous meteor-scatter WAV records and five-minute live spectrograms;
- SuperDARN: live HF radar state, sky noise, operating frequency, and returned-echo products;
- NOAA SWPC: machine-readable solar radio flux and geomagnetic context;
- NASA DSN Now: live deep-space spacecraft radio links and antenna state;
- CHIME/FRB: real-time VOEvent alerts and released dynamic spectra;
- Breakthrough Listen: professional technosignature telescope archives;
- Local STARWELL SDR: direct IQ, audio, waterfall, calibration, and continuous local acquisition when hardware is attached.

## Recording contract

A Signal Well array session records three coordinated layers.

### 1. Media capture

The browser recorder uses display-media capture with system audio requested and writes a local WebM recording. The chosen tab, window, or screen is the media surface captured for the session.

### 2. Machine-feed capture

Selected public JSON feeds are polled at the start of a recording and every 60 seconds thereafter. The first implementation records NOAA solar radio flux and planetary K-index JSON.

### 3. Receipt

Every completed session produces a JSON receipt containing:

- session ID;
- UTC start and end times;
- duration;
- selected source registry entries;
- media filename, MIME type, byte length, and SHA-256;
- every machine-data snapshot;
- session notes;
- local-first provenance.

## Source states

The source registry distinguishes:

- `live`;
- `near-live`;
- `live-data`;
- `live-status`;
- `live-alerts`;
- `archive`;
- `hardware-adapter`.

This keeps continuous streams, delayed station uploads, event alerts, archives, and future local receivers in one array without pretending they share one cadence.

## Next acquisition adapters

The next sidecar layer will acquire sources directly in the background rather than through a chosen display surface:

1. e-CALLISTO FITS and quicklook downloader;
2. BRAMS five-minute WAV and spectrogram ingest;
3. SuperDARN WebSocket client after stream addresses are provisioned;
4. CHIME/FRB VOEvent subscriber after service registration;
5. Breakthrough Listen archive downloader and `.fil`/HDF5 reader;
6. SDRplay/local SDR IQ and audio recorder;
7. headless multi-source scheduler with bounded local storage and rotation.

## Governing line

> Not one antenna pointed at one answer. An array, recording the whole field.
