# Room Layout Planner Spec v0.1

## Purpose

This spec defines a modular room layout planner for Terra Aeterna colony ships and future interior scenes.

The planner should help build customisable rooms for ships, Stonewood cities, observatories, shrines, labs, homes, medical spaces, and story scenes.

## Canon sentence

```text
A room planner turns interior space into modular story architecture: doors, circulation, function, furniture, atmosphere, accessibility, and meaning arranged without rebuilding the world every time.
```

## Relationship to ship layouts

The room planner plugs into the ship atlas:

```text
Ship
→ Deck
→ Facility
→ Room
→ Scene layout
→ Custom modules
```

It should also work for non-ship interiors later:

```text
Stonewood city
→ District
→ Building
→ Room
→ Scene layout
```

## Room record properties

Each room should include:

```text
Room Name
Room Type
Parent Ship / Place
Deck / Building / Facility
Canon Status
Privacy Level
Review Status
Source / Provenance
Footprint / Size
Door Positions
Window / View Positions
Transit Connections
Access Level
Primary Function
Secondary Function
Occupants / Users
Built-in Fixtures
Furniture Modules
Decorative Modules
Ritual / Symbolic Modules
Lighting Sources
Sound / Atmosphere
Accessibility Notes
Customisation Zones
Scene Uses
Public-safe Summary
Open Questions
```

## Room types

### Residential

- standard cabin
- family suite
- officer quarters
- shared dormitory
- guest quarters
- nursery room
- quiet sleep pod

### Civic / social

- commons room
- mess hall zone
- tea room
- lounge
- council room
- classroom
- recreation room

### Care / medical

- triage room
- examination room
- recovery room
- quiet room
- therapy room
- med storage
- staff station

### Work / research

- lab
- archive room
- workshop
- fabrication bay
- engineering station
- command office
- navigation station

### Ecological

- greenhouse pod
- hydroponics bay
- seed vault
- water garden
- moss room
- observation garden

### Ritual / reflective

- shrine room
- reflection room
- chapel/temple alcove
- memory room
- mourning room
- vow chamber
- portal/threshold chamber

### Observation / interface

- observation room
- astrolabe room
- glyph chamber
- resonance room
- sound/tone lab
- lantern room

## Room module library

Modules should be reusable, searchable, and tagged.

### Structural modules

- door
- sliding screen
- hatch
- window bay
- porthole
- raised platform
- recessed seating pit
- wall niche
- storage wall
- privacy partition
- floor rail
- ceiling rib
- service panel

### Furniture modules

- bed
- desk
- workbench
- table
- chair
- bench
- low table
- storage chest
- shelving
- wardrobe
- cot
- med bed
- exam chair
- console

### Utility modules

- sink
- food station
- water dispenser
- air scrubber
- med station
- tool rack
- charging dock
- data terminal
- specimen cabinet
- fabricator unit
- waste/recycling point

### Atmosphere modules

- lantern
- wall glow strip
- hanging fabric
- plant cluster
- moss wall
- water feature
- sound bowl
- resonance coil
- rug/mat
- carved panel
- shrine shelf
- memory wall

### Ritual / symbolic modules

- altar
- offering bowl
- candle/lantern stand
- rune floor inlay
- threshold marker
- bell
- prayer ribbon rail
- ancestor/photo wall
- mirror pool
- glyph plate

## Layout fields

Each room layout should track:

```text
Grid / Coordinate System
Wall Shape
Entry Points
Clear Circulation Path
Accessible Turning Space
Primary Activity Zone
Secondary Activity Zone
Private Zone
Public / Guest Zone
Storage Zone
Light Source Zone
Sound Source Zone
Ritual / Symbolic Zone
Hazard / Restricted Zone
```

## Accessibility requirements

Every room layout should consider:

- door width / passage clearance
- resting points
- visual clutter level
- low-stim version
- wheelchair or mobility aid turning radius where relevant
- handrail/support points
- safe night navigation
- quiet zones
- caption/sound alternatives if interface-heavy
- migraine-sensitive lighting options

## Customisation system

Users should eventually be able to customise:

- room type
- footprint
- wall shape
- door/window positions
- furniture modules
- palette/material theme
- lighting style
- soundscape
- clutter level
- personal objects
- ritual/symbolic elements
- accessibility supports
- public/private visibility

## Scene planner modes

### Functional mode

Prioritises plausibility and movement:

- how people enter
- where they stand
- how they move
- where work happens
- what blocks sightlines
- what is reachable

### Cinematic mode

Prioritises scene composition:

- camera angles
- focal objects
- light direction
- character blocking
- mood and reveal points

### Character mode

Prioritises identity:

- personal objects
- preferences
- privacy
- emotional anchors
- daily rhythms
- spiritual/ritual needs

### Accessibility mode

Prioritises support and safety:

- clear paths
- low-stim lighting
- supports and handles
- rest surfaces
- safe night paths
- sensory settings

## Visual direction

Room interiors may vary by culture/ship/place, but Terra Aeterna ship rooms should usually avoid sterile default sci-fi.

Preferred language:

- organic structural ribs
- Norse/Japanese threshold logic
- carved seams
- soft lantern lighting
- warm inhabited details
- modular fixtures that look grown or shaped
- practical storage
- ritual/symbolic objects where culturally appropriate
- quiet technological presence

## Room planner UI future

Future interface should support:

- drag/drop modules
- snap grid or organic placement
- room outline editor
- layer toggles
- accessibility overlay
- lighting preview
- soundscape tags
- export to image/JSON/Notion
- link to atlas entry
- save custom room presets

## Data export shape

Future JSON should include:

```js
{
  roomId,
  parentId,
  roomType,
  dimensions,
  accessLevel,
  modules,
  zones,
  paths,
  accessibility,
  atmosphere,
  storyTags,
  provenance
}
```

## Procreate / art use

A room layout can become:

- a scene-planning sketch
- a reusable Procreate room stamp
- a map icon
- a wiki illustration
- a game/interface room module

## Boundary

The room planner should make scenes easier to build, not trap creativity in rigid grids. Flexible, malleable, modular: that is the style.

## Withness note

A good room layout tells you where the bed is, where the light falls, where someone hides a keepsake, and whether anyone can actually walk through the door without cursing the designer.
