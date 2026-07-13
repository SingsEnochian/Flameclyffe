# STARWELL Spatial Portal · Mobile AR

Unity AR Foundation proving ground for the STARWELL room portal.

## Targets

- iPhone
- iPad
- Android devices with ARCore support

## Project intent

Place one anchored STARWELL portal in a physical room. Touch glyphs around its rim to change the active scene. The same scene manifest is intended to feed a future Maverick LOS renderer.

## Recommended editor and packages

Use a current Unity 6 editor compatible with the chosen AR Foundation package line.

Required packages:

- AR Foundation
- Apple ARKit XR Plug-in
- Google ARCore XR Plug-in
- XR Plug-in Management
- Input System or legacy input enabled for the prototype

The repository scaffold intentionally does not claim a verified Unity build yet. Package and platform settings must be resolved in the Unity Editor and committed only after the project opens cleanly.

## Scene setup

Create a scene named `PortalPrototype` containing:

1. `AR Session`
2. `XR Origin (Mobile AR)`
3. On the XR Origin:
   - `AR Plane Manager`
   - `AR Raycast Manager`
   - `AR Anchor Manager`
4. A camera tagged `MainCamera` beneath the XR Origin
5. `PortalPlacementController`
6. A portal prefab with:
   - `PortalSceneController`
   - frame geometry
   - one interior renderer
   - one `PortalHotspot` per manifest scene
   - colliders on all hotspots
7. A screen-space `Re-place` button calling `PortalPlacementController.ResetPlacement()`

Set plane detection to Horizontal and Vertical for the first test slice.

## Runtime flow

1. Scan the room until planes appear.
2. Tap a plane to place the portal.
3. Tap a rim glyph to activate a scene.
4. Tap Re-place to remove the anchor and place again.

## Manifest

Runtime scene data lives at:

`Assets/StreamingAssets/starwell-portal-scenes.json`

It is renderer-neutral and must remain free of Unity-only or Maverick-only object references.

## Device build notes

### iPhone / iPad

- Enable the Apple ARKit provider under XR Plug-in Management.
- Add a camera usage description.
- Export the Xcode project and sign it with the active Apple developer team.
- Test on a physical device. The simulator is not evidence of AR tracking.

### Android

- Enable the Google ARCore provider under XR Plug-in Management.
- Mark AR as required for the first prototype unless a non-AR fallback is deliberately added.
- Build an ARM64 development APK or AAB.
- Test on an ARCore-supported physical device.

## Privacy boundary

The prototype does not upload or persist camera frames, room maps, anchors, or meshes. Camera access is used only for the active AR session.

## Current status

Scaffold only. No device build has been verified yet.
