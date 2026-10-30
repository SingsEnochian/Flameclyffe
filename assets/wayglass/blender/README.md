# Wayglass Blender shipyard — v2 geometry proposal (draft)

**Stacked on Codex's PR #508; this is not a finished ship or accepted canon.** The source is PR #506 and the implementation request is Issue #507.

The original #508 blockout was executed by Codex using Blender 5.2.2, producing a local `.blend`, three PNGs, and a `.glb`. Those original artifacts **do not validate this subsequent branch's changes**. A Blender run of the v2 script, fresh renders and an export check are **still required**.

## What changed on this review branch

- Revised the single main deck from 112 m × 27 m to **92 m × 24 m**, with a center elevation of -4.1 m.
- Repositioned eight room markers to X = **-33, -11, +11, +33 m** per port/starboard side, using smaller 21.5 m × 10.2 m room-wall footprints and intact 3 m door openings.
- Moved and reduced the spherical Observer core from (0,0,3), radius 5 m, to **(0,0,7.8), radius 3.3 m**. This creates a proposed elevated Observer object without blocking ground-level circulation; accessible vertical access is still unimplemented.
- Added `layout_audit.py` for a **Blender-free** coarse hull-envelope check. It uses the generator's literal hull stations and room centers and compares them with the expected v1/v2 dimensions.
- Added distinct **editable geometric fixtures** for all eight room blockouts (Observer plinth/sphere, Nikola armillary, Writing Room table and Dabble placeholder, Codex shelves, Atelier workbench, Commons table/benches, Dreaming orb, Return arch), plus downward-directed interior area lights. These are spatial concept objects, not working software controls or functioning portals.

The audit checks all room-volume corners and deck corners against linearly interpolated elliptical sections, plus spherical core-to-corridor overlap. On the original geometry it detects out-of-hull room/deck corners and an obstructed central corridor; v2 passes those **coarse** checks. It does **not** calculate mesh intersections, navigable door paths, accessible clearances, structural strength, or GLB integrity.

## Test without Blender

From repo root:

```powershell
python assets/wayglass/blender/layout_audit.py
python assets/wayglass/blender/layout_audit.py assets/wayglass/blender/build_wayglass.py
```

The first command runs standard-library self-tests and prints `WAYGLASS_LAYOUT_AUDIT_TEST_OK`. The second prints an auditable JSON report. Both have been checked with an independent Python geometry test, but the updated branch has **not** been verified in Blender itself.

## Generate the working scene (Blender 5.2 candidate)

On Windows, from repository root:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python assets\wayglass\blender\build_wayglass.py
```

The script saves to `assets/wayglass/blender/output/`: an editable `.blend`, three PNG renders, GLB and `atlas.json`. It **overwrites this output directory** and clears its *own fresh background Blender scene*, not your existing GUI document. Blender 4.x, current 5.x build, Eevee and browser/WebGL export performance must be confirmed separately.

Coordinate system: metres, **+X bow, +Y port, +Z up**. GLB exporter applies its normal glTF Y-up transformation.

### Rooms and routes

The eight preliminary room volumes are Living Observer, Nikola Research, ArcSweep Writing Room, Universal Codex Library, Atelier, Crew Commons, Dreaming Toybox and Return. These are proposed *spaces*, not proof that all are live N-017 software routes. The Dabble blockout is **not** a connected Dabble API or manuscript transmission. No owner consent or external partner identity is inferred.

## Still to build and verify

1. Run updated v2 scene in Blender and inspect every camera, wall thickness, doors, hull faces and clipping.
2. Move from a hidden opaque envelope to an intentional observable core and structurally plausible cutaway/port system.
3. Test real watertight containment, door clearance and room-to-room navigation. Add multiple decks, accessible lifts and navigation landmarks.
4. Add actual aft propulsion, distinct room designs, measured materials, lighting, reduced motion and optimized Three.js GLB assets.
5. Render an entire exterior/interior atlas from **the same Blender model**, preserve camera/file hashes, then use Runway for cinematic colour and mood only after geometric signoff.

**This branch removes two mathematically detectable geometric problems; it does not close #507.** Maintain separate visual identity: Wayglass the ship ≠ Rarity the Atelier alicorn.
