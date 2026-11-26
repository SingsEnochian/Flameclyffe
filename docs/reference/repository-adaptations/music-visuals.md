# Music Visuals repository adaptation

Status: implemented on `wayglass/music-visuals-integration-20261126`; pending CI and visual acceptance.

Source reviewed: https://github.com/both-both/music-visuals

The source project contains a Vite + p5.js + Three.js audio visualisation playground. Its audio module uses the Web Audio API analyser, supports local audio playlists and microphone input, and supplies frequency bins to seven render modes: circles, bars, sound circle, three kaleidoscope variants, and a Voronoi shader. It also includes a draggable four-corner texture mapping surface.

## Wayglass adaptation

The first integration is deliberately native to ArcSweep rather than importing the source project wholesale:

- Adds a Living Sound Visualiser sidecar to the existing StorySoundscape surface.
- Reads frequency-domain data from the existing StorySoundscape master output via an AnalyserNode.
- Does not create a second AudioContext, duplicate StorySoundscape, or replace the sound engine.
- Provides four first-party modes: spectrum, radial, kaleidoscope, and animated cells.
- Includes responsive canvas sizing, a reduced-motion fallback, and explicit disposal.
- Registers the visualiser as a first-class sound organ and loads it through the existing global sidecar scheduler.

## Deliberately not yet integrated

- Independent local-file playlist and microphone inputs. These need explicit source selection, permission UX, track lifecycle, and Feather-safe stop behaviour.
- Four-corner projection mapping. This is a useful later Watercolour / stage-output capability, but should be a separate surface rather than silently altering the Sound Room canvas.
- The source project's exact Voronoi shader and p5 renderers. The new visualiser is an independent implementation, not a copied port.

## Provenance and licence

The source repository's root does not declare a licence. This adaptation therefore uses the repository as a technical reference and independently implements the first-party visualiser. The original project and its contributors should be credited as the inspiration; no source files or shader code have been copied.

## Acceptance still required

- CI passes on this branch.
- ArcSweep Sound Room mounts exactly one visualiser.
- Existing StorySoundscape audio drives the visualiser after the user arms audio.
- All four modes switch without creating additional audio contexts.
- Mobile viewport and reduced-motion behaviour are verified.
- Disposal removes the animation loop and analyser connection.
