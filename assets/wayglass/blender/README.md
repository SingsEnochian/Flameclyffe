# Wayglass shipyard — first spatial blockout

This is a **draft, not the completed Issue #507 vessel**. It is an editable first study of a single spatial coordinate system, not approved canon or a production-ready model. The proposed visual source is PR #506, and the runtime reference is `docs/wayglass/WAYGLASS_N017_INTEGRATED_SHIP.md`.

On Windows, from the repository root, with Blender 5.2.2:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python assets\wayglass\blender\build_wayglass.py
```

Output is written to `assets/wayglass/blender/output/`: an editable `.blend`, three PNG renders, a GLB and `atlas.json`. The script regenerates those files and will overwrite them. Run in a fresh background Blender process; it clears that process's scene. It does not modify an already-open Blender session. The generation was tested on Blender 5.2.2 only; 4.x compatibility remains unverified. Rendering uses CPU Cycles, not Eevee.

Coordinates are meters, +X toward the bow, +Y port, +Z up. Blender's GLB exporter applies its standard glTF Y-up conversion. The physical room names are draft spatial concepts: Library corresponds to N-017 Library, Crew Commons to Commons, Dreaming to the Toybox/Dream Sandbox concepts, and Return is a proposed room for a cross-cutting workflow rather than an asserted N-017 destination. Organs has no dedicated blockout yet. The Dabble object is a placeholder, not an integration.

The render manifest records the generator hash and distinguishes rendered cameras from planned cameras. The generator checks named collections, nonzero room mesh dimensions, coarse coordinate extents and successful GLB output. These do **not** establish actual tapered-hull containment, collision-free connectivity, navigability, GLB performance, web integration or camera quality.

Known gaps: the opaque envelope hides the core; the silhouette and materials need substantial work against the references; aft propulsion and multiple decks are absent; the central core intersects the corridor; room interiors and lighting are rudimentary; core cutaway is created by hiding the full envelope, not a sectional cut. No viewport inspection, Blender 4.x test, Three.js integration, performance budget or Runway treatment has been performed. Build all of those and replace coarse checks with real containment and connectivity tests before considering #507 complete.
