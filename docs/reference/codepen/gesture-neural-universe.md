# Gesture Neural Universe

Source: https://codepen.io/VoXelo/pen/yyYJNRg

Visible title in paste: Neural Network Universe - Gesture Controlled.

Author: Techartist.

Category: gesture control, MediaPipe hands, DEEP sensory input, neural branches, color flow, pulse interaction, heatmap HUD.

## What it teaches

This is a full-screen Three.js neural universe controlled by hand gestures.

Useful parts:

- MediaPipe Hands camera input
- hidden video feed with visible heatmap canvas
- hand skeleton and landmark visualization
- gesture status HUD
- index-finger gesture for neural pulse
- two-hand gesture for camera navigation
- hand trail visualization
- structured neural node layers
- curved synapse tubes with signal flow shaders
- shader node bodies with fresnel glow, rings, breathing, and pulse response
- color schemes for palette/mode change
- floating data structures around the network
- particle field and bloom post-processing

## Adaptation targets

- DeepGestureControlLayer
- DeepHandHeatmapHUD
- DeepNeuralUniverse
- DeepSynapseBranchField
- DeepGesturePulse
- DeepTwoHandNavigation
- deepGestureRecognition
- deepBranchColorFlow
- useHandGestureInput
- useGestureConsentGate

## DEEP use

Use as a reference for optional, consent-gated gesture interaction with the instrument.

Potential mappings:

- index finger: send pulse, select branch, activate node, or ping signal
- two hands: navigate field, rotate instrument, hold observation mode
- heatmap: accessibility/debug view for sensed input
- hand trails: intent trace, gesture memory, or recent interaction path
- synapse color flow: branch state, signal routing, coherence current, or resonance movement

## Implementation cautions

- camera and gesture input must be opt-in only
- provide clear consent, active status, and stop controls
- never require camera for core use
- add reduced-motion and low-power modes
- make hand tracking optional and replaceable with mouse, touch, keyboard, or eye-gaze controls
- confirm license before close adaptation
- rebuild as contained React, Three, and sensor modules
- separate gesture recognition from visual rendering
- dispose camera streams, listeners, geometries, materials, and animation loops cleanly
