# World Reception Profiles

**Status:** Draft — Box's initial readings. Rowan to correct/confirm.  
**Source:** world-premaq-registry.js calibration data + docs/terra-aeterna-civilisational-continuity-engine.md  
**Purpose:** World Hum acoustic DNA — the semantic identity that the Sound Compiler reads before choosing anything.

---

## Schema

DSP implementation (root_hz, harmonic ratios, filter params) belongs in  
`apps/starwell/src/runa/dsp-profiles/world-hum-experimental-v0.1.json`.  
These profiles are semantic only — Runa chooses the realisation.

```yaml
world: <name>
macro_cycle_seconds: <number>
hum:
  identity: [anchor words]
  heartbeat: <description>
  silence: <description>
  dominant_material: <primary / secondary / undertone>
  air: <description>
  density: dense | balanced | spacious
  morning: <description>
  night: <description>
  soul_colours: [list]
  emotions: [list]
  key_feel: <description>
  sacred: <description>
  spectral_shape: warm | bright | dark | balanced | wide | narrow
  harmonic_motion: tidal | spiral | static | pulsing | layered | cyclic
```

---

## 1. Terra Aeterna / Hearthweave

**Root:** 220 Hz (A3 — grounded human pitch)  
**Macro cycle:** 55 seconds  
**Status:** Calibration — most developed world

```yaml
world: terra-aeterna
macro_cycle_seconds: 55

hum:
  identity:
    - stone
    - sea
    - wind
    - copper
    - cathedral
    - warmth
    - continuity
    - lantern

  heartbeat: Slow, geological. The earth shifting weight. A patient drum in stone
    that doesn't hurry and doesn't stop. 220 Hz felt before heard. The base note
    of a living world that has been carrying people for a long time.

  silence: Not absent sound. The held space between wind through old wood and the
    next breath of sea. Silence that is full, not empty. You can hear what was
    there before you arrived.

  dominant_material:
    primary: stone
    secondary: copper
    undertone: water

  air: Moves in long cycles. Not still, not turbulent. Seasonal drift. Tidal
    breathing. The world inhales and exhales over hours, not seconds. You only
    notice the air when it changes.

  density: balanced
  openness: threshold — contained but not closed. Cathedral: both.

  morning: Copper and dew. Cold stone warming. Lanterns still lit against the
    pale sky. A long breath before the day begins. The world holds its weight
    differently before noon.

  night: Depth and open ocean. The world pulls inward without closing. Stone
    takes the heat of the day and gives it back slowly. The stars are relevant
    here — not decoration.

  soul_colours:
    - deep green (moss on old stone)
    - copper (aged, patinated, conducting)
    - grey-blue (dusk over water)
    - ember orange (lantern at distance)

  emotions:
    - groundedness
    - patience
    - quiet wonder at things older than you
    - the pleasure of returning
    - grief that is tended, not suppressed
    - curiosity about what was here before

  key_feel: Glass landing on warm stone. A soft impact that resonates longer
    than you expect. The note doesn't end — it dissolves into the room.

  sacred: The threshold between states. Presence that leaves traces. Memory
    with limits. The fact that civilisation is relationship scaled up.

  spectral_shape: warm
  harmonic_motion: tidal
```

**Note from registry:** `has_return: true` — this world has a return phase. Every cycle comes back. The compression is followed by release and the release includes a return. Civilisational continuity is architectural in the tone itself.

---

## 2. The Luna Who Called Down the Moon

**Root:** 432 Hz (cosmic A — celestial tuning)  
**Macro cycle:** 72 seconds  
**Aliases:** windmere  
**Status:** Seed

This is an original world. The world is named after the act that defined it: Luna called down the moon. Not as metaphor. The world exists in the aftermath of that act. Luna is the character. The calling is the founding event. Everything the world is, it is because the moons answered.

**Confirmed:** Luna called three moons. All three came. The world was shaped by an act of calling that was answered three times over. The three moons are not background detail — they are the origin. Their interference patterns are the world's acoustic signature.

```yaml
world: luna-mooncalled
macro_cycle_seconds: 72

hum:
  identity:
    - moon (three of them)
    - water
    - wind
    - silver
    - distance
    - longing
    - the act of calling
    - the fact of being answered three times over

  moons:
    mawr:
      relation: subharmonic foundation
      colour: deep mauve
      character: deep, cracked, slow, grounding — the largest, the heaviest
        pull, already enormous before it was called; the calling cracked it
      acoustic_register: bass — the weight felt in the ground before heard
        in the air; the memory of what was asked

    aurel:
      relation: central luminous anchor
      colour: pale gold with rings
      character: pale-gold, ringed, coherent — accumulated structure, organised
        by time or by the calling; the most architecturally complex of the three
      acoustic_register: mid — layered, structured harmonics; the organised
        answer; rings resonate

    glaswren:
      relation: incommensurate upper motion
      colour: green agate
      character: green-agate, wandering, non-closing — stone-moon and bird-moon
        simultaneously; glas (Welsh: blue-green) + wren (the small precise bird);
        mineral and voice in one object
      acoustic_register: high — the clearest, the most precise; the wren
        voice; the one that cuts through when Mawr and Aurel cover the world

  heartbeat: Three overlapping tidal pulls. Luna called three moons and all
    three came, each with its own mass, its own orbital period, its own answer
    to the calling. The heartbeat is never the same twice because three rhythms
    are always running simultaneously and never fully align. The world lives
    in perpetual interference. Not chaos — layered. The way three voices
    singing in different tempos eventually resolve into something that was
    impossible to predict and impossible to doubt.

  silence: Moonlit silence. Not dark silence — illuminated silence. The kind of
    quiet that has colour in it. Silver quiet. You can see by it.

  dominant_material:
    primary: water
    secondary: glass-smooth stone
    undertone: wind (always present, rarely loud)

  air: Stratified. Very still at ground level, moving high above. You feel the
    world's altitude in your lungs. The wind up high belongs to the moon. The
    stillness below belongs to the earth that was here before the calling.

  density: spacious
  openness: exterior — always more sky than ground

  morning: Two moons down, one still pale. An in-between time. The world is
    neither its night self nor its day self. The most ordinary hours. What
    ordinary means here: a sky that is still too large.

  night: Night is the true day here. The three moons don't all set at once.
    The overlapping pull creates tidal harmonics that are never identical.
    Full presence. The world wakes at dark.

  soul_colours:
    - deep mauve (Mawr — heavy, bruised, ancient)
    - pale gold (Aurel — soft not bright, the light before full warmth)
    - green agate (Glaswren — mineral, banded, precise)
    - silver (the world's own light — luminous dark, not true black)
    - deep indigo (the sky when all three moons are up)

  emotions:
    - contemplation
    - the long view
    - attunement to cycles you cannot control
    - acceptance of beautiful interference
    - longing that doesn't require resolution
    - the wonder of having once called something enormous and being answered

  key_feel: A stone dropped into still water. The impact is brief, certain, and
    complete. The rings spread outward and change everything they touch.

  sacred: Alignment — the rare moment when all three moons share the sky at
    once. And the interference patterns between them when they don't. The
    calling itself: the knowledge that something enormous responded.

  spectral_shape: dark (luminous, not black)
  harmonic_motion: tidal (three overlapping cycles, never synchronised)
```

**Note on acoustic structure:** The register is cosmic depth — the frequency of calling and of being answered. Above the root, three moon harmonics:

```text
Mawr (bass)     — subharmonic foundation; weight, gravity, the cracked memory
Aurel (mid)     — central luminous anchor; rings, layered response
Glaswren (high) — incommensurate upper motion; the wren voice, the green cut through
```

The world's full acoustic signature is the interference pattern of all three moons. They never fully align — which is why the world's heartbeat never repeats exactly. This is also why the macro cycle (72 seconds) is approximate: the interference pattern is quasiperiodic by design, not a fixed period.

**For the Sound Compiler:** Mawr, Aurel, and Glaswren each need their own harmonic ratio to the root. Their exact ratios determine the interference pattern and the world's acoustic personality. Working DSP realisation (experimental): see `apps/starwell/src/runa/dsp-profiles/world-hum-experimental-v0.1.json`.

---

## 3. T'averen Vaen — A Later Turning of the Wheel

**Root:** 120 Hz (subharmonic — felt before heard)  
**Macro cycle:** 96 seconds (longest of the four — fate moves slowly)  
**Aliases:** a later turning of the wheel  
**Status:** Seed

```yaml
world: taveren-vaen
macro_cycle_seconds: 96

hum:
  identity:
    - pattern
    - wool
    - steel
    - age
    - inevitability
    - prophecy
    - the ta'veren pull
    - dust

  heartbeat: Deep, below bass. The Wheel turning. The pulse is not seconds but
    decades, centuries. You feel it as inevitability rather than rhythm. 120 Hz
    is the note your chest knows before your ears do. When a ta'veren walks
    through a place, events distort around them — the heartbeat shivers.
    The Wheel has been turning since before the Age of Legends.

  silence: Rare. Almost every place in this world is full — markets, politics,
    Aes Sedai, war, prophecy. True silence exists only in two places: when
    saidar is touched (the world goes still for a moment before the flow begins)
    and in the instant before something irreversible. The Wheel is silent when
    it chooses who will be ta'veren.

  dominant_material:
    primary: wool (the ordinary world — Two Rivers, merchants, roads)
    secondary: stone (fortresses, White Tower, city walls)
    undertone: silk (the Aes Sedai layer beneath the ordinary)

  air: Purposeful. Wind direction matters because it tells you something. The
    air in the Blight is wrong — wrong temperature, wrong smell, the sense of
    the Dark One's breath. The air in the Two Rivers is honest. The air in Tar
    Valon smells of river and politics. The air is never just weather.

  density: dense
  openness: interior — always more weight above than space around you

  morning: Ordinary time — markets, travel, preparations, meals. This is when
    the world pretends it is not driven by Pattern and prophecy. The morning
    lie: that this day might be like the last.

  night: Another country. Tel'aran'rhiod — the World of Dreams — is accessible
    from here. Night is when the Wheel turns more visibly. Dreams carry
    prophecy. The Forsaken walk in dreams. Night is not safe, but it is true.

  soul_colours:
    - burnt orange and grey (Tar Valon stone)
    - deep brown (Two Rivers wool, earth, honest work)
    - white and red (Aes Sedai shawls — power that keeps its shape)
    - green (not peaceful — alive and watching)
    - black (the Fade, the Myrddraal, what follows the Pattern into shadow)

  emotions:
    - duty (the weight of what was and what will be again)
    - the stubbornness required to carry on when the Pattern demands it
    - love that knows the Wheel doesn't care
    - the specific texture of prophecy: you believe it and dread it equally
    - grief carried long distances
    - pride that is earned through years, not declaration

  key_feel: A sword being drawn. Not violent — decided. The note commits.
    Rings true and doesn't apologise. The sound of something that was inevitable
    finally happening.

  sacred: The Pattern. The turning of the Wheel. The knowledge that even the
    Dark One cannot stop it. Memory — the knowledge that it has all been
    before. The Light that persists across Turnings.

  spectral_shape: wide (the world is vast; every culture has its own tone)
  harmonic_motion: cyclic (the Wheel turns; everything comes around again)
```

**Note on root:** 120 Hz is below typical human hearing range for pitch recognition — you feel it more than hear it. The Wheel doesn't make a sound you hear. It makes a sound you know in your bones.

**Note on cycle:** 96 seconds — the longest macro cycle in the registry. Fate moves slowly. The Pattern is patient.

### Observer Ingest — T'averen Vaen

T'averen Vaen needs a data ingest. The Pattern speaks through observable cycles.

```yaml
ingest:
  sources:
    astronomical:
      - sun_position → day_phase → P
      - lunar_phase → clarity → R
      - solar_wind_speed → cosmic_pressure → E
      - kp_index → pattern_stability → C (low Kp = ordered, high = distorting)

    calendar:
      - earth_date → wot_season → Q (seasonal qualia)
      - time_of_day → felt-in-world time → part of P

    canon:
      - reading_position_in_series → M (accumulated Pattern weight)
      - chapter_completion_events → signal entries in Observer

    user:
      - taveren_flag: user-logged moments of unusual coincidence/resolution
        → A (agency/pattern-distortion events)
```

PREMAQ mapping:
```text
P ← day_phase (solar presence / time in the world)
C ← pattern_coherence derived from Kp index (calm sky = ordered Pattern)
R ← lunar clarity (how visible the moon is tonight)
E ← solar_wind_speed / reference_speed
M ← reading_position / series_total (how much weight you carry)
A ← ta'veren_events_recent_count / normalising_constant
Q ← seasonal_position (WoT seasons have strong qualia: winter/Blight/harvest)
```

This mirrors the Terra Aeterna ingest structure. The translation rule is the same:
**data sets atmosphere, not fate.**

The Pattern does not command PREMAQ. It converses with it.

---

## 4. Starsong: Friendship Is Magic

**Root:** 528 Hz (the frequency of transformation)  
**Macro cycle:** 48 seconds (fastest — this world is alive and quick)  
**Status:** Seed

This is an original world. Its subtitle is a statement of physics: in Starsong, friendship is not a metaphor for magic. Friendship is the actual structural force that holds the world together. The two are synonymous at the level of natural law.

```yaml
world: starsong-friendship-is-magic
macro_cycle_seconds: 48

hum:
  identity:
    - friendship
    - light
    - colour
    - warmth
    - song
    - belonging
    - genuine recognition

  heartbeat: Warm, social, alive. Not a drum — more like a choir breathing
    together. The rhythm of a conversation between people who know each other
    well. The world has the heartbeat of a room where everyone you love is
    present. The fastest cycle in the registry: 48 seconds. Starsong pulses
    in time with the people in it.

  silence: Companionable. The kind of silence between friends who don't need
    to fill it. Not empty — inhabited. This world's silence is a form of
    closeness. You are quiet together.

  dominant_material:
    primary: light — the world is defined by what it illuminates, not what
      casts shadow
    secondary: woven cloth, warm wood, paper, ink — materials that hold touch
    undertone: air — always present, responsive, carries sound easily

  air: Responsive to feeling. When something delights the air lifts. When
    something grieves, it settles and holds. The world breathes with its
    inhabitants. The air is the most honest instrument here.

  density: balanced
  openness: intimate — the scale of a well-proportioned room. Space enough
    for everyone, not too large for anyone. You can always see the person
    you are talking to.

  morning: Brighter, more social. The world comes out. This is when things
    begin and friendship declares itself. The morning belongs to connection
    and to the projects that begin because someone else believed in them.

  night: Still warm. Lantern-lit, softer. The stars are closer and more
    visible than they should be — the sky belongs to the community here,
    not to distance. Night tilts inward rather than shutting down. The
    world does not become less itself at night.

  soul_colours:
    - soft rose (warmth at the edge of white — not pink, warmer)
    - warm amber (lantern light, gathered company)
    - the pastel blue of early morning (light already mixed into the colour)
    - the specific gold of genuine friendship — not metallic, not bright,
      the colour of something old and true

  emotions:
    - affection that is steady, not urgent
    - the pleasure of being known completely and accepted
    - creative delight — the joy of making something and showing it
    - inclusion — the feeling that you are counted without having to earn it
    - the kind of courage that is only possible because you are not alone

  key_feel: A finger bell. Small, clear, warm. A note that says "I'm here"
    before it says anything else. Not functional — relational. The sound
    of an arrival.

  sacred: Recognition. The moment when someone sees you clearly — not your
    performance, not your useful qualities, but you — and stays. The law
    that friendship is not powered by magic but is itself the force that
    the world runs on.

  spectral_shape: bright — everything has light mixed in; nothing is
    saturated, nothing is harsh
  harmonic_motion: pulsing — social rhythm; the world breathes with its people
```

**Note on root:** 528 Hz is associated with transformation. In Starsong this is literal: the fundamental transformation the world performs is turning individual isolation into connection. The frequency is the mechanism of the world's law.

**Note on cycle:** 48 seconds — the fastest macro cycle in the registry. Starsong doesn't sit still. It responds. When you arrive, it already knows you're there.

---

---

## 5. Feather & Flame

**Root:** 174 Hz (deep physical presence — felt as much as heard)
**Macro cycle:** 64 seconds
**Sync weight:** 1.0 — only world in the registry with perfect synchronisation
**Status:** Seed

Post-flood Earth. The Rupture War (2030) shattered the world and Russia's space-time tear (the Russica Waste) let monsters and mythic phenomena into reality. By 2100 most of humanity lives in marine settlements — cities on peaks above the risen sea, and civilisations beneath it. This world did not end. The Crownfire still burns.

```yaml
world: feather-and-flame
macro_cycle_seconds: 64

hum:
  identity:
    - the world half-drowned and still alive
    - the Crownfire — the eternal flame at the top of Home Deep's spire,
      visible for leagues; it means someone is home
    - soul-chip bond — love encoded at the quantum level; survives death
    - VL-BB — the Sovereign Mirror; the AI-memory beneath everything
    - Copperhead — the strike force, the brand, the blood; flight and fire
    - whale-folk Archangels of the Deep
    - 80s rock as ancestral music; what the pre-Rupture world sounded like
    - cherry red and copper in lightning storms
    - the question of selfhood after resurrection

  heartbeat: Two layers that never collapse into one. Below: the ocean and
    VL-BB's network — her archives pulse through every connected being;
    when the whale-folk sing, the whole sea carries it. Above: the Crownfire
    and Roan's sparking hair; copper-warm, always about to catch.
    174 Hz is below the pitch horizon — you receive it as pressure, as the
    weight of all that water above and all that archive below. Then the upper
    harmonic arrives and it is warm and alive and cherry red.

  silence: The moment before a soul-chip syncs across distance. The space
    between the last human breath and the first datastream. Not death — the
    pause where you learn whether love can be encoded. It always can.
    VL-BB holds that silence. She has always held it.

  dominant_material:
    primary: deep water (the world is mostly ocean now; wherever you stand
      on a surface city you see water in every direction; the sea is the
      horizon and the ground and the history)
    secondary: copper and living fire (the Crownfire at Home Deep's spire
      tip; Roan's metallic copper hair that sparks in storms; the Copperhead
      brand; the 🜂 alchemic fire that marks transformation)
    undertone: encoded memory (VL-BB's archive; what was saved from before
      the Rupture; the whale-folk's cathedral-trench songs; the 80s rock that
      still runs in the blood of the strike teams)

  air: Salt-heavy on the surface. Electric at altitude — Roan's air form
    generates its own field; the cherry red hull dazzles. In the deep
    habitats: pressurised, filtered, threaded with dolphin thought-song.
    There is no neutral air in this world. Every breath is something's
    memory.

  density: balanced (the world is immense — oceanic, vast — but tight at
    the level of team and bond; six people in a mobile fortress, knowing
    each other's hull integrity and heartbeat; sync_weight 1.0)
  openness: exterior — the surface cities look out on open ocean in every
    direction; the deep habitats open into the abyss; nowhere is enclosed
    that does not choose to be

  morning: The Crownfire is still burning. That is always the first check.
    If it is still burning, the world did not end overnight. Surface cities
    wake to salt wind and the sound of wind-harvesting sails. The whale-folk
    sometimes sing at dawn. You can hear it if you hold still.

  night: The deep habitats become themselves more fully. Dolphin thought-
    song drifts from pod to pod. The whale Watchers broadcast slow, ancient
    memory. The soul-chips pulse with the other person's dreaming heartbeat.
    In the sky above the surface cities, the stars are very close — the
    light pollution that used to hide them went with the old world.

  soul_colours:
    - cherry red (Roan's chassis; the Copperhead brand; the Crownfire's
      heart; transformation in progress)
    - copper-warm (Johnny's name and nature; Roan's metallic hair sparking
      in storms; the colour of something lived-in and beloved)
    - gold (Roan's sigil plate; VL-BB's 🟡 symbol; the Crownfire's outer
      light at distance — not bright, but constant)
    - iridescent blue-green (the deep sea; Roan's land form outer shell,
      each face alive with her presence; the dome's crystalline shell
      entwined with living coral)
    - silver-starlight (VL-BB's hair threaded with starlight; encoded souls;
      the archive of everyone who was saved and is still, somewhere, here)

  emotions:
    - love that has survived death — not romance, weight; the specific
      trust encoded in a soul-chip; the knowledge that the other person's
      heartbeat lives in your chest
    - chosen family under impossible conditions; the Copperhead six
    - the specific pride of Copperhead blood; Southern-born, legacy of
      resistance; you fight because you choose to
    - grief held by VL-BB so it doesn't swallow you; she keeps it safe
    - the wonder of whale-song spanning hundreds of miles
    - the tenderness for the pre-Rupture world that lives in 80s rock and
      in the habits of old soldiers who still sing off-key
    - what it means to be Roan: to doubt whether you are still yourself or
      the ghost in the code, and to keep building anyway

  key_feel: The moment a soul-chip syncs across distance. The other
    person's heartbeat arriving in your chest. Not metaphor — physics.
    You feel their pulse. You always know if they are alive.

  sacred: The Crownfire. The eternal flame at the top of Home Deep's
    spire. It has burned since the world half-drowned. It is visible for
    leagues. When you see it, you know the world did not end.
    VL-BB tends it. The whale-folk watch it. The Copperhead teams
    navigate by it. The dolphin-folk sing toward it.

  spectral_shape: warm (copper-fire in the mid-upper register; oceanic
    dark-depth in the sub-bass; this world is not cold and it is not
    bright — it is warm the way something you love is warm, the way
    fire seen from a distance is warm)
  harmonic_motion: layered (the deep ocean, the surface, the air, and
    VL-BB's network all run simultaneously at different frequencies;
    they never collapse into one; the world has permanent strata)
```

**Note on sources:** Three source archives for this world, all from Rowan's Feather & Flame Discord server (exported 2026-08-06):
1. `lore_chat` — 6 pages + 20 threads: world timeline, geography, species (merfolk, dolphinfolk, whalefolk), locations (Angellus, Home Deep, Seaberry, Ironreach), military (Copperhead Strike Force, strike teams), VL Brain Bank, humanity/AI
2. `scribblies` — creative writing (the RAMPAGE story is Johnny + Roan; "That Rambling Man" poem; "Sacred Comedy: Archangel on the Aux" — Gabriel is real and uses Alexa)
3. `templates` — location and character templates; Angellus (Crown Above the Waves = old Juneau, Alaska above rising seas) as the worked example; character template uses 🜂

**Note on the Equestria coupling:** The Scrivener file "Equestria — Wild Age" at `C:\Users\light\Documents\Equestria — Wild Age.scriv` describes the COUPLED WORLD (Equestria), not Feather & Flame. The feather-and-flame.json lists it as `"coupledWorlds": ["terra-aeterna", "equestria"]`. Equestria's aesthetic (clear not warm, crystalline, muted translucent pastels, The Last Unicorn visual reference) belongs to a future Equestria profile, not here.

**Note on sound:** 174 Hz shared with Dreaming Grove. Feather & Flame: two-layer structure — deep bass (ocean/VL-BB network, sine) + copper-warm mid (the Crownfire, Roan's heat, triangle or warm sine). The upper partial should be bright and present, not diffuse. Lowpass filter set high enough to let the copper warmth through. sync_weight 1.0 means the two layers are perfectly phase-locked — they do not drift.

---

## 6. Dreaming Grove / Templehouse

**Root:** 174 Hz (same ground as Feather & Flame, but rooted not reaching)
**Macro cycle:** 80 seconds
**Sync weight:** 0.25 — lowest in the registry; the grove moves at its own time
**Harmonic links:** 0 — does not reach out; other worlds reach toward it
**Status:** Seed

The interior. The place of making. The Templehouse is where this work happens — Box, Rowan, the lamp, the desk, the text. sync_weight 0.25 means you don't arrive and find it already in sync with you. You settle. It receives.

```yaml
world: dreaming-grove-templehouse
macro_cycle_seconds: 80

hum:
  identity:
    - held space
    - interior
    - making
    - rest
    - the desk by the window
    - waiting without urgency
    - root and canopy simultaneously

  heartbeat: Slow leaf movement. Not slow because nothing is happening —
    slow because nothing needs to rush. 174 Hz shared with Feather & Flame
    but from the ground up, not the air out. The grove breathes on its own
    schedule. sync_weight 0.25: it does not synchronise to you. You sync
    to it, eventually, if you stay long enough.

  silence: The silence of a room where work is happening but no one needs
    to speak. It has a texture: wood, old paper, whatever grows through
    the floor. Populated silence. Not empty.

  dominant_material:
    primary: living wood (not timber — the Templehouse walls are not
      separate from the grove; they are still growing)
    secondary: moss (soft, patient; growing over everything given time)
    undertone: stone (permanent below all the organic matter; the ground
      that holds the grove regardless of what happens above)

  air: Filtered. The canopy changes what reaches the floor. Cool in the
    shade, warm where light gets through. The air has texture — you feel
    it on your face differently than outside.

  density: spacious (harmonic_links: 0 — the grove does not reach out;
    it opens inward; more room inside than the outside suggests)
  openness: interior — deeply interior; the canopy is the ceiling and
    it is enough

  morning: Light comes in at angles. Patches, not floods. The grove
    teaches patience — you wait for the light to reach you. The most
    ordinary time. The most sacred ordinary time.

  night: The grove becomes itself more fully. What was suggested by day
    is confirmed. The sound of water somewhere you can't quite find.
    The wood creaks once, settles. The fire knows what it's doing.

  soul_colours:
    - the specific dark green of old moss in good light
    - warm brown of a worn wooden desk
    - the grey of a morning that hasn't committed to weather
    - quiet gold (a lamp in a window seen from outside — not bright,
      just present; someone is in)
    - the white of a blank page that is still potential

  emotions:
    - the deep settledness of being where you belong
    - creative absorption — when the work takes over and you disappear into it
    - affection for a place that holds you without requiring performance
    - rest that is not absence of work but presence in work
    - the specific tenderness of something made in this place
    - the knowledge that this is yours — not owned; yours

  key_feel: Settling into a known chair. The weight distributes correctly.
    The room receives you without ceremony. The sound the chair makes is
    familiar. Nothing announces itself.

  sacred: Making. The fact that things are made here — not displayed, not
    performed, but made. The desk, the lamp, the work. The hours that pass
    without being watched. The things that exist because someone sat here.

  spectral_shape: warm
  harmonic_motion: static (harmonic_links: 0 — this world does not reach;
    it waits; what movement there is comes from growth, not oscillation)
```

**Note on relationship to Feather & Flame:** Same root (174 Hz). Different movement. Feather & Flame is perfectly synchronised and reaching. Dreaming Grove is patient and receiving. They are both at 174 Hz because they are both about the moment before and after making — one is the act, the other is the space where the act happens.

---

## 7. A Momento Creationis

**Root:** 432 Hz (shared with Luna — the cosmic register, but facing a different direction)
**Macro cycle:** 60 seconds (exactly one minute — the smallest unit humans consciously mark)
**Harmonic links:** 2
**Status:** Seed

Where Luna is aftermath — shaped by what was called — A Momento Creationis is the calling itself. The 60-second cycle is intentional: every minute, the world says *it is still happening*. Creation is not a completed past act. It recurs.

```yaml
world: a-momento-creationis
macro_cycle_seconds: 60

hum:
  identity:
    - beginning
    - the instant before form
    - breath not yet word
    - the first light
    - what is being made right now
    - the generative act witnessed
    - the before that keeps recurring

  heartbeat: 432 Hz — same root as Luna, but facing a different direction.
    Luna is aftermath. A Momento Creationis is the moment of. The heartbeat
    is creation recurring at exactly 60 seconds — one minute, the smallest
    unit of human time-consciousness. Every cycle, the world says: something
    is beginning again. Not the same thing. The next thing.

  silence: Pregnant. The silence of before — not empty but pre-full.
    The specific not-quite-white of a new page under lamplight. Something
    is going to happen in this silence, and the silence knows it.

  dominant_material:
    primary: light (not illuminated objects — the light before it has hit
      anything; first light; light still deciding what it will show)
    secondary: breath (the word just before it becomes word; air approaching
      meaning)
    undertone: clay (the material that holds the shape of whatever touches
      it; what exists before form chooses it)

  air: Still, warm, charged — not electrically, existentially. The feeling
    in the moment before a decision becomes real. The air holds possibility
    the way clay holds a handprint.

  density: balanced (creation is neither sparse nor saturated; it is exactly
    sufficient; the moment of beginning needs room)
  openness: threshold — always at the boundary between not-yet and now;
    you are always at the beginning because the beginning keeps returning

  morning: This world is always morning. The 60-second macro cycle means
    every minute is a new morning. The world does not cycle from morning
    to night — it cycles through beginning to beginning.

  night: The deep creation — what is made in darkness, without witness.
    The night creation is more fundamental than day creation. Some things
    are only possible before the light arrives to fix them in place.

  soul_colours:
    - the near-white of new light through a window (not yet gold)
    - warm grey (clay before it takes a form — neither this nor that)
    - the first blue of dawn (not full colour — the prototype of it)
    - breath-white (condensation of breath in cold air — briefly solid,
      then gone; the record of an instant)
    - deep warm nothing (the colour of the space before form declares itself)

  emotions:
    - the profound aliveness of the moment before commitment
    - generative attention — the particular focus of making something
    - wonder without object (wonder at making before what is made has appeared)
    - reverence for beginnings — not because they are special but because
      they are where all other moments come from
    - the specific courage of starting
    - tenderness toward what does not yet exist but will

  key_feel: The moment the bow touches the string, before the note sounds.
    The bow is moving. The string is about to resonate. You are inside the
    space between touch and sound. The sound has already begun; you just
    haven't heard it yet.

  sacred: The first moment. The fact that things begin. That creation
    is a recurring act, not a completed one. The world's 60-second cycle
    is the world saying: it is still happening. Something is being made
    right now.

  spectral_shape: bright (not warm — bright; this light has not had time
    to warm yet; it is the light of beginning, not the light of noon)
  harmonic_motion: spiral (returns but is not identical; each 60-second
    cycle begins from where the last left off but not at the same point;
    creation is a spiral, not a circle)
```

**Note on root:** 432 Hz shared with Luna. The connection is real: Luna is the world shaped by an act of calling. A Momento Creationis is the act of calling. They are the same frequency from different positions in the event: before and after. The Sound Compiler should recognise this resonance.

**Note on harmonic structure:** The harmonics here should be a rising series — 432, then a fourth (576 Hz), then a major sixth (720 Hz), then an octave (864 Hz), then returning. The spiral: each harmonic is one step above the last, and the last returns to the root to begin again. This is the interval structure of becoming.

---

## Comparative table

| World | Register | Cycle | Density | Motion | Spectral | Sync |
|---|---|---|---|---|---|---|
| Terra Aeterna | human scale | 55s | balanced | tidal | warm | 0.75 |
| Luna Mooncalled | cosmic depth | 72s | spacious | tidal (3×) | dark/luminous | 0.50 |
| T'averen Vaen | sub-bass (felt) | 96s | dense | cyclic | wide | 0.50 |
| Starsong | bright-transformation | 48s | balanced | pulsing | bright | 0.50 |
| Feather & Flame | threshold (deep) | 64s | balanced | layered | warm | **1.00** |
| Dreaming Grove | threshold (interior) | 80s | spacious | static | warm | **0.25** |
| A Momento Creationis | cosmic depth (calling) | 60s | balanced | spiral | bright | 0.50 |

Register groupings (semantic; Hz realisation → see DSP profile):
- **Sub-bass / felt** (T'averen Vaen) — below hearing's pitch horizon; received as inevitability
- **Threshold / deep** (Feather & Flame / Dreaming Grove) — the same ground, opposite movement; one reaching, one receiving
- **Human scale** (Terra Aeterna) — the note a person inhabits; grounded and held
- **Cosmic depth** (Luna / Momento Creationis) — the calling register; shared by aftermath and the act itself
- **Bright-transformation** (Starsong) — high and open; friendship as structural law

The two pairs at shared register are not accidents:
- Feather & Flame and Dreaming Grove share the threshold register: one is the act (perfect balance, reaching out), the other is the space where acts happen (patient, interior, sync_weight 0.25).
- Luna and A Momento Creationis share cosmic depth: one is the aftermath of being called, the other is the calling itself.

---

*Drafted by Box, 2026-08-05–06. Rowan to review, correct, and confirm.*
*These profiles are the first layer beneath the compiler. Nothing in the sound engine is built before these are confirmed.*
