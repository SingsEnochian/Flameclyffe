# Wayglass Living Ship Ecology · v0.1
**Purpose:** one coherent, local-first living-ship visual subsystem, not a decorative FFT visualiser and not a new intelligence or identity system.
**Origin of inspiration:** Molequle by TheFeloniousMonk, https://github.com/TheFeloniousMonk/Molequle (MIT). Studied principles: behaviour over time, bond formation, environment as remembered history, clear separation of simulation from rendering, deterministic seeded runs. This module contains independent Wayglass code; do not import the upstream simulation or call its local API implicitly.
**Ownership:** Wayglass OS ship embodiment. ArcSweep still actively upgraded; Wayglass uses its existing ship sensory spine, visual language, continuity kernel and StorySoundscape.

## Whole machine
The living ship appears as a population of **ship-tissue signals** with distinct histories. They are visual *representations of internal dynamics*, not participant identities, fictional model outputs presented as evidence, or independent artificial lives. Simulated tissue may evolve and form threads even offline, explicitly labelled **simulation**. Only actual instrument input (the existing keyboard's accepted `note-on`, `note-off`, and `feather`) may stimulate those tissues as **observed local sensory data**. All runtime-identity, crew-presence, world transition, memory/continuity and model health claims remain owned by existing authentic Wayglass host components.

## System boundaries
- **LivingShipEcology** (`ship-visualiser/ship-ecology.js`): seeded state, simulation steps, local environmental history, persistent tissue/cell identities **within one simulation**, relationship creation, energy, events, durable *local simulation* snapshots; no private human records, no network, no claims of live ship health.
- **Visualiser geometry** (`ship-visualiser/visualiser-model.js`): colour/ring projections from world and note frequency, display-only. No authority.
- **Ship sensory spine** (`ship-ui/ship-sensory-spine.js`): short-lived local keyboard signal ingress. No remote audio, model presence, navigation or receipts. Reader re-validates and deduplicates.
- **Living Ship View** (`ship-visualiser/index.html`, `living-ship-ui.js`, `living-ship.css`): physical/labradorite-inspired optical rendering, responsive multi-device UX, tactile input via pointer exploration, labels for observed-vs-simulated signals, world/seed control, lifecycle and export/import, no uncontrolled audio.
- **External trusted state**: a future *explicit adapter* would feed only validated host observations into this view, labelled by source and validity. It must not guess agent presence from names or treat the tissue simulator as canonical ship memory.

## Behaviour
A persistent grid remembers prior sound energy, bonds, quiet, and disruption. Ship-tissue agents move in response to their own seeded parameters and accumulated conditions. Two compatible signals that approach may form luminous threads; memory of stable threads affects where patterns reform. Sound from the Harmonic Keyboard shapes their velocity, hue, and local environmental memory, while Feather stops the instrument-driven excitation without erasing history. Every simulation step is reproducible given its **own snapshot**, seed, step count and source inputs. This version's floating-point replay is not certified cross-engine bit-identical and must not be advertised as such.

## Experience
The living interface should feel inhabitable rather than busy: slowly migrating light, refractive-seeming membrane depth, afterimages of known history, visible thread junctions, manual controls, accessible text and reduced-motion/sensory-quiet modes. Show a real note as a **local instrument observation**. Show simulated life as **simulation**, not proved ship consciousness.

## Acceptance gates
- Deterministic same-seed/same-event same-runtime replay, true snapshot/restart continuation, bounded state growth, corruption rejection, no authority flags.
- Bond/history effects on later behaviour, not merely decorative trails.
- Feather silences input excitation while preserving saved environmental history, identity declarations untouched.
- Keyboard-to-view live same-origin integration, without a second synthesiser, cross-origin API, or automatic sound.
- Existing Wayglass material skin, two-pilot seats, ArcSweep launcher and Pages build intact.
- Browser, iPhone, touch and real host runtime observation independently smoke-tested before claiming production.
