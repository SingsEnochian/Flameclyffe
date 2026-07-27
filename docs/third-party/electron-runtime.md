# Electron runtime provenance

Arcsweep's repaired Windows test line pins:

- Electron `43.2.0`
- electron-builder `26.15.3`

The packaged workflow writes `RUNTIME-RECEIPT.json` containing the application version, exact runtime and builder versions, Node build version, source commit, workflow run, and generation timestamp. This receipt accompanies both installer and portable artefacts.

Electron and electron-builder retain their upstream licences and notices. No Electron source is copied into Flameclyffe.
