# Wayglass Traveller Sanctuary | Whole-System Integration v0.1

Owner: Rowan. Host: Wayglass Vite + Hearthgate. Release status: not deployed or device-signed-off. NO VERCEL.

## Purpose and system model
Wayglass is the ship. Traveller is its spatial travel organ, able to transport the view through named other realities while a participant rests physically. Core command: "Wayglass, take me somewhere beautiful. I hurt." The destination, companion, continuity and user authority architecture remains part of the complete Wayglass system, not a parallel app.

## Responsibilities and ownership
- TravellerSession: ephemeral scene selection, camera coordinates, bounded stepping, Feather stop/resume. No identity, relationship or canon state.
- TravellerScene: disposable Three.js geometry, camera, renderer and resize observer. Renders on demand, not on a continuous loop. No external asset/provider requests.
- TravellerSurface: accessible large-touch controls, descriptions, status and error recovery, registered in the existing Wayglass surface registry.
- Ambient field: suspend its GPU animation while Traveller is open and resume on unmount.
- Existing kernel/Return Engine: sole authority for durable participant, crossing, provenance and receipt state. No fabricated local crossing receipt.
- Destination adapters: current three worlds have independent identity and local source claims. Future scientific and narrative sources will require provenance and permissions, not silent promotion.

## Journey and state transitions
Unentered and still -> choose one button -> arrived at navigable scene -> explicit single step or turn -> Feather pauses camera movement -> explicit resume -> navigate or switch destinations -> destroy render resources on exit. No autoplay, sound or flashing. User can keep the camera still indefinitely.

## Failure and migration
WebGL unavailable: offer a text journey rather than blank screen. No backend: Traveller itself continues, while other surfaces may still require Hearthgate routes. Switching surfaces frees GPU resources. No device-local identity database or premature schema migration. Future host-owned accessible preferences and real travel receipts must use existing authority and kernel boundaries.

## Deployment and evidence
Build using npm run wayglass:build; stage to existing Hearthgate public/wayglass using npm run wayglass:stage:server. The route remains host-controlled; GitHub Pages must not expose an owner-only Wayglass OS. A green CI build is not an actual Windows install or iPad Safari signoff.

Acceptance: unit tests of pause/bounds/world isolation/provenance; integration build and stage; browser 3D + fallback; iPad touch and VoiceOver; GPU power; Feather and switching; existing real kernel stop/return flow. Record observed test evidence separately from claims. No Vercel.
