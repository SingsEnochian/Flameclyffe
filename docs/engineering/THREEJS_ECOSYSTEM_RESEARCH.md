# Three.js ecosystem research and adoption candidates

**Research date:** 26 November 2026  
**Target:** Wayglass / Watercolour / WTL / Universal Codex  
**Canonical implementation branch:** `wayglass/current`  
**Research branch:** `wayglass/threejs-ecosystem-research-20261126`

This is a source-inspected research register. Inclusion means a repository was inspected and appears relevant; it does not mean the dependency has been installed, integrated, benchmarked or approved for production. Candidate priority reflects architectural fit, not a guarantee of quality or compatibility.

## Executive finding

The ecosystem has useful capabilities beyond the existing generic Three.js skill set: particle/VFX authoring, 3D Gaussian splat scenes, BVH spatial queries, GPU path tracing, volumetric light and fog, advanced WebGPU glass, and a broad React Three Fiber helper collection.

The most useful next step is to prototype a small number of capabilities inside their existing Wayglass owners rather than add a second scene engine or renderer.

## Candidate register

### A. High-priority capabilities to prototype

#### 1. three.quarks — particle systems and authorable VFX
Repository: https://github.com/Alchemist0823/three.quarks  
Documentation/editor: https://quarks.art/ and https://quarks.art/create  
License: MIT  
Inspected release metadata: package version 0.18.0  
Three.js peer range in package metadata: >=0.182.0

Inspected README and package metadata describe:
- batched particle rendering;
- point, sphere, hemisphere, cone, circle, mesh-surface and grid emitters;
- color, size, rotation, force, orbit, turbulence, texture-frame and sub-emitter behaviours;
- billboard, stretched billboard, mesh and ribbon-trail render modes;
- JSON effect loading and cloning;
- a visual editor with JSON export;
- WebGL and WebGPU renderer entry points;
- an R3F integration package;
- an experimental node-based VFX package.

**Wayglass fit:** WTL spell execution and visual outputs; Watercolour material/particle expression; visual effect authoring and reusable spell assets.

**Compatibility note:** peer range includes our locked Three.js 0.185.1, but the upstream monorepo development dependencies use Three.js 0.187.0. Run the package against our exact lockfile and exercise both WebGL and WebGPU paths before adoption. Test R3F provider lifecycle, disposal, cancellation and JSON validation. The README's roadmap appears stale relative to its own WebGPU feature section, so use package/source evidence rather than roadmap checkboxes.

#### 2. Spark — active Gaussian splat rendering
Repository: https://github.com/sparkjsdev/spark  
Documentation/examples: https://sparkjs.dev/  
License: MIT  
Inspected package version: 2.4.0  
Peer range: Three.js >=0.180.0

Inspected README and package metadata describe:
- Gaussian splats integrated into the Three.js rendering pipeline alongside mesh geometry;
- PLY, compressed PLY, SPZ, SPLAT, KSPLAT and SOG formats;
- simultaneous viewpoints;
- dynamic per-splat transforms and editing;
- real-time colour editing, displacement and skeletal animation;
- GPU shader-graph editing;
- broad WebGL2 device coverage, including low-powered mobile;
- Rust/WASM build components.

**Wayglass fit:** realistic world reconstruction, turning image-derived scenes into navigable spaces, world assets, scene capture and visual memory. This is the strongest current candidate for exploring image-to-world rendering.

**Compatibility note:** package peer range includes our Three.js 0.185.1. README's copy-paste import map pins Three.js 0.180.0, while package development dependencies also use 0.180.0. Verify 0.185.1 explicitly. WASM build and asset loading, mobile memory and licensing/provenance of every source splat must be checked.

#### 3. three-mesh-bvh — spatial queries and geometry acceleration
Repository: https://github.com/gkjohnson/three-mesh-bvh  
Documentation/examples: https://gkjohnson.github.io/three-mesh-bvh/

Inspected README describes:
- accelerated raycasting and spatial queries;
- mesh, points, line and scene hierarchy BVHs;
- asynchronous/Web Worker BVH generation examples;
- shape casting, geometry selection and intersection;
- sculpting, triangle painting, lasso selection and voxelisation examples;
- physics collision and character movement examples;
- SDF generation and GPU path-tracing examples.

**Wayglass fit:** interactive 3D editing, spatially aware spell targeting, object selection, collision, mesh inspection and geometry tools in Codex/Watercolour.

**Compatibility note:** confirm package peer/dependency metadata and installed version before integrating. Test large meshes, workers, serialization, disposal and interaction with existing raycasters. Avoid global prototype mutation unless it is explicitly owned and reversible.

#### 4. postprocessing — composited image effects
Repository: https://github.com/pmndrs/postprocessing  
Demo/docs: https://pmndrs.github.io/postprocessing/public/demo

Inspected README and package metadata describe:
- EffectComposer, RenderPass and EffectPass;
- bloom and other fullscreen effects;
- effect merging to reduce render operations;
- HDR/high-precision framebuffer workflows;
- colour-space and tone-mapping guidance.

**Wayglass fit:** shared rendering post-process layer for Watercolour and Wayglass: bloom, glow, atmospheric grading and image-space finishing.

**Compatibility note:** inspected peer range is Three.js >=0.168.0 <0.188.0, which includes 0.185.1. Its package license is Zlib, not MIT. Confirm that the current application does not already own an incompatible composer or post-processing chain before adding another.

### B. High-value visual experiments

#### 5. three-good-godrays — volumetric light shafts
Repository: https://github.com/Ameobea/three-good-godrays  
Demo: https://three-good-godrays.ameo.design

Inspected README says it uses the pmndrs postprocessing library, supports point and directional lights, and raymarches shadow maps. Its stated Three.js compatibility is >=0.125.0 and <0.188.0, which includes 0.185.1. It requires shadow maps and has a documented shadow-map compatibility/performance trade-off.

**Wayglass fit:** sunlight through glass, atmospheric shafts, magical illumination and scene depth. Prototype as an optional effect, not a global always-on pass.

#### 6. three-volumetric-pass — raymarched volumetrics
Repository: https://github.com/Ameobea/three-volumetric-pass  
Demo: https://three-volumetric-pass.ameo.design

Inspected README describes screen-space raymarched volumetrics compatible with pmndrs postprocessing, for clouds, fog and related effects, with a half-resolution option.

**Wayglass fit:** cloud volumes, fog layers, atmospheric perspective and world ambience.

**Compatibility note:** README's npm badge appears to reference a different package name. Verify published package metadata, current maintenance, licence and Three.js compatibility before installing.

#### 7. WebGPU Glass Material — physical transmission and refraction
Repository: https://github.com/ektogamat/webgpu-mesh-transmission-material  
Demo: https://webgpu-glass-material.vercel.app/

Inspected README describes a React 19/R3F 9 and Three.js TSL/WebGPU material with:
- multi-pass backdrop capture;
- volume refraction and backside thickness;
- chromatic dispersion;
- roughness-aware blur and mip sampling;
- Beer–Lambert-style attenuation;
- Fresnel, clearcoat, iridescence, sheen and anisotropy;
- configurable resolution and sample-count controls.

**Wayglass fit:** FAEberpunk glass, gemstones, liquids, refractive interfaces and Watercolour material systems.

**Compatibility note:** the demo requires WebGPU and is an example implementation, not a general-purpose production package. Inspect source, licence and browser fallback before adapting. The multi-pass capture must be integrated into the one existing renderer lifecycle.

#### 8. three-gpu-pathtracer — high-fidelity GPU rendering
Repository: https://github.com/gkjohnson/three-gpu-pathtracer  
Examples: https://gkjohnson.github.io/three-gpu-pathtracer/

Inspected README describes WebGPU compute path tracing, physically based materials, area/spot lights, HDR environments, depth of field, denoising/upscaling and animation rendering.

**Wayglass fit:** high-fidelity stills and reference rendering for Watercolour, materials and scene authoring.

**Important limitation:** upstream explicitly warns its WebGPU path tracer is not stable and relies on three-mesh-bvh APIs that may change. It requires WebGPU and supports a narrower material/light set. Keep it as an opt-in offline/preview experiment, not the default live renderer.

#### 9. GaussianSplats3D — earlier splat renderer
Repository: https://github.com/mkkellogg/GaussianSplats3D

Inspected README explicitly says the repository is no longer in active development and recommends Spark as the actively developed alternative. It supports PLY, SPLAT and KSPLAT, WebXR and mixed Three.js objects, but documents CPU sorting, mobile performance and large-scene limitations.

**Decision:** retain as historical/reference implementation; prefer Spark for a new prototype.

### C. Framework helpers and supporting tools

#### 10. React Three Fiber Drei
Repository: https://github.com/pmndrs/drei  
Documentation: https://pmndrs.github.io/drei

Inspected README describes a broad helper collection for R3F: cameras, controls, gizmos, text, positional audio, trails, SVG, GLTF, image and environment helpers, effects, geometry and material helpers.

**Wayglass fit:** reusable R3F controls, scene helpers, positional audio and model loading. The current Wayglass package already declares R3F and Drei, so first inventory what is already installed and used. Do not install a second copy or duplicate existing helpers.

#### 11. Troika Three Text
Repository: https://github.com/protectwise/troika

Drei's inspected package metadata depends on `troika-three-text` and exports text helpers. This is a candidate for crisp, layout-aware 3D text and glyph rendering in scene space.

**Wayglass fit:** Skýrunor glyphs, in-world labels and readable typographic surfaces. Inspect the upstream package and font/licence requirements before adoption.

#### 12. WebGPU glass Drei example
Repository: https://github.com/ektogamat/webgpu-glass-drei

Inspected README describes a smaller R3F/WebGPU glass example. It is a useful comparative implementation for the larger WebGPU Glass Material repository, not a separate engine to integrate.

## Architecture and compatibility findings

- The canonical Wayglass lockfile inspected in the prior toolkit review resolves Three.js 0.185.1.
- The current root package declares `three`, `@react-three/fiber` and `@react-three/drei` as `latest`, while the lockfile fixes the actual installed versions. The lockfile, not the manifest range, is the reproducible source of truth.
- three.quarks 0.18.0 peer range >=0.182.0 includes 0.185.1, but its own monorepo development dependency is 0.187.0.
- Spark 2.4.0 peer range >=0.180.0 includes 0.185.1, but its development dependency is 0.180.0.
- postprocessing's inspected peer range >=0.168.0 <0.188.0 includes 0.185.1.
- three-good-godrays README compatibility >=0.125.0 <0.188.0 includes 0.185.1.
- The experimental path tracer and WebGPU glass demos are not default-renderer replacements.
- Do not create a parallel scene engine, particle engine, composer, animation loop or audio engine. New capabilities must attach to the existing owning surface and lifecycle.

## Recommended prototype order

1. **three.quarks:** one self-contained particle effect in the existing Wayglass scene, with pause, cancellation, cleanup, JSON round-trip and a measured mobile fallback. This is the closest fit to executable WTL spells.
2. **Spark:** one small, licensed test splat scene alongside ordinary Three.js meshes. Validate loading, camera controls, memory and mobile performance. This is the best image-to-world experiment.
3. **postprocessing + godrays:** one opt-in lighting composition with reduced-quality fallback and a clear switch to disable it.
4. **three-mesh-bvh:** one accelerated selection/geometry query test on a representative model.
5. **WebGPU glass:** one refractive material test in an isolated Watercolour/FAEberpunk scene.
6. **Volumetrics and path tracing:** exploratory only until performance and browser support are measured.

## What is not done yet

No dependency has been installed or upgraded by this research document. No production renderer has been replaced. No live deployment has been claimed. The next implementation work requires inspecting the existing Wayglass scene lifecycle, exact lockfile versions, build targets and test coverage, then adding one isolated prototype at a time.

## Research sources

All repository descriptions above are based on source inspection of the repositories' README and/or package metadata on 26 November 2026. Links are provided beside each candidate so future reviews can re-check changes, versions, licence and maintenance status.
