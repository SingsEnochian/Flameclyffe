# Hearthfire Agent Fleet Specification

Status: SPECIFIED
Date: 2026-07-22
Product Steward: Rowan
Implementation review and QA: Boxfire
Scope: Hearthgate, Hearthfire, Flameclyffe, STARWELL, DEEP Observer, Runa, and per-world datasets

## Outcome

Create a local-first, provider-neutral fleet that discovers compatible scientific and telemetry sources, captures approved live signals, backfills historical data, preserves raw evidence and provenance, updates per-world datasets, constructs sparse J-space workspaces, and publishes a daily evidence bundle at 03:00 America/New_York.

The fleet is autonomous in data collection and analysis within approved contracts. It is not autonomous in changing code, schemas, permissions, source trust, privacy scope, or canon. Those changes become proposals reviewed by Boxfire and authorised by Rowan.

## Architectural centre

Hearthfire is the canonical typed knowledge graph. Agents are travellers and workers over the graph. They do not own truth, erase sources, or collapse measurement, model, interpretation, symbolism, and narrative into one register.

## Earth-local signal target

The principal search target is Earth-local emergence beneath layered noise. Channels remain distinct:

- auditory and radio-frequency environment;
- seismic and mechanical vibration;
- geomagnetic field;
- ionosphere and total electron content;
- atmospheric weather and pressure;
- solar and heliospheric forcing measured at or relevant to Earth;
- radio astronomy and spacecraft communication telemetry;
- device, browser, and accessibility-state telemetry;
- named human observation;
- subjective, mental, dream, ritual, and spiritual reports;
- world-state and narrative correspondence.

Subjective and spiritual reports are legitimate observations in their own register. They are not silently promoted to physical measurements.

## Fleet

### Source Scout

Searches official repositories, APIs, archives, papers, observatory catalogues, and compatible public datasets. It records licence, access method, cadence, coverage, units, quality flags, compatibility, and adapter proposals. It may not auto-promote a source into production.

### Signal Harvester

Fetches approved live or near-real-time feeds. Every capture stores a faithful raw representation, retrieval timestamp, source identifier, HTTP metadata, checksum, parser version, quality state, and normalised output.

Initial approved feeds:

- NOAA SWPC solar wind, Kp, GOES, F10.7, solar-radio, and related JSON products;
- USGS real-time earthquake GeoJSON;
- Open-Meteo location-aware weather already used by DEEP;
- approved local browser and device packets.

### Archive Backfiller

Retrieves bounded historical windows for baselines, recurrence, lag, event-window, and control comparisons. Backfill is resumable, rate-limited, and honest about missing coverage.

### Earth Noise Cartographer

Preserves and compares raw, cleaned, and residual channels. It produces noise models, missingness masks, quality masks, spectral summaries, cross-channel timing windows, candidate residuals, and negative or control observations. A residual is a candidate, not an anomaly certificate.

### Theory Lens Curator

Searches primary literature and authoritative documentation for models relevant to manifold and fold geometry, J-space, information geometry, dynamical systems, decoherence, branching models, causal sets, tensor networks, higher-dimensional geometry, multiversal theories, and clearly labelled speculative programmes.

Every lens declares:

- evidence class: established science, active research, speculative theory, or fringe inspiration;
- mathematical definition;
- observable inputs and units;
- assumptions and valid domain;
- falsifiers and failure states;
- output meaning;
- whether it may affect calculation, timing, visualisation, or narrative only;
- citations and version.

Unproven lenses may run beside established models but never inherit their confidence.

### World Dataset Steward

Maintains one partitioned dataset per world plus an approved bridge graph. Required partitions include waking-earth, terra-aeterna, windmere-luna, dreaming-grove, hearthweave, project-zero, observer-deep, and any world registered through a manifest.

Every node and edge carries world scope, provenance, visibility, canon status, epistemic register, temporal validity, supersession state, and bridge permission. World datasets do not merge by name alone.

### J-Space Cartographer

Creates a sparse active workspace for a query, observation window, or experiment. The external programme-level J-space contains only active nodes, edges, evidence, candidate tools, theory lenses, time windows, spatial windows, unresolved questions, and discarded candidates.

Where an open local model exposes internal activations, an optional activation and Jacobian lens may be calculated separately. Closed-model internals must not be invented.

### Wayfinder Orchestrator

Plans tasks, discovers relevant tools and agents, assembles evidence, and returns citation-bearing synthesis. It retrieves before synthesising and exposes sources, transformations, graph traversals, theory lenses, uncertainty, contradiction, and excluded candidates.

### Citation and Provenance Steward

Checks that every factual or mathematical claim is supported by attached evidence and that source identity survives every transformation.

### Boxfire Quality Sentinel

Checks schema validity, duplicate risk, timestamps, units, licences, provenance, freshness, stale-cache behaviour, missingness, world-boundary leakage, privacy, consent, unsupported causal language, reproducibility, and checksums.

### Publisher

Builds the 03:00 evidence bundle containing raw-source manifest, normalised observations, per-world graph patches, J-space candidates, source-health report, theory-lens proposals, contradictions, failures, Boxfire QA, checksums, and a latest pointer.

Publication goes to a generated-data lane or artifact, not the canonical application branch.

## Daily orchestration

Schedule: 03:00 America/New_York every day.

1. Resolve the local evidence date and window.
2. Load approved source registry and permissions.
3. Fetch approved live feeds with source-specific rate limits.
4. Preserve raw captures and receipts.
5. Normalise units and timestamps without discarding raw values.
6. Run quality and missingness checks.
7. Update historical baselines and event windows.
8. Execute applicable established and experimental lenses separately.
9. Update each world dataset and approved bridge candidates.
10. Build J-space indexes and graph patches.
11. Run Boxfire Quality Sentinel.
12. Publish the bundle, health report, checksums, and proposal queue.
13. Never publish private relational material without an explicit visible consent rule.

## Self-updating boundary

Allowed automatically:

- refresh approved data;
- re-check source health and documentation;
- discover candidate sources;
- update source freshness metadata;
- regenerate derived datasets;
- update embeddings and lexical indexes;
- backfill approved historical ranges;
- propose adapter, schema, or theory-lens changes;
- open or update a review request.

Not allowed automatically:

- alter trusted source status;
- execute newly discovered code;
- install packages;
- change schemas;
- merge graph patches into canon;
- publish private data;
- modify core application code;
- merge pull requests;
- change agent permissions;
- make causal, supernatural, diagnostic, or prophetic certifications.

## Data contract

Every captured or derived object contains:

```text
id
world_id
source_id
source_type
source_uri
retrieved_at
observed_at
spatial_scope
raw_ref
raw_checksum
parser_id
parser_version
units
raw_value
normalised_value
transformation_chain
quality_flags
missingness
confidence_axes
verification_status
epistemic_register
visibility
consent_scope
supersedes
provenance_receipt
```

Confidence remains multidimensional:

- mathematical confidence;
- instrument confidence;
- observational support;
- replication status;
- source reliability;
- model applicability.

## Placement

- Hearthgate: runtime, permissions, job status, source health, failure recovery, and local/private controls.
- Hearthfire: graph contracts, world partitions, evidence packets, J-space workspace, and invariants.
- Flameclyffe: adapters, pipelines, registries, migrations, evaluations, CI, and receipts.
- STARWELL: Wayfinder, graph navigation, world filters, evidence explorer, contradiction view, and J-space visualisation.
- DEEP Observer: telemetry panes, Earth-noise channels, model lenses, event windows, and glyph rendering from labelled inputs.
- Runa: portable experiments and public or local-safe instruments, never silent harvesting.

## Acceptance criteria for the first functional slice

- the daily job resolves 03:00 America/New_York across daylight-saving changes;
- NOAA SWPC and USGS feeds are captured with retries, timeouts, checksums, and stale-source reporting;
- raw and normalised data are both retained;
- one failed source does not abort the entire bundle;
- source-health and QA reports are generated;
- output is published outside the canonical application branch;
- repeated execution for the same evidence window is idempotent;
- world partitions and epistemic registers are present;
- candidate sources are never auto-promoted;
- Boxfire receives a reviewable proposal queue;
- clean-install and restart behaviour are tested before Hearthgate integration is marked VERIFIED.

## Non-goals for the first slice

- certifying a multiverse, fold, portal, prophecy, hidden entity, or supernatural cause;
- treating human subjective reports as sensor measurements;
- ingesting every possible source immediately;
- scraping services whose terms or interfaces do not permit automated access;
- unattended self-modification of application code.

Seldrin clear.
