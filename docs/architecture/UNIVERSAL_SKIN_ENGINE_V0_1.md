# Universal Skin Engine v0.1

Status: draft runtime slice  
Authority: Rowan explicit instruction, 2026-10-01  
Scope: ArcSweep + Flameclyffe Studio first; reusable by other House surfaces

## Intent

Rowan should be able to reskin ArcSweep and Flameclyffe on a whim without changing world state, canon, content, data or application behaviour.

The skin is presentation. It is not identity and it is not world ontology.

## Contract

Skin packs use `hearthweave.universal-skin/v0.1` and carry:

- stable `id`
- `name`
- palette colours
- optional named colours
- semantic UI tokens
- source kind
- provenance
- a material descriptor

Core colour token families:

- background / alternate background
- sidebar
- panel / raised panel
- input
- line / soft line
- text / muted text
- primary / secondary / cool / warm / deep accents
- danger / success
- shadow
- panel radius
- control radius
- blur

## Living glass material architecture

The first material family is **living glass**. It is not a fixed cyan glassmorphism preset. The glass inherits its tint, rim and glow from the active skin.

Material fields currently include:

- `id`
- `family`
- `panelOpacity`
- `raisedOpacity`
- `inputOpacity`
- `blur`
- `saturate`
- `borderAlpha`
- `highlightAlpha`
- `shadowAlpha`
- `glowAlpha`
- `tint`
- `rim`
- `glow`

This lets the same panel architecture become mossglass, hearthglass, violet glass, amber glass or any future palette-derived material without rewriting the UI.

### Panel depth

Glass is treated as a depth system rather than one repeated translucent rectangle.

- base panels receive tint + rim + highlight + shadow + low glow;
- raised panels use a denser surface and stronger local hierarchy;
- nested panels intentionally disable repeated backdrop blur to avoid muddy stacked-glass artefacts;
- inputs and controls use a denser glass surface than ambient panels;
- focus state increases rim/glow emphasis rather than changing semantic meaning.

### Environmental light

The page background supplies broad palette-derived radial light fields. Panels refract that environment through blur and saturation rather than carrying an unrelated hard-coded hue.

The result should feel like one spatial material system, not cards pasted over a wallpaper.

### Accessibility and graceful degradation

The glass layer includes:

- solid panel fallback when `backdrop-filter` is unsupported;
- `prefers-reduced-transparency` fallback to opaque semantic panel colours;
- readable text selection remains palette-derived and contrast-tested;
- semantic states do not rely on glass or glow alone.

## Rowan session skin: Her Eyes Like Moss

The current session-derived skin contains:

- `#3D504B` — **Her Eyes Like Moss**
- `#84A29A` — **In the Green**
- `#988FBD` — **Gooseberry & Lilac**
- `#342C54` — **Midnight Lilac**
- `#280181` — **Lapis Winged**
- `#012819` — intentionally awaiting a final name

Its material id is `mossglass` and uses deep green environmental tint with lilac/lapis accent light.

## One palette, many surfaces

A skin pack is surface-neutral. Adapters map its semantic tokens and material values into each application's native variables.

### ArcSweep adapter

Maps into existing variables such as:

- `--bg`
- `--sidebar`
- `--panel-solid`
- `--panel-2`
- `--line`
- `--line-soft`
- `--text`
- `--muted`
- `--gold`
- `--copper`
- `--green`
- `--danger`

The adapter also exposes material variables such as `--glass-tint`, `--glass-rim`, `--glass-glow`, surface opacity, blur and saturation. Core panels, sidebar, editor surfaces and cards now consume those values.

### Flameclyffe Studio adapter

Maps into existing variables such as:

- `--bg`
- `--card`
- `--card2`
- `--text`
- `--muted`
- `--border`
- `--accent`
- `--accent2`
- `--gold`

Studio cards, fields, tiles, layers, presets and the site header now consume the same living-glass material contract rather than using an independent glass recipe.

## Whim switcher

Both surfaces mount a compact `✦ Skin` dock.

The dock can:

1. instantly apply a built-in skin,
2. use Rowan-owned COLOURlovers palettes already registered in Palette Atlas,
3. use Rowan session skins such as **Her Eyes Like Moss**,
4. accept 3–12 pasted six-digit hex colours and generate a temporary skin immediately,
5. return to Hearthglass.

The generator derives dark surfaces, readable text, lines, accents and a default living-glass material from the supplied palette rather than treating swatches as fixed UI roles.

## Shared state

The active pack is stored under:

`hearthweave:universal-skin/v0.1`

When surfaces share an origin they also synchronise live through:

`BroadcastChannel('hearthweave-universal-skin')`

This means changing ArcSweep can repaint an open Flameclyffe Studio tab, and vice versa, without reload when browser origin permits it.

Different origins/deployments keep their own local copies until an explicit cross-origin/user-account synchronisation seam is added.

## Boundaries

Changing a skin does not mutate:

- ArcSweep world state
- Flameclyffe signal/audio state
- continuity
- canon
- identity
- authority
- persisted story content
- application logic

A skin may change colour, material impression, radii, blur, transparency, saturation and presentation glow only.

## Next seams

1. Add a full Skin Atelier with naming, live edit, save-as, export/import and thumbnail previews.
2. Add material presets beyond living glass: stonewood, vellum, metal, liquid-light, textile, ink, holo-organic.
3. Add material audition controls for opacity / blur / rim / glow while preserving semantic tokens.
4. Add typography and iconography layers without allowing skin packs to alter semantic control meaning.
5. Add optional account-level skin sync after local behaviour is verified.
6. Add skin adapters to Starwell, Universal Codex, Glyph Forge and other House surfaces.
