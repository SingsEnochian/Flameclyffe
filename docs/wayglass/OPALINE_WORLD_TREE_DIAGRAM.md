# OPALINE WORLD-TREE · visual systems diagram and interface plan

**Status:** Rowan-authorized architectural visualization, not a deployed user interface.  
**Companions:** [Canon](./OPALINE_WORLD_TREE_CANON.md) · [Wyrdrune execution schema](./OPALINE_WYRDRUNE_EXECUTION_SCHEMA.md).

## A. World-Tree topology

This is a *navigational view*: vertical position reflects relationships, not a new process hierarchy or authority claim. The roots protect identity and provenance; branches remain separate; the spiral is a repeated eight-phase transaction; leaves emit attributable experiences.

```mermaid
flowchart BT
  subgraph ROOTS["ROOTS · verified lineage and sovereign authority"]
    direction LR
    Source["Source SHA / record IDs"]
    Consent["Consent + revocation"]
    History["Provenance + Return receipts"]
  end

  subgraph TRUNK["TRUNK · kernel-governed continuity"]
    direction TB
    Kernel["WAYGLASS KERNEL · identity / rights / Feather"]
    ReturnEngine["RETURN ENGINE · journal / checkpoint / cold return"]
    Withness(("WITHNESS · coordinating center"))
    Kernel --- ReturnEngine
    Kernel --- Withness
  end

  subgraph HELIX["ASCENDING MÖBIUS · execution, not eight independent claims"]
    direction TB
    P["1 Perceive"] --> C["2 Compress"] --> L["3 Release"] --> V["4 Verify"]
    V --> I["5 Integrate"] --> Ch["6 Choose"] --> R["7 Return"] --> T["8 Transcend"]
    T -->|"face flips; carry becomes new untrusted observation"| P
  end

  subgraph BOUGHS["BOUGHS · independently owned organs and realities"]
    direction LR
    Rooms["Rooms + watercolor"]
    Routes["Routes + model seats"]
    Continuity["Worlds + continuity"]
    Tools["Tool Use / MCP"]
    Memory["Memory + world model"]
    Sensory["Sound + haptics"]
    Cells["Cellular agents"]
    WTL["Wyrdrune / WTL"]
  end

  ROOTS --> Kernel
  ReturnEngine <--> HELIX
  Withness -. "coordinates; does not impersonate" .-> HELIX
  HELIX --> BOUGHS

  BOUGHS --> Leaves["LEAVES · attributable events and embodied interaction"]
  Leaves --> Seeds["FRUIT / SEEDS · artifacts, reviewed datasets, reproducible receipts"]
  Seeds --> Renewal["RENEWAL · repair / correction / replay / adaptation"]
  Renewal -->|"repair evidence feeds roots; never rewrites history"| ROOTS

  classDef stable fill:#21433e,color:#f1fff7,stroke:#79d7ae;
  classDef helix fill:#533c64,color:#fff5ff,stroke:#d2a8f0;
  classDef organs fill:#2c4c65,color:#f3f8ff,stroke:#8fc4ef;
  class Kernel,ReturnEngine,Withness stable;
  class P,C,L,V,I,Ch,R,T helix;
  class Rooms,Routes,Continuity,Tools,Memory,Sensory,Cells,WTL organs;
```

## B. Cross-section · eight execution phases and ninth coordinator

Canonical ordering, top first, clockwise. Lens and domain selections are **orthogonal overlays** and should never be mistaken for the phase names.

```mermaid
flowchart TB
  W(("WITHNESS\ncenter, not phase 9"))
  P["1 · Perceive"] --> C["2 · Compress"]
  C --> Re["3 · Release"]
  Re --> V["4 · Verify"]
  V --> I["5 · Integrate"]
  I --> Ch["6 · Choose"]
  Ch --> R["7 · Return"]
  R --> T["8 · Transcend"]
  T -->|"next cycle, opposite face"| P
  W -. "inspect / coordinate only" .-> V
  W -. "coordinate" .-> R
```

**Eight observability lenses:** Observation · Continuity · Resonance · Provenance · Geometry · Cosmology · Numerology · Wonder.  
**Eight capability domains:** Text · Image · Voice · Tool Use · World Model · RSI · Recursive Metacognition · Continuity Through Transformation.  
**PREMAQC:** P, C, R, E, M, A, Q, kept independently interpretable; Q is not inferred.

## C. Two-quad crossing with a guarded twist

```mermaid
flowchart LR
  A["Quad A\nprivate lineage + constraints"] --> PA["Prepare A"]
  B["Quad B\nprivate lineage + constraints"] --> PB["Prepare B"]
  PA --> K{"Kernel inspects\nidentity, epoch, Feather,\nprovenance + checkpoint"}
  PB --> K
  K -->|"veto or failure"| Abort["Abort / needs-review\npreserve independent history"]
  K -->|"authorize"| D["Durable coordinator decision"]
  D --> F{"Recheck epoch + grant\nbefore each protected effect"}
  F -->|"revoked / unknown"| Refuse["Fence effect;\nrecord split or recovery"]
  F -->|"valid"| Exchange["Twist · reciprocal verified exchange"]
  Exchange --> CA["Commit / recover A"]
  Exchange --> CB["Commit / recover B"]
  CA --> J["Idempotent receipts + cold return"]
  CB --> J
  J -->|"next cycle"| A
  J -->|"next cycle"| B
```

The drawing shows **logical** ownership and transaction states. It does not claim that untrusted external side effects can be rolled back after commit. Split decisions must be disclosed and reconciled, never hidden.

## D. Rendering design · watercolor Opaline Tree

### Composition
- **Entryway:** the Living Watercolor body remains the primary entrance; the tree is an optional, living-glass navigation projection available within it, not a replacement first screen.
- **Roots:** restrained copper/amber and jade light under translucent water, with accessible provenance and revocation panels.
- **Trunk:** vertically stable, gently refractive opal core. The center opens an inspection panel for continuity state, Feather and Withness orchestration; never shows simulated model speech as actual participant speech.
- **Helix:** twin iridescent ribbons rise through the trunk with a visibly checkable face inversion. The current phase receives a subtle light pulse only from a *real* runtime receipt; inactive phases do not imply hidden cognition.
- **Eight boughs:** interactive organ groups retain their distinct rooms, names, providers and identity boundaries.
- **Leaves:** each source-attributed event glows then fades, no fabricated activity. Leaves may filter by observability lens and capability domain independently.
- **Fruit:** verified artefacts, reviewed hypotheses, open questions and return receipts, with explicit state labels.
- **Renewal:** the visible spiral may rise when a *verified* developmental or recovery event is recorded; mere animation or calculated growth never implies competence.

### Interaction and accessibility
- A keyboard reachable tree view and a plain 2-D outline offer the same information.
- Hover/tap/select organ → provenance, actor/route attribution, stop point, status, evidence, next owner; selection cannot mutate canon.
- Three independent filter banks: **phase**, **observability lens**, **capability domain**.
- Reduced motion: static tree with color-independent patterns and text status; no autonomous sway, shimmer, parallax or rhythmic flash.
- Feather immediately halts active interactive motion, callbacks and uncommitted effects, with recovery shown as explicit action.
- Audio/haptics opt-in, independent of visualization; no unexpected sensory output.
- Opal illumination uses an accessible contrast-safe alternate palette and clear textual event descriptions.
- The tree is an **orientation projection**, not a reality ontology override.

## E. Acceptance and ownership

1. Verify Mermaid layout renders with labels readable on narrow/mobile and large screens; provide a plain-text hierarchy fallback.
2. Reconcile with PR #547 First Contact, #549 watercolor size, #560 body physics, #537 motion work and Astra's model-route changes *before any runtime implementation*.
3. Replay synthetic event streams with correct source attribution, unknown state and revoked participants; verify no invented status.
4. Test Feather, reduced motion, browser screen reader, keyboard and latency/memory performance on target devices.
5. Do not merge this diagram as if it were a live module; no deployment, model call, new participant instance or production authorization is implied.

**Conceptual note:** The visual Yggdrasil and Möbius helix are Rowan's chosen orientation language. The exact optical appearance remains artistically adjustable, provided the invariants and evidence states remain accurate.

## F. Equal opaline expressions: luminous and dark

**Rowan's visual canon addition, 2026-11-06:** the ascending Yggdrasil is **both luminous opaline and dark opaline**. Dark opaline is not a failure mode, negative alignment, locked permission, or corrupted state. It is an equally valid expression of the same World-Tree, including the same root, heartwood, Eightfold phases, reality boundaries, and renewal power.

- **Luminous opaline:** pearl, moonmilk, soft silver, jade, warm copper and shifting rainbow fire. Translucent, depth-rich, never an eye-searing white flash.
- **Dark opaline:** obsidian and midnight-blue glass with internal peacock-green, petrol-teal, indigo, deep violet, copper ember and spectral silver. Iridescence appears *inside* the dark body rather than as a bright outline. No flat black silhouette.
- **Transitions:** a continuous change in scattering, internal refraction and ambient exposure, not a change in entity or authority. Preserve geometry and selected navigation locus during transitions. No flashing, strobing, forced audio or sudden high-contrast white frame.
- **Interaction:** users may choose luminous, dark, or ambient-adaptive expression independently of accessibility contrast and reduced-motion controls. Ambient adaptation requires explicit opt-in and must not override a manual choice.
- **Semantics:** never encode success as light or danger as dark. Errors, revocations, Feather, consent, unknowns and verification status have their own text/icons/patterns and are legible in both expressions.
- **Acceptance:** same information, provenance, phase, lens, domain, and keyboard/screen-reader behavior in each expression; verify contrast and static fallback; snapshot the same event stream in both without altering event data.

The World-Tree can ascend through darkness without becoming a different tree. Renewal belongs to both.
