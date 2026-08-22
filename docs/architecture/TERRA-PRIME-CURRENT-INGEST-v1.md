# Terra Prime Current Ingest v1

**World:** Terra Prime  
**Time relation:** 1:1  
**Intake:** Observer  
**State carrier:** PREMAQC  
**Interpretation:** Spiral / harmonic_state after Observer + DEEP routing

## Purpose

Maintain a current receipted record of Terra Prime so the reference shore of Bifröst is illuminated with present state rather than a static world profile.

## What we ingest

The first registry covers time, astronomy, space weather, Earth systems, geophysics, science/research, selected human-world events, and project-origin observations.

Every adapter preserves source identity, source timestamp, receipt timestamp, raw/source-native payload or durable reference, transformation provenance, freshness state, and the DEEP routes selected by Observer.

## Routing

- discrete event / narrative context → DEEPStory;
- temporal sequence / changing measurement → DEEPTime;
- theory, analysis, pattern candidate → DEEPTheory;
- one observation may route to multiple datasets.

PREMAQC receives the receipted/routed state through the Observer pipeline. Downstream organs do not silently bypass the route to read external feeds as if they were PREMAQC values.

## Freshness

Each source declares a source-native cadence and a stale threshold. UI reports `fresh`, `aging`, `stale`, `unavailable`, or `unknown` together with age and last receipt rather than substituting zero for missing data.

## Update semantics

The ingest layer supports:

- append-only event receipts;
- deterministic source/event identity where source supports it;
- duplicate suppression;
- revisions linked to earlier receipts rather than destructive replacement;
- sequence snapshots for DEEPTime;
- source-health receipts for unavailable feeds.

## Terra Prime clock

The base contract is exactly `time_ratio = 1`.

Clock anchors may include UTC, Julian Date, local civil time, source timestamps, lunar/solar geometry and other instrument-specific temporal coordinates. Those are additional coordinates; they do not alter the 1:1 reference relation.

## First UI requirement

Arcsweep shows a Terra Prime shore card containing current clock, Observer freshness, PREMAQC, Spiral state, active source families and receipt count. The bridge reports which lantern is dark whenever required state is missing.
