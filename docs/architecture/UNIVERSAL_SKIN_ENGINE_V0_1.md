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
- semantic UI tokens
- source kind
- provenance
- material measures such as panel/control radius and blur

Core token families:

- background / alternate background
- sidebar
- panel / raised panel
- input
- line / soft line
- text / muted text
- primary / secondary / cool / warm accents
- danger / success
- shadow
- panel radius
- control radius
- blur

## One palette, many surfaces

A skin pack is surface-neutral. Adapters map its semantic tokens into each application's native variables.

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

The adapter uses an injected high-priority presentation layer so current world rendering may continue to exist without owning the active skin.

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

## Whim switcher

Both surfaces mount a compact `✦ Skin` dock.

The dock can:

1. instantly apply a built-in skin,
2. use Rowan-owned COLOURlovers palettes already registered in Palette Atlas,
3. accept 3–12 pasted six-digit hex colours and generate a temporary skin immediately,
4. return to Hearthglass.

The generator derives dark surfaces, readable text, lines and accents from the supplied palette rather than treating five swatches as five fixed UI roles.

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

A skin may change colour, material impression, radii, blur and presentation glow only.

## Accessibility

Palette-to-skin generation selects readable foreground text against the generated dark field and preserves existing application accessibility controls. Future audition work should also test colour-blind state separation, grayscale hierarchy and reduced-transparency modes.

## Next seams

1. Import the remainder of Rowan's owner-authorised palette history.
2. Add a full Skin Atelier with naming, live edit, save-as, export/import and thumbnail previews.
3. Add explicit material packs: glass, stonewood, vellum, metal, liquid-light, textile, ink, holo-organic.
4. Add typography and iconography layers without allowing skin packs to alter semantic control meaning.
5. Add optional account-level skin sync after local behaviour is verified.
6. Add skin adapters to Starwell, Universal Codex, Glyph Forge and other House surfaces.
