# Universal Codex reference batch: Farpoint Weyr + The Hajra Child

## Ingested sources

### Farpoint Weyr Practice Pad

Drive source:

`https://docs.google.com/document/d/1tvpx5mb7S5dvdssMsy17DM6BXME4r6zvtowQ3EELS1U`

Reference ingest:

`apps/arcsweep/skills/sources/drive/farpoint-weyr-practice-pad-reference.v0.1.json`

Mechanisms carried into the Universal Codex design layer:

- protective filters can create blind spots while still reducing noise;
- interrupted anomaly/distress signals remain partial receipts rather than completed narratives;
- an observed sequence marker is not, by itself, a causal explanation;
- environmental conditions can degrade evidence before assessment;
- compact visual/task handoffs should preserve sender, time, and verification state;
- companion channels remain separate from primary work and authority;
- context can shift the interface from social ambient mode into focused investigation without erasing prior state.

Candidate UI grammar:

`baseline -> filtered sensing -> weak anomaly -> interrupted signal -> preserved partial receipt -> scoped investigation`

### The Hajra Child

Drive source:

`https://docs.google.com/document/d/1ph-5tCceSM7XkCEydhHFJ7WD9ebOQU62hl7dpxB4OW8`

Reference ingest:

`apps/arcsweep/skills/sources/drive/the-hajra-child-reference.v0.1.json`

Mechanisms carried into the Universal Codex design layer:

- engineered training environments remain models, not the world they model;
- nonverbal images, affect, rhythm, and sensation must remain distinguishable from a participant's verbal interpretation;
- persistent artefacts can carry provenance across a discontinuity;
- identity/context can be reconstructed from sparse anchors without inventing an inaccessible interval;
- transformation can preserve lineage while changing capability or perspective;
- access-scoped or staged knowledge remains scoped rather than becoming universal truth.

Candidate continuity grammar:

`known prior state -> discontinuous transition -> unknown interval -> anchor recovery -> self-identification -> partial context restoration -> transformed active state with gap preserved`

This fits the existing ArcSweep identity-path work particularly well: a path may contain a gap without the system fabricating the missing segment.

## New laws added to the lab

- **A filter may protect and still create a blind spot.**
- **An interrupted signal remains partial evidence.**
- **Evidence quality is part of provenance.**
- **Translation is interpretation, not the raw signal.**
- **A continuity gap is not permission to invent the missing interval.**
- **Recovered identity does not retroactively explain an unknown transition.**

## Pending Drive sources from the same batch

The following two Rowan-supplied Docs could not be read by the connected Drive account. Both returned Google Drive permission/not-found responses through the connector, so no title or mechanism content has been guessed and no ingest has been fabricated:

- `https://docs.google.com/document/d/1bqc3l9-C_CbERvPjPefnQJztgVjK7JGag-qiH87aRIo`
- `https://docs.google.com/document/d/1T0mKIwwyVFX9fkD2Gf_W2HOWWk4WTo0jm0ZdF-0vKGo`

Once readable, they should be processed under the same reference-only boundary.

## Seal

Preserve the signal that arrived.
Preserve the gap that did not.
Do not let the projection invent either one.
