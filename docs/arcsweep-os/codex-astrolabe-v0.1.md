# Universal Codex Astrolabe v0.1

Status: prototype instrument

## Purpose

Astrolabe v0.1 is the first computational astronomical instrument in the Universal Codex cabinet. It must earn its rings by computing a real reading.

The first plate accepts:

- observer latitude
- observer longitude
- observation instant

It independently computes:

- Julian date
- Greenwich mean sidereal angle
- local sidereal angle
- approximate solar ecliptic longitude
- approximate solar right ascension and declination
- solar hour angle
- local solar altitude
- local solar azimuth
- above/below-horizon state

The dial changes only after an explicit reading request and then rests at that reading.

## Input and privacy boundary

Coordinates are entered manually by default.

Device geolocation is available only behind the explicit **Use Device Position** control. It is never requested during boot or ordinary cabinet use. The Astrolabe sidecar does not persist coordinates or readings to its own storage.

## Authority boundary

`hearthweave.codex-astrolabe-reading/v0.1` is an approximate astronomical computation. It is not:

- a navigation-grade ephemeris
- an assertion of observed sky conditions
- a full historical astrolabe reconstruction
- a source of canon, identity, memory, or agent authority

The first plate deliberately stops short of claiming the full stereographic rete/tympan geometry of historical astrolabes.

## External reference boundary

`dcf21/astrolabe` is used as a research/reference specimen for the historical instrument concept. That repository is GPL-3.0.

No source from that repository is copied, adapted, vendored, or imported into Flameclyffe by this slice. The astronomical implementation in `codex-astrolabe-model.js` is independently written from standard astronomical coordinate relationships.

## Motion law

The Astrolabe obeys the Codex motion law:

1. no autonomous rotation
2. no liveness animation
3. a user-requested reading may settle the rings once
4. the settled reading is the quiet state
5. reduced-motion mode removes the transition without removing the computed information

## Later plates

A later version may add historically grounded stereographic projection, rete/star pointers, altitude/azimuth grids, and sighting/alidade interaction. Those additions must preserve the v0.1 reading contract and must distinguish historical reconstruction from modern computed overlays.
