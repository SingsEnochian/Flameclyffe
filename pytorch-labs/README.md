# STARWELL PyTorch Labs

Experimental Python/PyTorch workbench for STARWELL, DEEP Observer, grown materials, liquid light, tone/haptic recipes, and lore-aware instruments.

These labs are intentionally outside the production React build. They are workshop tools first. A lab earns its way into STARWELL only after it is legible, reversible, testable, and consent-safe.

## Current lab roots

- `observer-math-registry-v0/` defines the swappable mathematics layer Nocturne requested. DEEP Theory becomes one math source, not the only math source.
- `material-intuition-v0/` trains and tests small mappings from observer samples into grown-material CSS variables.

## Design rule

The Observer Engine has four layers:

1. **Source adapters** turn different signal origins into shared feature dictionaries.
2. **Math lenses** transform those features into observer vectors.
3. **Output heads** translate observer vectors into material, glyph, sound, haptic, or lore outputs.
4. **Export artifacts** carry only small stable results into the live app.

No uncontrolled model runs inside the sacred room. The neural work happens in the workshop first.
