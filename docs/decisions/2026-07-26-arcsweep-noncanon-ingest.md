# Arcsweep non-canon ingest boundary

## Problem

Arcsweep could copy local files into record attachments, but upload itself carried no source classification, review state, checksum, or canon boundary. A copied source could therefore sit beside world records without a reliable distinction between evidence and accepted canon.

Full Arcsweep archive import is a state-replacement and recovery operation. It is not source ingest.

## Decision

Arcsweep adds a dedicated **Non-Canon Ingest** room.

Every newly uploaded file is:

- copied into the private `ingest` directory;
- assigned a SHA-256 digest;
- labelled `canonStatus: non-canon`;
- labelled `reviewStatus: unreviewed`;
- labelled `sourceClass: uploaded-reference`;
- recorded in the append-only local receipt ledger.

The ingest record may advance through review states such as `Under review`, `Reference only`, or `Canon candidate`. It cannot become canon directly. Canon creation remains a separate explicit Steward action outside this milestone.

## Migration

Existing attachment paths beneath `attachments/` remain readable. New uploads use `ingest/`. State normalisation adds an empty ingest collection and a visible ingest applet to existing worlds without altering prior canon records.

## Boundary

This milestone stores and classifies source material. It does not parse documents, extract entities, generate summaries automatically, or promote any source into canon.
