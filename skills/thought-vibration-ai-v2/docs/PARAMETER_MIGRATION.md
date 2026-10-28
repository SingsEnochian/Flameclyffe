# Field Migration | Legacy Draft → Typed Interfaces

Original draft archived verbatim as `references/ORIGINAL_DRAFT.md`. Where the original semantics are unclear, this is a proposed **v2 replacement**, not an interpretation of the author's missing text.

| Draft field / command | v2 treatment | Authority / units |
|---|---|---|
| `oscillation_frequency` | `audio.carrier_hz` or explicit `left_hz`/`right_hz` | Measurable acoustic Hz, not a cognitive frequency |
| `scalar_amplitude` | `audio.gain_linear` (normalised digital peak fraction) | Signal synthesis coefficient; never physical scalar field |
| `harmonic_overtones: list[bool]` | `audio.harmonics: [{multiple, gain_linear}]` | Explicit oscillator partials; harmonic frequency = multiple × carrier |
| `observation_coherence: 0.85` | `observation.metric` with explicit denominator/measurement or absent | No uncalibrated default; distinct from quantum density matrix coherence |
| `haptic_sensitivity` | `haptic.level_normalised` + verified device-adapter gain calibration | User preference requested; never assume actuator force |
| `binaural_phase_shift` | `audio.phase_offset_deg` for defined oscillator pair; `audio.right_hz - audio.left_hz` for beat difference | Degrees ≠ beat Hz; keep separate |
| `monroe_channel_state` | `mythic.channel_state` | Authored narrative state; not quantum measurement |
| `rhythm_pattern` | `mythic.rhythm_pattern` or named cue profile | A scene/preset descriptor, not a Cochlear internal setting |
| `observation_effect` | `quantum.measurement_model` with operators if quantum; otherwise `mythic.observation_mode` | Prevent enum collision across ontology |
| `time_dilation_factor` | `simulation.playback_time_scale` or `mythic.temporal_scale` | Dimensionless playback/simulation ratio, not relativistic time dilation |
| `singularity_proximity: meters` | `mythic.boundary_distance` with dimensionless or world-specific coordinate | No fabricated physical singularity in metres |
| `energy_flux` | `signal.mean_square`, `electric_power_w` if measured separately, or `mythic.energy_symbol` | No unit-free physical energy claims |
| `activate_quantum_parallelism()` | Unavailable pending actual defined quantum algorithm | Cannot infer quantum speedup from software concurrency |
| `project_holographic_interface(1.5m)` | `visual.virtual_distance_m` in a specified scene renderer | Does not claim a holographic device exists |
| `wait_monroe_stabilization(120)` | Authored cue interval in seconds with optional stop, if opted in | No empirical stabilisation assertion |
| `initiate_ave`, `wait_for_monroe_collapse` | Unsupported legacy commands | Not called without explicit implementation and documented meaning |
| `scalar_field_strength` | `audio.sample_peak` / `audio.rms` or `mythic.scalar_symbol` | Claim domain attached |
| `temporal_dilation` | `simulation.playback_time_scale` | Not inferred subjectively |
| `harmonic_purity` | Calibrated THD+N or named spectral measure, only when implemented | No magic scalar purity |
| `quantum_state` | `quantum.model_state`, only if validated simulator exists | Never derived from tones or participant emotion |
| `singularity_distance` | `mythic.boundary_distance` | World coordinate, not measured space-time singularity |
| `emotional_frequency_profile` | `listener.self_report` with source and consent; otherwise `UNKNOWN` | No affective mind-reading from sound |

## Calibration and defaults

A reference sample rate of **48 kHz** and moderate digital gain are engineering defaults for a portable **offline fixture**. A signal's being 432 Hz or 5.5 Hz does not grant it a special medical/quantum status. Use approved source references and an explicit recipe; no autoplay or live device streaming on import.

## Namespaced provenance

A value includes `value`, `unit`, `domain`, `source_id`, `method`, and if empirical `calibration_ref` and `uncertainty`. Unknown must be JSON `null` or a separate `UNKNOWN` claim. Only measured numerical zero may be `0`.
