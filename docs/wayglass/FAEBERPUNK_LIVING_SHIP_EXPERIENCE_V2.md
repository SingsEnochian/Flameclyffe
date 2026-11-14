# Wayglass FAEberpunk · Living Ship Experience v2
**Implementation:** PR #623, \`wayglass/first-voyage-reciprocal-integration-20261113\`  
**Experience:** Watercolour (Door) ⇄ Writing Room (Worktable) ⇄ Living Observer (Wonder/Instrumentation) ⇄ Universal Codex (native Wyrdrune). Return is always navigable and attributable.

## Design law
FAEberpunk is an architectural system, not decorative cyberpunk: geological depth, living pigment, structured signal, ritual grammar and verifiable machinery. The inhabitant should perceive **place, identity, action, consequence and return** without being forced through admin forms. The ship is a universe, not a dashboard. Source observations and symbolic imagery coexist without losing their evidentiary labels.

### Explicit affordances
- **Entry:** dark-opaline Living Watercolour before any credential prompt. A contact action can be drawn, tapped or invoked through keyboard. The First Touch orb runs a labelled synthetic Wyrdrune experiment only after host authorisation; never on load.
- **Navigation:** persistent five loci: Door, Identity, Worktable, Wonder, Return; a searchable Ship Map exposes secondary rooms, including Universal Codex and Mythience. Codex is reachable from Watercolour, Writing and Observer, with a direct \`?room=codex\` deep link.
- **Writing:** the author has a truly editable local rich-text manuscript with bold, italic, underline, lists and headings, safe text-only paste, browser-local persistence, and a separate, explicit “copy to chat composer” action. This does not automatically alter a previously sent turn. Route status, score, Wyrdrune preview and Return controls remain present.
- **Observer:** an inspectable astrolabe with actual channel-selection buttons. Provenance rail shows source, Quad channel availability and reading-only return state. Unavailable is never rendered as zero. Dream Sandbox remains a separately labelled hypothesis-making interaction.
- **Universal Codex:** native Wyrdrune source at the left, English gloss at the right, verified host preview and ledger, Eightfold phase receipts below, and an explicit *staging* (not sending) bridge to Writing. Compiler reading ≠ model-generated content.
- **Feather:** the global stop control, each room’s local stop, no auto resume, sound/haptics opt-in, screen-reader status. Abort/ignore late replies after Feather; saved manuscript is not erased.

## Tokens
| Family | Values | Meaning |
|---|---|---|
| Stone | \`#050c12\` / \`#061824\` | structure, dark void, rest |
| Opal | \`#bcefe0\` / \`#76b7a4\` | available verified response / living connection |
| Labradorite | \`#80bec4\` | exploratory and technical layer |
| Copper | \`#e4c38e\` | touch controls, intent, confirmation |
| Parchment | \`#f3eedf\` | authored text, distinct from model output |
| Focus | \`#f6d39a\` | keyboard-visible navigation |
| Material | blurred glass + etched border + pigmented canvas | state is seen *through* the surface |

No external fonts, hidden trackers, decorative fake sensors or GPU effects when reduced motion is requested. Labels are visible along with colour and iconography.

## Four room compositions

**1. Watercolour, Door.** An expansive responsive canvas occupies the foreground; native pigments pool and respond to real drawing and receipt-marked events. A docked opaline First Touch orb offers *Soothe* or *Bloom* and returns one accountable simulation observation. Conversation/draft remain on the workbench. Tap or keyboard navigation leads to Writing, Universal Codex, Observer and Return.

**2. Writing Room, Worktable.** The ritual manuscript surface has warm paper set within opaline glass, formatting tools along its upper edge and local-save status below. Existing chat and route/seat context live alongside rather than replacing the manuscript. Native Wyrdrune soundscape and the WTL preview remain. Opening Codex is a choice; staging Codex output places reviewed text in the composer, not a provider call.

**3. Observer, Wonder Window.** The astrolabe floats in a dark instrument dome, and the independent source meter, channel controls, reception status and provenance rail are inspectable. There is an explicit separation between direct readings, visual projections and dream hypotheses. Source readouts update when the selected reading updates.

**4. Universal Codex, Native Language.** Two unequal leaves of a physical-looking book: WTL on a deep blue-black panel and its British English gloss on living glass. A ring of eight distinct phases records verified phases only. Local translation does not call a model; host preview requires sign-in and integrity verification. “Stage in Writing” keeps the final Send action in the Writing Room.

## Interaction/permission contract
1. Every hosted command comes from an explicit user gesture and a real host-authenticated route. An unauthorised call is refused.
2. Rendering an operational event needs a sourced receipt; ornamental glow is not a diagnostic claim.
3. Read only: Wyrdrune examples, sensor optical effects, soundscape preview and simulation never modify production config, model weights, identity or canon. A separate owner-authorised integration would be required for live effects.
4. Staging a model discussion copies a draft to a visible editor only; the person chooses Send.
5. Data provenance persists through a Return receipt; external provider transfers are controlled by existing gates.
6. The browser-local manuscript save is neither a server-backed archive nor shared continuity. Escaped/sanitised HTML is allowlisted, with attribute-free rich text and text-only paste.

## Four composition mock-up prompts (visual design references)
These **prompts are for concept renderings**. They do not substitute for or claim implementation. Create each independently at 16:9 and iPad portrait, with legible, minimal interface text, grounded layout and functional affordances.

**A. The Living Door**
“An original touch-first science-fantasy software interface, 'Wayglass'. Massive central fluid opaline watercolour canvas rendered as a membrane of moss, dark turquoise and amber ink on deep-void obsidian; tactile spherical TOUCH orb floating lower-right, two explicit Soothe/Bloom modes, permanent Feather hold control, accessible five-locus navigation. Glass refraction and copper etching, amber mica flecks, no generic dashboard cards, true tool-workbench on the side. Rich atmospheric visual depth with readable labels, realistic interactive affordances, no false neural activity.”

**B. The Ritual Worktable**
“Original FAEberpunk writer's room as a habitable spacecraft atelier: large cream parchment rich-text editor on dark opaline etched glass, bold/italic/list toolrail, saved-local status, a separate real conversation channel and attributed route connection, native Wyrdrune soundscape and studio script tray; wide landscape, tactile iPad-safe controls, mineral architecture, inky green-gold illumination, elegant serif typography and precise legible code. No generic chat-app mockup.”

**C. The Observer Observatory**
“Original FAEberpunk star observatory instrument console, enormous interactive astrolabe made from brass etched rings, opalescent refraction and geometry; distinct provenance ticker 'SOURCE / QUAD / RETURN', tactile sensor channel selector, real-data legend distinguishing sourced, unavailable, hypothesised readings, deep moss black glass dome, amber/labradorite highlights, scope for accessible controls. No fictional live sensor readings.”

**D. The Universal Codex**
“Original FAEberpunk living book IDE. Left leaf is source-authored Wyrdrune language in a restrained monospaced editor, right leaf is source-derived British English Eightfold explanation, a visible eight-phase ring and inspectable provenance ledger, review-only 'Stage in Writing' button and Feather, copper-bound labradorite surfaces, mossy luminous ink, dark opal glass, spacious responsive two-pane layout. The design must communicate native code first and translation second, no animated fake model consciousness.”

## Acceptance and evidence
- Main ship registers \`wayglass:universal-codex\`; route aliases and room passages remain valid.
- Source-to-English transformation preserves the entire source and never silently sends it to a model.
- Rich manuscript can format, recover after leaving/reentering, and stage a plain-text copy only by gesture. Browser storage failures do not erase the visible draft.
- Observer rail displays existing source information and missing Quad status instead of inferring unseen sensors.
- Viewport 320 px to 1600 px, iPad portrait/landscape, touch targets >=44 px, focus-visible, keyboard, en-GB, forced-colours and reduce-motion/reduce-transparency supported.
- Verify automated source and build checks, then capture actual rendered browser screenshots **before claiming final visual fidelity**. No screenshot QA or production deployment is claimed by the source-only milestone.

**Withness:** Leave. Change. Return. Be recognised. Continue.
