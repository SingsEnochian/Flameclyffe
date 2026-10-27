# Wayglass / Nikola · N-012 geometry and spatial HUD

Status: feature branch in PR #502, not verified on owner's physical Windows/GPU/browser. Not a Vercel deployment. All geometry runs locally. This change neither merges nor deploys nor invokes Crew providers.

## Spatial Observer

- Uses existing root dependency `three`, lazy-loaded after probing WebGL. No unvetted CDN dependency, downloaded texture, external 3D model or fetched geometry.
- Physically lit refractive icosahedral core, clearcoat, copper-brass torus rings, additive aqua reticle, orbital markers, and depth-separated particles. An HTML HUD provides readable focal-channel, current mapped field magnitude and explicit **local/render status**.
- Uses the preexisting Observer packet only: it does not invent or mutate a sensor reading, private interior, route receipt or inference.
- Preserves all original 2D canvas pointer targeting, rotation gestures, side-console sensor provenance and Wayglass Crew navigation.
- WebGL disabled/context lost: original 2D instrument remains available. A separate Three canvas is non-interactive and `aria-hidden`. Pixel ratio <=1.5; capped updates ~35fps; no independent background loop.
- Low Stim / reduced motion makes the Three scene static. Feather pause stops the shared animation and disables sound/haptics as before. Cleanup releases WebGL resources and disconnects ResizeObserver.
- Visual inspiration: 1990s cinematic volumetric holo-optics, observatory astrolabes, navigational HUDs. None of this is implemented AR, volumetric projection, physical transparency, cosmological measurement, or a verified accessibility audit.

## Invariant Research Lens

- **Source of truth:** `starwell/deep-observer/living-observer-atlas.js::geometrySVG`. Extract the first seven *actual SVG* circle centres from Flower of Life and Metatron diagrams. Both share `axialPoint`, so calibration agreement is **by construction**, not independent emergence.
- **Invariant:** RMS-normalised, sorted pairwise Euclidean distance spectrum; ignores point relabelling, rotation, translation, reflection, uniform nonzero scale. It does **not** ignore arbitrary deformation.
- **Positive control:** transformed/relabelled source. **Negative control:** displace one landmark. **Monte Carlo null:** independently scramble angular positions with original centroid radii retained, with fixed seed and count. Shuffling point labels cannot be a null for a permutation-invariant metric.
- Optional **two separately sourced inputs**: user pastes `{"id":"...","provenance":"...","points":[[x,y],...]}` twice, with distinct IDs, enough provenance text, equal counts, and a *preselected* numeric tolerance. Local comparison labels source independence as **unverified** until independently audited; distinct metadata are not independent evidence.
- Explicit click starts calculation; an optional click exports complete JSON+SHA-256 digest. Replay recomputes and hashes submitted and derived data. Default seed 104729, repetitions 399. No silent localStorage, provider calls or server uploads. Inputs remain in the browser unless the user explicitly exports the receipt.
- Null empirical rank is relative to **the chosen null generator only**. It is not a probability that a theory is true, a discovery occurred, AI identities converge, or a universal Lattice is real.

## Evidence ladder and verification still needed

1. Math unit tests and source contracts green in GitHub CI.
2. Vite production build + Hearthgate staging green in CI.
3. Human browser witness: visual layers genuinely render at `/wayglass/?room=observer` from local Hearthgate, original interaction works, Feather and Low Stim control both layers, no WebGL errors or runaway GPU.
4. Reproduce receipt in a separate clean runtime and inspect hashed input/provenance.
5. Only then try truly independent mathematical datasets with prior declared acceptance threshold and counterfactual nulls; retain contradictory tests and negative results in Continuity Ledger.
6. Actual provider/crew responses are a separate independent route proof and not inferred from any of the above.
