# Bz Palette Rule v0.1

This note makes the STARWELL / DEEP Observer Bz palette mapping official.

## Official rule

```text
Positive Bz = cool / quiet / holding palette
Near-zero Bz = neutral / liminal / threshold palette
Negative Bz = warm / active / angry palette
```

## Scientific anchor

Bz is the north-south component of the interplanetary magnetic field.

Within this instrument, we use Bz as a field-orientation input:

- **Positive Bz** reads as more holding / less geoeffective for the visual mood.
- **Near-zero Bz** reads as balanced, undecided, or liminal.
- **Negative Bz** reads as more open / more geoeffective / more active.

This is used as a visual translation rule, not as standalone prediction or proof.

## Instrument behaviour

Bz should control the thermal/emotional temperature of the palette, not the whole theme.

The active theme decides how this rule appears materially.

### Between theme example

- Positive Bz: icy silver-blue, moon-glass, quiet mist
- Near-zero Bz: pearl, silver-violet, threshold fog
- Negative Bz: copper-gold flare, ember in fog, warm storm edge

### Forge theme example

- Positive Bz: banked steel-blue coals
- Near-zero Bz: ash-silver, muted iron
- Negative Bz: orange-red heat bloom, copper sparks

### Grove theme example

- Positive Bz: cool moonleaf green-blue
- Near-zero Bz: pale lichen mist
- Negative Bz: autumn-gold, foxfire, root-ember

## Registry rule

Do not hardcode this directly into the renderer.

This belongs in a field/palette mapping registry so thresholds and palette families can be tuned later through the DEV console or registry import/export.

## Suggested thresholds

These are starting values, not permanent law:

```text
Bz >= +1.0 → positive / quiet / cool
-1.0 < Bz < +1.0 → neutral / liminal
Bz <= -1.0 → negative / active / warm
```

Later tuning may use ±2.0 if the palette shifts too often.

## Boundary language

Use this wording in UI and docs:

```text
Bz shifts the field palette: positive values cool and quiet the instrument, near-zero values keep it liminal, and negative values warm and activate the field. This is an experimental visual translation layer, not a standalone prediction.
```

## Canon sentence

```text
Bz sets the thermal mood of the field: positive Bz cools and quiets, near-zero Bz holds liminal silver, and negative Bz warms into active storm colour.
```
