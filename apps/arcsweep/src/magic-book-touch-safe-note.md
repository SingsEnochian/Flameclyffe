# Universal Codex touch-safe fallback

Touch devices use a deliberately simplified Codex composition until the hardware reader path is proven stable. The fallback removes background ArcSweep surfaces, WebGL/cosmetic layers, transforms, and competing hit targets while preserving the Codex DOM, state, page controls, Living Page, glyph controls, persistence, and lineage.

This is a hardware baseline, not a visual direction. Reintroduce effects only after the iPad interaction path is confirmed working.
