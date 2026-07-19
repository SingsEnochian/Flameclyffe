# Hearthgate AR Window 0.1 — Feature Contract

**Status:** SPECIFIED  
**Product Steward:** Rowan  
**Implementation lead:** Nikola!Vee  
**Review and QA:** Boxfire  
**Repository:** `SingsEnochian/Flameclyffe`  
**Branch:** `feature/ar-window-0.1-contract`

## 1. Purpose

Create the first functional human/AI augmented-reality collaboration surface in Hearthgate: one persistent spatial window through which Rowan and an authorised AI collaborator can exchange, display, manipulate, annotate, and return images while preserving consent, accessibility, provenance, and persistence.

This milestone is not a general-purpose AR world, avatar system, or decorative mock-up. It establishes the smallest complete collaboration circuit.

## 2. Nature of the Problem

Images currently arrive through flat conversation or application surfaces. Their conversational meaning, source history, edits, and placement are fragmented across tools. The desired system must give an image a stable spatial location and a traceable collaborative history without silently activating private sensors or inventing unsupported capabilities.

## 3. Ideal User Experience

1. Rowan opens Hearthgate and enters the AR Window room.
2. Hearthgate explains which sensor permissions are required and why.
3. Rowan explicitly enables the camera and spatial tracking for the session.
4. Rowan creates or restores one spatially anchored image window.
5. Rowan selects an existing Hearthgate image or imports a supported image file.
6. The image appears in the anchored window with visible source and collaboration metadata.
7. Rowan manipulates the image using accessible controls.
8. Rowan annotates the image.
9. Hearthgate saves the annotation as a new revision rather than replacing the source.
10. Rowan sends the revision back into the collaboration channel.
11. After application restart, the image record, revisions, and last known anchor state remain available.

## 4. Scope

### 4.1 Included in AR Window 0.1

- One spatial image window per active session.
- Image import from the local device and selection from an existing Hearthgate image record.
- Supported raster formats: PNG, JPEG, and WebP.
- Spatial placement relative to the user or a detected surface.
- Reposition, rotate, scale, reset, hide, and restore controls.
- Pointer/touch controls with keyboard fallback.
- Voice-command hooks behind explicit microphone consent; voice operation may remain disabled until the command service is connected.
- Annotation layer supporting pen stroke, eraser, undo, redo, and clear.
- Immutable source asset plus revision history.
- Provenance metadata for source, author/agent, timestamps, transformations, and parent revision.
- Local persistence.
- Honest tracking-loss and unsupported-device states.
- Reduced-motion and high-contrast behaviour.
- A non-AR desktop fallback that exposes the same image and annotation record.

### 4.2 Explicit Non-goals

- Multiple simultaneous spatial windows.
- Multi-user synchronous co-presence.
- AI avatar embodiment.
- 3D model placement.
- Full room scanning or semantic mapping.
- Continuous camera recording.
- Automatic microphone activation.
- Automatic upload of camera frames or room geometry.
- Eye tracking until compatible hardware and explicit consent contracts are verified.
- Production claims for unsupported smart-glasses hardware.

## 5. Platform Strategy

AR Window 0.1 must use a capability adapter rather than binding the product contract to one vendor.

Preferred implementation order:

1. WebXR immersive AR when supported.
2. Native or device-specific adapter when justified by confirmed hardware.
3. Desktop/tablet spatial-preview fallback using the same domain records and annotation pipeline.

The UI may expose capability levels, but it must not describe a simulated preview as live AR.

## 6. User-facing Workflow

### 6.1 Entering the Room

- Route: proposed `/ar-window` within the canonical Hearthgate shell.
- The route must preserve a visible path Home.
- Before requesting permissions, the interface displays:
  - capability status;
  - required permissions;
  - whether any data leaves the device;
  - how to revoke access;
  - fallback mode availability.

### 6.2 Creating the Window

- User chooses `Create AR Window`.
- The system requests camera/spatial permission only after this action.
- The adapter attempts to begin a tracking session.
- The user places the window using reticle/surface placement where available, or selects a user-relative placement.
- The system stores anchor metadata only after successful placement.

### 6.3 Adding an Image

- User chooses one of:
  - `From Hearthgate`;
  - `Import from device`;
  - `Empty canvas`.
- The system validates type, dimensions, size, and decode success.
- A source asset record is created before display.

### 6.4 Manipulation

Required controls:

- move;
- rotate;
- scale;
- centre/reset;
- fit image;
- hide/show metadata;
- exit AR without deleting the record.

### 6.5 Annotation

- Annotation occurs on a separate transparent layer.
- Saving creates a new revision.
- The original image bytes remain unchanged.
- Revision export produces a flattened derivative while preserving the editable annotation data.

### 6.6 Return to Collaboration

- User selects `Send revision`.
- The collaboration transport receives the derivative asset and a provenance envelope.
- If no transport is configured, the system offers local export and marks remote delivery as unavailable.

## 7. Inputs

- Local image file.
- Existing Hearthgate asset identifier.
- Empty transparent or opaque canvas.
- Spatial placement pose from the active adapter.
- Pointer, touch, keyboard, stylus, controller, or approved voice command input.
- Annotation strokes and edit commands.

## 8. Outputs

- Source asset record.
- Spatial window record.
- Placement/anchor record.
- Annotation document.
- Revision record.
- Flattened image derivative.
- Provenance envelope.
- Collaboration delivery record or explicit local-only status.
- Diagnostic events for capability, consent, tracking loss, persistence, and export failure.

## 9. Data Model

### 9.1 `ar_window_sessions`

- `id`
- `created_at`
- `updated_at`
- `ended_at`
- `adapter_type`: `webxr | native | preview`
- `capability_level`
- `consent_snapshot_id`
- `tracking_state`
- `failure_code`

### 9.2 `ar_windows`

- `id`
- `session_id`
- `title`
- `asset_id`
- `current_revision_id`
- `placement_mode`: `surface | user_relative | preview`
- `anchor_payload`
- `transform_payload`
- `visible`
- `created_at`
- `updated_at`

### 9.3 `visual_assets`

- `id`
- `media_type`
- `storage_path`
- `sha256`
- `byte_size`
- `pixel_width`
- `pixel_height`
- `source_kind`: `hearthgate | local_import | generated | camera | blank_canvas`
- `source_uri`
- `created_by_type`: `human | ai | system | unknown`
- `created_by_id`
- `created_at`
- `original_asset_id`

### 9.4 `visual_revisions`

- `id`
- `asset_id`
- `parent_revision_id`
- `annotation_document_id`
- `flattened_asset_id`
- `transformation_manifest`
- `created_by_type`
- `created_by_id`
- `created_at`
- `message_context_id`

### 9.5 `annotation_documents`

- `id`
- `format_version`
- `canvas_width`
- `canvas_height`
- `stroke_payload`
- `created_at`
- `updated_at`

### 9.6 `consent_snapshots`

- `id`
- `camera_allowed`
- `spatial_tracking_allowed`
- `microphone_allowed`
- `location_allowed`
- `outbound_transfer_allowed`
- `granted_at`
- `revoked_at`
- `scope`: `once | session | remembered`

### 9.7 `collaboration_deliveries`

- `id`
- `revision_id`
- `transport_type`
- `destination_id`
- `status`: `pending | delivered | failed | local_only`
- `attempted_at`
- `delivered_at`
- `failure_code`

## 10. Provenance Contract

Every displayed image must expose, at minimum:

- where the source came from;
- whether it was imported, generated, captured, or derived;
- who or what created each revision;
- the parent revision;
- the transformations applied;
- whether the displayed image is original, editable revision, or flattened derivative;
- whether the record is local, remote, cached, or simulated.

No annotation save may overwrite the original asset.

## 11. Consent and Privacy

- No camera, microphone, location, room mapping, or outbound transfer begins on route load.
- Permission prompts follow a user action and plain-language explanation.
- Camera frames are not persisted by default.
- Spatial anchor payloads remain local unless a separate sharing action is accepted.
- Microphone consent is independent of camera/spatial consent.
- Outbound image transmission is independent of local editing consent.
- Revocation must stop the corresponding service and update visible state.
- Consent state must never be inferred from browser permission state alone.

## 12. Accessibility Contract

- All essential actions available without gesture-only interaction.
- Keyboard-operable desktop fallback.
- Touch targets meet platform accessibility guidance.
- Stylus input supported through pointer events where available.
- Visible focus states.
- Screen-reader labels for controls and status changes.
- Tracking and placement instructions available as text, not only animation.
- Reduced-motion mode removes unnecessary interpolation and pulsing.
- High-contrast mode preserves window boundary and controls.
- Zoom and scale controls do not depend on pinch gestures.
- Audio feedback is off by default and independently consented.

## 13. Responsive and Layout Behaviour

- AR view reserves a persistent, reachable control dock.
- Controls may collapse, but the Home/Exit, Reset, Consent, and Tracking Status controls remain reachable.
- Desktop preview supports narrow and wide layouts.
- On mobile, metadata opens as a sheet rather than covering the image.
- Safe areas and orientation changes must not strand controls.

## 14. Failure States

The system must distinguish and display:

- WebXR unavailable;
- immersive AR unsupported;
- permission denied;
- permission revoked;
- tracking initialisation failed;
- tracking temporarily lost;
- anchor restoration unavailable;
- image decode failed;
- image too large;
- persistence failed;
- annotation save failed;
- export failed;
- collaboration transport unavailable;
- delivery failed.

Each failure state requires a recovery action where recovery is possible.

## 15. Integration Points

- Canonical Hearthgate shell and navigation.
- Existing local storage/data service.
- Existing asset or archive system, if present.
- Collaboration/chat transport, if present.
- Diagnostics service.
- Accessibility preferences.
- Future smart-glasses adapter boundary.

Implementation must inspect these existing systems before creating new stores or transports.

## 16. Proposed Component Boundaries

- `ArCapabilityService`
- `ArSessionAdapter`
- `WebXrArAdapter`
- `PreviewArAdapter`
- `ArWindowRepository`
- `VisualAssetRepository`
- `AnnotationEngine`
- `ProvenanceService`
- `ConsentService`
- `CollaborationDeliveryService`
- `ArWindowRoom`
- `ArControlDock`
- `TrackingStatusPanel`
- `ProvenancePanel`

Names are provisional until the existing code architecture is inspected.

## 17. Acceptance Criteria

AR Window 0.1 may be marked FUNCTIONAL only when all required criteria pass:

1. The route opens inside the canonical Hearthgate shell and provides a reliable Home path.
2. No sensor permission is requested on route load.
3. The user can enter preview mode on unsupported devices.
4. On a supported AR device, the user can start a session and place one image window.
5. The user can import a PNG, JPEG, or WebP image.
6. The user can move, rotate, scale, reset, hide, and restore the window.
7. The user can annotate using pen, erase, undo, redo, and clear.
8. Saving creates a new revision and does not mutate the source asset.
9. The provenance panel correctly distinguishes source, revision, and derivative.
10. The image record and revision history survive application restart.
11. Tracking loss is visible and does not silently discard edits.
12. Permission denial and revocation produce recoverable states.
13. The desktop fallback supports keyboard operation for all essential image and annotation actions.
14. Reduced-motion mode removes nonessential motion.
15. `Send revision` either delivers through a configured transport or reports local-only/unavailable honestly.
16. Automated tests cover persistence, revision immutability, consent gating, and principal failure states.
17. Boxfire completes structured QA against this contract.

## 18. Verification Plan

### Unit tests

- `consentService.doesNotInferApplicationConsentFromBrowserPermission`
- `visualAssetRepository.preservesOriginalBytesAcrossRevisionSave`
- `annotationEngine.undoRedoRoundTrip`
- `provenanceService.buildsCompleteRevisionChain`
- `arWindowRepository.restoresPersistedTransform`
- `deliveryService.reportsUnavailableTransportHonestly`

### Integration tests

- `arRoute.requestsNoSensorsOnLoad`
- `arSession.startsOnlyAfterExplicitConsent`
- `importAnnotateSaveCreatesImmutableRevision`
- `restartRestoresWindowAndRevisionHistory`
- `permissionRevocationStopsActiveService`
- `trackingLossPreservesUnsavedAnnotationState`

### End-to-end tests

- `desktopPreviewKeyboardWorkflow`
- `supportedDevicePlaceManipulateAnnotateReturnWorkflow`
- `unsupportedDeviceFallbackWorkflow`

### Manual evidence

- Screenshots/video of supported-device placement and manipulation.
- Browser/device capability report.
- Persistence evidence before and after restart.
- Consent-state screenshots.
- Failure-state screenshots.
- Boxfire QA record.

## 19. Dependencies and Unknowns

Must be inspected before implementation:

- Current Hearthgate shell route architecture.
- Existing persistence layer and migration mechanism.
- Existing asset/archive records.
- Existing consent/preferences implementation.
- Existing collaboration transport.
- Electron/WebView WebXR capability in the packaged desktop environment.
- Target hardware runtime and browser support.
- Whether the first physical-device implementation should target iPhone/iPad ARKit through a native shell, Android/WebXR, or later Maverick glasses support.

These unknowns do not block the contract. They determine the adapter selected for the first functional implementation.

## 20. Definition of the Current Result

This document establishes AR Window 0.1 as **SPECIFIED** only.

No functional, verified, released, hardware-compatible, or production-ready claim is made by the existence of this contract.
