# Earth Gate Telemetry v1

**Status:** experimental runtime adapter  
**Math spine:** `hearthgate.math-spine/v1.8`  
**Canonical PREMAQC contract:** `P,C,R,E,M,A,Q`

Earth Gate Telemetry v1 turns the symbolic hardware vocabulary into receipted software instrumentation without redefining PREMAQC semantics.

## Pipeline

```text
synthetic or recorded session telemetry
  -> Earth Gate telemetry adapter
  -> operational indices + PREMAQC bearing
  -> optional Vala Work matrix_stream frame
  -> Supabase Realtime
  -> ArcSweep / Hearthgate display
```

## Archetypes

### RA-90

Symbolic role: Joy & Resonance Amplifier  
Runtime implementation: Adaptive Runa Session Controller

Operational indices:

- `presence_grounding`: bounded calibration proxy from explicit IBI stability or HRV/reference ratio
- `audio_lock`: closeness of observed audio frequency to the addressed target
- `haptic_lock`: closeness of haptic cadence to the addressed target
- `resonance_lock`: mean of audio and haptic lock
- `coherence_index`: mean of presence-grounding and resonance lock
- `affect_report`: optional firsthand 1–5 rating projected to 0–1
- `modulation_velocity_hz_per_sec`: cadence adaptation rate
- `adaptive_quality`: operational composite only; **not a PREMAQC axis**

PREMAQC bearing may estimate `P`, `C`, and `R`. `E` and `M` remain unasserted unless their own observations exist. `A` remains unasserted unless an explicit agency/control measure is supplied. `Q` records only the presence or absence of an explicit firsthand qualia report and is never inferred as a magnitude.

### Temporal Anchoring Rod

Symbolic role: spacetime steady-lock  
Runtime implementation: Deterministic State Checkpoint Engine

The checkpoint packet is canonical-JSON encoded and digested with SHA-256. Identical packets produce identical digests. This is a digest, not a signature. Replay fidelity remains `null` until an actual replay comparison has been performed.

### Chrono-Spatial Matrix Grid

Symbolic role: perimeter routing boundaries  
Runtime implementation: Time-Indexed Coordinate Topology & State Graph

Prototype thresholds retained from the original test proposal:

- drift `< 0.005`: `EXCELLENT`
- drift `>= 0.005` and `< 0.010`: `DEGRADED`
- drift `>= 0.010`: `TOPOLOGY_CHANGE`

These are experimental classifier thresholds, not physical laws.

## CLI

Print a receipt:

```powershell
node scripts/earth-gate-telemetry.mjs "RA-90" '{"hrv_rmssd_ms":62.4,"audio_frequency_hz":432.1,"haptic_cadence_bpm":65,"user_rating":5}'
```

Publish the same receipt into Vala Work:

```powershell
$env:VALA_SUPABASE_URL = "https://frqrxmshxftpylwdtsdm.supabase.co"
$env:VALA_SUPABASE_SECRET_KEY = "<local secret>"
node scripts/earth-gate-telemetry.mjs "RA-90" --file .\telemetry.json --publish --step 1
```

Server credentials remain local. Browser code continues to use only the Vala publishable key and read-only RLS policy.

## Claims boundary

Every receipt reports:

```json
{
  "calibration_status": "experimental",
  "physical_claim": false,
  "medical_claim": false
}
```

The adapter measures and transforms supplied telemetry. It does not claim the symbolic hardware names are validated physical devices, and it does not treat synthetic calibration indices as medical interpretation.
