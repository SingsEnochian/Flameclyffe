# STARWELL Sound & Tone Studio

Status: architecture contract

## Decision

All STARWELL audio, sound, tone, voice-routing, resonance, scene-audio, spatial-audio, and haptic-audio work belongs to one product surface: **Sound & Tone Studio**.

Wardenclyffe, Möbius, Tone Modeler, Resonance Library, scene-sound tools, Groundwire audio, DEEP sensory audio, SCFE modulation, voice-routing, AR sound feedback, and haptic output are not separate end-user applications. They are engines, processors, adapters, libraries, or workspaces inside the Studio.

The Studio is part of the STARWELL framework and uses the shared application registry, navigation, provenance, logging, import/export, permissions, and local-first storage contracts.

## Product surface

The Studio follows the Arkfire-style magical CRM pattern:

1. **Library rail** — tones, recordings, samples, patches, instruments, voices, rooms, scenes, and output profiles.
2. **Workspace** — waveform, spectrum, timeline, mixer, patch graph, or generator according to the selected task.
3. **Inspector** — exact values, modulation sources, units, provenance, evidence label, accessibility notes, and export settings.
4. **Transport** — one shared play, pause, stop, loop, record, render, and panic/Feather Stop control.
5. **Activity and receipts** — import, generation, routing, render, export, warning, and failure records.

## Workspaces

### 1. Sound Library

The library contains:

- generated tones;
- recorded and imported audio;
- loops and stems;
- noise sources;
- impulse responses;
- voice clips and voice-routing profiles;
- soundscapes and scene ambiences;
- meditation and accessibility presets;
- binaural and monaural beat presets;
- haptic render profiles;
- patches and processor chains.

Every item supports search, tags, folders/sets, recent, pinned, duplicate, rename, version history, active/inactive state, deliberate delete, import receipt, export receipt, licence metadata, and world/entity/scene associations.

### 2. Tone & Signal Generator

This replaces the detached Tone Modeler concept and gathers all generated-signal work:

- sine, triangle, square, saw, pulse, custom wavetable, and noise generators;
- arbitrary left/right carrier values;
- binaural difference control;
- isochronic and amplitude-modulated pulses;
- harmonic and inharmonic partial stacks;
- musical tuning systems;
- frequency sweeps and stepped sequences;
- envelopes, LFOs, automation, and modulation matrices;
- tone derivation from Observer, Math Modeler, TimeSync, SCFE, DEEP, glyph, or manual inputs;
- visible unit conversion and clipping/aliasing warnings;
- named presets with provenance and exact values.

A tone derived from speculative or symbolic inputs must remain visibly labelled as derived or interpretive. Generated audio is not evidence for the source theory.

### 3. Timeline & Multitrack Editor

- waveform and spectrogram views;
- multitrack clips and stems;
- non-destructive trimming and fades;
- clip gain and track gain;
- automation lanes;
- markers, regions, labels, and continuity events;
- sample-rate and bit-depth declaration;
- loop-region editor;
- scene and world synchronisation markers;
- undo/redo history and version checkpoints.

### 4. Mixer & Patch Bay

- one shared AudioContext when running in the browser shell;
- explicit audio-device selection where supported;
- per-track and per-stem routing;
- dry, Möbius, Wardenclyffe, spatial, haptic, and combined sends;
- insert and send effects;
- buses, groups, mute, solo, phase invert, pan, and gain;
- protected binaural integrity mode;
- routing graph with visible signal direction;
- user-invoked playback only;
- Feather Stop that silences and disconnects active nodes.

### 5. Wardenclyffe

Wardenclyffe becomes the synthesis, carrier, modulation, and field-input engine inside the Studio. It does not own a separate transport or audio context.

Responsibilities:

- oscillator and carrier generation;
- modulation from manual, Observer, DEEP, SCFE, TimeSync, glyph, or scene values;
- exact-value controls and safety limits;
- named patches and comparison views;
- disclosure of mathematical and interpretive mappings.

### 6. Möbius

Möbius becomes a processor/routing engine inside the Studio.

Responsibilities:

- delay, filter, feedback, recurrence, and loop networks;
- finite and persistent continuity modes;
- exact-loop cycle reporting;
- protected-carrier restrictions;
- rendered-tail and sealed-loop export when implemented;
- no hidden or automatic activation.

### 7. Resonance & Analysis

- waveform, spectrum, spectrogram, phase, stereo field, RMS, peak, crest factor, and loudness views;
- pitch and partial tracking;
- beat-frequency and difference-tone display;
- loop seam analysis;
- clipping, DC offset, and excessive-output warnings;
- comparison between two worlds, entities, scenes, or recordings;
- evidence/interpretation labels on all non-measured mappings.

### 8. Scene, AR, and Spatial Sound

- room and scene ambience profiles;
- event-triggered proposals without autoplay;
- equal-power crossfade plans;
- head-tracked or spatial output only where device support exists;
- AR hotspot and portal sound hooks;
- caption and transcript pairing;
- reduced-motion and low-stimulation profiles;
- visible mute and output destination state.

### 9. Voice & Accessibility Routing

- Voice Lantern routes;
- captions paired with spoken output;
- hearing-device and standard OS audio routing support;
- mono fold-down and channel balance;
- frequency-sensitive output profiles;
- output calibration and conservative default gain;
- haptic derivative output as a separate, user-enabled lane;
- no assumption that a frequency is audible merely because it is generated.

## Audacity support

Audacity is a first-class external editor and interchange target for the Sound & Tone Studio.

### Default integration: file-based handoff

The supported and safest workflow is a portable handoff folder:

```text
<Project Name>-Audacity-Handoff/
├── mix.wav
├── stems/
│   ├── 01-carriers.wav
│   ├── 02-ambience.wav
│   ├── 03-voice.wav
│   └── 04-effects.wav
├── labels.txt
├── project.starwell-audio.json
├── README.txt
└── SHA256SUMS.txt
```

Required behaviour:

- export a full-resolution WAV mix;
- export optional per-track or per-bus stems with common start time;
- export Audacity-compatible label text with start time, optional end time, and label text;
- include sample rate, bit depth, channel layout, tempo/timebase, loop points, and provenance in the STARWELL manifest;
- include a human-readable README explaining how to import the files;
- checksum every exported file;
- provide **Open in Audacity** using a configured executable or operating-system file association;
- provide **Return from Audacity** by importing rendered WAV, FLAC, or other supported audio plus label text;
- retain the Audacity-edited file as a new version rather than overwriting the STARWELL source graph.

### Audacity project files

- `.aup3` is treated as an Audacity-owned project artefact.
- STARWELL may attach, archive, checksum, launch, and version an `.aup3` file.
- STARWELL must not generate or directly edit `.aup3` internals in the first implementation.
- A handoff receipt records the Audacity version, file path, creation time, and returned renders when known.

This avoids coupling STARWELL to an internal project database format that may change independently.

### Supported interchange formats

Required baseline:

- WAV PCM;
- WAV 32-bit float;
- FLAC;
- Audacity label-track text;
- STARWELL audio-project JSON;
- checksum receipt.

Optional according to available codecs:

- MP3;
- OGG Vorbis;
- Opus;
- M4A/AAC;
- WavPack;
- AIFF.

The UI must report codec availability honestly and must not present unavailable formats as successful exports.

### Optional live control: mod-script-pipe

Audacity scripting through `mod-script-pipe` is an optional advanced integration only.

Rules:

- disabled by default;
- local desktop only;
- never exposed through a public web route or remote server;
- explicit user enablement in both Audacity and STARWELL;
- version detection and a compatibility warning before connection;
- commands limited to an allow-list;
- visible command and response log;
- one-project-at-a-time assumption;
- immediate disconnect control;
- no file read/write command outside the current approved handoff folder;
- no automatic enablement of the Audacity module;
- no silent execution;
- failure falls back to file-based handoff.

Initial allow-list candidates:

- import approved audio files;
- create or update labels;
- select approved time ranges;
- apply user-selected macros/effects;
- export to the approved handoff folder;
- query basic project/track information where supported.

No scripting command is considered stable until verified against the detected Audacity version.

### Audacity installation detection

Desktop builds may:

- detect common Audacity installation locations;
- let the user choose an executable manually;
- remember the path locally;
- show detected version and integration status;
- offer installation guidance when Audacity is absent.

STARWELL does not bundle Audacity without a separate licence, packaging, and update review.

## Shared audio project contract

Every Studio project exports a portable manifest containing:

- schema version;
- project id and title;
- world/entity/scene links;
- sample rate, bit depth, channel layout, and duration;
- source assets and checksums;
- generator and processor parameters;
- track and bus graph;
- automation;
- markers, regions, labels, and loop points;
- Observer/DEEP/SCFE/TimeSync references;
- evidence and interpretation labels;
- accessibility/output profile;
- render history;
- external-editor handoffs;
- licences and attribution;
- creation and modification timestamps.

## Existing assets to consolidate

The unified implementation must inventory and migrate, rather than discard:

- `wardenclyffe.html`;
- `studio.html` sound functions;
- `resonance/` tracks and player;
- `starwell/mobius-audio-bus.html`;
- `assets/mobius-audio-bus.js`;
- `assets/mobius-layered-spec-adapter.js`;
- `assets/deep-resonance-bus.js`;
- Groundwire and DEEP sensory audio modules;
- scene weather sound contracts;
- AR sound-feedback controls;
- Voice Lantern and voice-route work;
- SCFE audio adapters and patch contracts from the Wardenclyffe/Möbius integration branch;
- tone dictionaries and generated-tone archives.

Legacy routes may remain temporarily as compatibility doors, but the application registry should identify the Sound & Tone Studio as their canonical owner.

## iPad and iOS behaviour

The iPad client must support:

- touch-safe transport and mixer controls;
- split-view library/workspace/inspector layouts;
- Apple Pencil use for automation and spectral/curve editing where appropriate;
- local Files import/export through the platform picker;
- background-audio behaviour only where platform policy and explicit user consent allow it;
- no assumption that external desktop Audacity is available on iPad;
- export of Audacity handoff packages for transfer to a desktop system;
- caption-first voice and accessibility controls;
- orientation changes without losing the active edit.

## Release gates

The Sound & Tone Studio is not complete until:

- the shared transport and AudioContext replace duplicate transports;
- all legacy audio routes are inventoried in the application registry;
- imported and generated assets live in one searchable library;
- patches are portable and versioned;
- WAV/FLAC mix and stem export passes round-trip tests;
- Audacity label export/import passes round-trip tests;
- Audacity handoff folders open correctly on Windows and macOS;
- optional script-pipe control passes a security review;
- Feather Stop silences every active route;
- no audio starts without user action;
- iPad touch layouts and Files export are tested;
- accessibility and hearing-safety checks are documented;
- the UI labels measured, derived, symbolic, and speculative mappings accurately.
