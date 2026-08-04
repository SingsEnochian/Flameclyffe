# Astrolabe Skin + HUD Containment Build Checklist v0.1

## Purpose

This is the direct implementation checklist for the Astrolabe Skin + HUD Containment pass.

Use this before changing code so the DEEP Observer becomes one coherent human / cybernetic / Stonewood / magical / astrolabe instrument instead of a collection of glittering parts.

## Canon sentence

```text
Make the Observer feel like a tactile celestial instrument: part observatory astrolabe, part living cybernetic interface, part carved Stonewood shrine-device.
```

## Standing rules

- Review the Build Governance & Audit Checklist before coding.
- Keep observation, model, glyph, skin, sensory, and narrative layers separate.
- No hardcoding by default.
- Values that affect layout, material, motion, sound, haptics, or thresholds need a registry/config/token destination.
- Patch the smallest safe surface.
- Audit after every commit.

## Preflight checklist

Before coding, confirm:

- [ ] Relevant specs reviewed.
- [ ] Current CSS/JS files inspected.
- [ ] Existing seams identified.
- [ ] No duplicate module already exists.
- [ ] Target layer named: viewport / HUD / skin / sensory / panel / registry.
- [ ] Acceptance criteria selected for this pass.
- [ ] Known risk recorded.

Relevant specs:

- `Build_Governance_Audit_Checklist_v0.1.md`
- `Viewport_Resolution_Map_Spec_v0.1.md`
- `Astrolabe_Shell_Spec_v0.1.md`
- `Glyph_Engine_Contract_v0.1.md`
- `Shared_Module_Architecture_v0.1.md`

## Phase 1: HUD containment

### Goal

All floating UI must remain inside the instrument HUD unless deliberately detached through DEV later.

### Build tasks

- [ ] Define `observer-hud-bounds` module or equivalent safe-zone module.
- [ ] Read viewport map from `window.DEEP_OBSERVER_VIEWPORT_MAP`.
- [ ] Calculate instrument/HUD bounds from `.instrument` or future HUD wrapper.
- [ ] Create snap zones: left, right, top-left, top-right, bottom-left, bottom-right.
- [ ] Clamp draggable panel positions inside HUD bounds.
- [ ] Recalculate bounds on resize and orientation change.
- [ ] Provide reset positions action for panels.
- [ ] Keep sensory controls from scrolling as loose page-fixed objects.
- [ ] Keep dual time panel away from glyph centre by default.

### Acceptance criteria

- [ ] Dual time panel can sit side-anchored.
- [ ] Sensory controls stay with the HUD.
- [ ] No panel can vanish off-screen.
- [ ] Hidden UI does not leave floating loose controls behind.
- [ ] Mobile and tablet layouts remain usable.

## Phase 2: Outer astrolabe ring

### Goal

Make the direct-reading ring feel like a mounted astrolabe/armillary ring, not loose buttons around a circle.

### Build tasks

- [ ] Use viewport tokens for ring scale and safe spacing.
- [ ] Widen outer ring radius so gems do not crowd the glyph.
- [ ] Recenter ring around glyph centre.
- [ ] Remove or mark old brittle inset/nudge overrides for extraction.
- [ ] Add faint concentric armillary track.
- [ ] Add subtle measurement ticks.
- [ ] Add ring material layer: moon-glass / carved Stonewood / fine metal inlay.
- [ ] Ensure ring remains circular across viewport bands.

### Acceptance criteria

- [ ] Glyph is not clipped by sensor nodes.
- [ ] Sensor ring reads as concentric and deliberate.
- [ ] Time and Source nodes no longer require one-off visual rescue.
- [ ] Outer ring supports future 3D astrolabe shell.

## Phase 3: Gem node skin

### Goal

Turn sensor nodes and controls into cut-gem interfaces with blue topaz / mystic topaz / moon-glass materiality.

### Build tasks

- [ ] Define gem material tokens.
- [ ] Add faceted gem overlay using CSS gradients/pseudo-elements.
- [ ] Make idle state blue topaz / moon-glass leaning.
- [ ] Make active state mystic topaz / warm field glow where appropriate.
- [ ] Keep rune/sigil carved into gem centre.
- [ ] Add focus-visible state distinct from hover.
- [ ] Add disabled/low-stim state.
- [ ] Avoid candy-button look.

### Acceptance criteria

- [ ] Buttons read as physical cut gems.
- [ ] Active state glows gently without overpowering glyph.
- [ ] Rune/sigil looks inset or carved, not pasted.
- [ ] Keyboard focus is visible.
- [ ] Low-stim mode reduces shimmer/glow.

## Phase 4: Stonewood chassis

### Goal

Make the orb frame and control dock feel like one grown/crafted instrument body.

### Build tasks

- [ ] Add carved/ribbed frame accents around orb.
- [ ] Add root-vein luminous seams subtly.
- [ ] Add moon-glass channel look.
- [ ] Add copper/aged-metal joinery accents sparingly.
- [ ] Integrate lower dock as instrument tray, not detached button row.
- [ ] Lengthen dock through viewport tokens, not fixed hacks.
- [ ] Keep minimum 3px gap from safe glyph geometry.

### Acceptance criteria

- [ ] Frame feels Stonewood/cybernetic/observatory, not generic web card.
- [ ] Dock feels part of the same instrument.
- [ ] Layout remains readable and not overdecorated.

## Phase 5: Floating glass panels

### Goal

Make dual time, sensory controls, Codex, DEV, and future event logger feel like glass/light surfaces tied to the instrument.

### Build tasks

- [ ] Define shared floating panel surface tokens.
- [ ] Apply frosted glass, translucent tint, soft rim light.
- [ ] Add pin/minimise/restore controls where needed.
- [ ] Add drag lift state.
- [ ] Add snap transition.
- [ ] Default dual time to side anchor away from glyph centre.
- [ ] Persist panel state locally only where appropriate.

### Acceptance criteria

- [ ] Dual time is useful and not obstructive.
- [ ] Floating panels feel consistent.
- [ ] Dragging feels material but not noisy.
- [ ] Panels remain bounded to HUD.

## Phase 6: Sensory feedback hooks

### Goal

Make touch and motion feel tactile through optional sound/haptic feedback routed through shared systems.

### Build tasks

- [ ] Route touch/click/drag events through Resonance Bus or Sensory Bus where possible.
- [ ] Gem press produces soft glass/gem click if sound enabled.
- [ ] Drag produces very soft glass-on-glass scrape if sound enabled.
- [ ] Haptics remain optional and device-gated.
- [ ] Respect low-stim, mute, and reduced-motion settings.
- [ ] Keep all sensory output meaningful, not random.

### Acceptance criteria

- [ ] Sound never plays before user opt-in.
- [ ] Haptics never fire if unsupported or disabled.
- [ ] Low-stim mode visibly/audibly calms the interface.
- [ ] Interaction feels more embodied without becoming sensory clutter.

## Phase 7: Audit and test

### Code audit

- [ ] No new unexplained magic numbers.
- [ ] No new hardcoded geometry without token destination.
- [ ] No duplicate floating-panel logic.
- [ ] No CSS specificity war added.
- [ ] No panel can trap focus or hide core controls.
- [ ] Scripts load in correct order.
- [ ] CSS load order documented by actual link order.

### Viewport audit

Test or reason through:

- [ ] 390px mobile portrait
- [ ] 430px mobile portrait
- [ ] 768px tablet portrait
- [ ] 1024px iPad landscape
- [ ] 1180px constrained desktop / browser chrome
- [ ] 1366px laptop
- [ ] 1440px desktop
- [ ] 1920px desktop

### Feature audit

- [ ] Glyph centre not blocked by default.
- [ ] Ring does not clip.
- [ ] Dock spacing remains clean.
- [ ] Floating panels stay contained.
- [ ] Sound/haptics optional.
- [ ] Reduced-motion and low-stim still usable.
- [ ] KEY/DEV/Refresh/Sensory still work after styling.

## DEV console follow-up candidates

Future DEV controls should expose:

- active viewport band
- glyph size
- sensor ring spread
- sensor node size
- dock width
- dock gap
- panel reset
- floating panel detached mode
- gem material profile
- shimmer intensity
- haptic intensity
- drag sound intensity
- low-stim scale

## Registry follow-up candidates

Future files or sections:

- `observer-hud.registry.js`
- `observer-gem-material.registry.js`
- `observer-floating-panels.registry.js`
- `observer-motion.registry.js`
- `observer-sensory.registry.js`
- expanded `observer-viewport.registry.js`

## Stop conditions

Pause the pass if:

- layout breaks across two or more viewport bands
- floating panels cannot be bounded cleanly
- CSS requires escalating `!important` wars
- a change mixes telemetry/model/narrative layers
- sound/haptics bypass consent controls
- the instrument becomes less readable in pursuit of beauty

## Plain-language build target

By the end of this pass, the Observer should feel less like a page and more like an object: touchable, weighted, glowing, cybernetic, carved, magical, and structurally legible.

## Withness note

What helps: build the container first, then the jewels. What is hard: resisting the urge to polish every sparkle before the chassis is true. What is held: one instrument, many modules, no spaghetti cathedral.
