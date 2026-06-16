# AirControl Floating Screens

Source: https://codepen.io/Nurjamol-Xoliqulova/pen/JoRdaGg

Author: Nurjamol Xoliqulova.

Visible title in paste: AirControl Demo.

Category: floating UI panels, draggable screen mockup, gesture-interface placeholder, experimental only.

## Diagnosis

The pasted demo describes an air-control gesture interface, but the actual implemented behavior is mouse dragging only.

What is implemented:

- dark full-screen page
- three floating cyan glass-like panels
- instructional text for imagined hand gestures
- mousedown, mousemove, and mouseup dragging for each panel

What is not implemented:

- no camera input
- no MediaPipe or hand tracking
- no gesture recognition
- no finger cursor
- no wave-left or wave-right screen switching
- no touch handling
- no keyboard accessibility

## What it teaches

Use this only as a simple floating-panel layout reference or as a cautionary example of UI promises not backed by actual input logic.

Useful parts:

- draggable panels as a lightweight spatial UI mockup
- clear instruction cards
- cyan glass panel styling
- simple manual rearrangement of panels

## Adaptation targets

- FloatingPanelLayer
- DraggablePanel
- AirControlPlaceholder
- SpatialInstructionCards

## DEEP use

Useful only as a low-fidelity sketch for movable HUD panels or spatial screens.

It is not a true gesture-control reference. Use Gesture Neural Universe for real consent-gated gesture input patterns.

## Implementation cautions

- do not label features as gesture-controlled unless gesture input is implemented
- add pointer and touch events if using draggable panels
- add keyboard movement and focus handling
- constrain drag bounds or provide reset layout
- store panel layout only if useful
- separate placeholder UI from real sensor-backed interaction
