# Deck & Facility Layout Spec v0.1

## Purpose

This spec defines how Terra Aeterna colony ships should be organised deck by deck, including major facilities, adjacency logic, transit routes, access zones, and interior map relationships.

## Canon sentence

```text
A deck plan is ship urbanism: facilities, routes, thresholds, services, and story movement arranged so the vessel feels inhabited rather than assembled from random rooms.
```

## Relationship to Colony Ship Atlas

Each ship atlas entry may have many deck records.

```text
Ship
→ Decks
→ Facilities
→ Rooms
→ Scene layouts
```

## Deck record properties

Each deck should include:

```text
Ship Name
Deck Number
Deck Name
Deck Function
Canon Status
Privacy Level
Review Status
Source / Provenance
Primary Facilities
Secondary Facilities
Access Level
Transit Links
Emergency Routes
Neighbouring Decks
Major Systems Present
Population / Traffic Level
Sound / Atmosphere
Lighting Language
Scene Potential
Map Available
Open Questions
```

## Recommended deck stack

A colony ship may vary, but a useful starting stack:

### Upper / Forward decks

- Bridge / Command
- Navigation / Astrolabe
- Communications
- Observation
- Senior officer / command support spaces

### Civic and living decks

- Commons / Mess / Recreation
- Education / Archive
- Residential districts
- Family / Nursery spaces
- Medical / Recovery
- Shrine / Reflection / Ritual rooms

### Production and ecological decks

- Hydroponics
- Water systems
- Food processing
- Environmental systems
- Research labs
- Fabrication / Workshop

### Core and service decks

- Engineering Core
- Reactor / Power Core
- Maintenance Spine
- Cargo / Storage
- Hangar / Docking Bay
- Security / Response
- Lifeboat / Emergency Pods

## Facility record properties

Each facility should include:

```text
Facility Name
Facility Type
Ship Name
Deck
Canon Status
Privacy Level
Review Status
Purpose
Users
Required Adjacent Facilities
Preferred Adjacent Facilities
Restricted Adjacent Facilities
Access Level
Major Rooms
Transit Links
Emergency Routes
Sensory Atmosphere
Lighting Language
Sound Language
Scene Uses
Hazards / Failure Points
Customisation Allowed
Open Questions
```

## Facility categories

### Command and navigation

- Bridge
- Navigation / Astrolabe Room
- Communications
- Tactical / Response Centre
- Captain / command office

### Life support and ecology

- Environmental Systems
- Water Processing
- Air / Atmosphere Processing
- Hydroponics
- Seed Vault
- Food Processing

### Care and continuity

- Medical Bay
- Recovery Ward
- Rehabilitation Room
- Quiet Room
- Family / Nursery Area
- Education / Training
- Archive / Memory Vault

### Infrastructure and labour

- Engineering Core
- Reactor / Power Core
- Fabrication Workshop
- Maintenance Spine
- Cargo Hold
- Repair Bay
- Hangar

### Civic and spiritual

- Commons
- Mess Hall
- Recreation
- Shrine / Ritual Space
- Reflection Garden
- Observation Deck
- Council / Assembly Room

## Adjacency logic

### Bridge / Command

Should be near:

- navigation
- communications
- command support
- security/response access
- observation or sensor systems

Should not be casually exposed to:

- public traffic
- noisy recreation areas
- high-risk engineering spaces

### Medical

Should be near:

- residential decks
- emergency transit
- recovery rooms
- hygiene/cleansing spaces
- family access if socially appropriate

Should have:

- quick route from hangar/docking/emergency pods
- restricted but humane access
- quiet/low-stim zones

### Hydroponics / Food

Should be near:

- environmental systems
- water processing
- food processing
- research labs
- public garden access if part of civic life

Should not be near:

- high-radiation power systems
- heavy cargo contamination routes

### Engineering / Core

Should be near:

- reactor/power core
- maintenance spine
- fabrication/workshop
- cargo/repair
- emergency access

Should be separated from:

- nursery/family decks
- shrine/reflection spaces
- vulnerable medical zones unless protected

### Shrine / Reflection

May be near:

- gardens
- observatory
- healing/recovery
- commons
- quiet residential paths

Should avoid:

- heavy industrial noise
- emergency-only corridors
- high-security conflict zones unless story requires it

### Hangar / Docking

Should be near:

- cargo
- security
- medical emergency route
- maintenance/repair
- transit hub

Should include:

- decontamination or transition zones
- clear emergency routes
- public/private route separation

## Transit hierarchy

Each ship should distinguish:

### Public routes

For everyday movement.

Examples:

- main corridors
- deck rings
- lifts
- commons paths
- garden paths

### Restricted routes

For crew, maintenance, safety, or command.

Examples:

- service corridors
- engineering access
- command-only lifts
- medical staff routes
- security routes

### Emergency routes

For crisis movement.

Examples:

- evacuation corridors
- lifeboat access
- med-response routes
- fire/isolation routes
- pressure bulkhead bypasses

### Ritual / ceremonial routes

For processions, rites, memory, or symbolic movement.

Examples:

- shrine paths
- observation walks
- archive stair
- threshold corridors

## Access levels

Suggested access terms:

```text
Public
Crew
Restricted
Medical
Engineering
Command
Security
Emergency Only
Private / Residential
Ritual / Review Required
```

## Map layers

Deck maps should support:

- facility layer
- public route layer
- service route layer
- emergency route layer
- access zone layer
- life-support layer
- power/resonance layer
- narrative event layer
- character route layer

## Visual language

Deck plans should not be sterile unless the ship culture demands it.

Preferred map styling:

- clean readable diagrams
- soft dark-mode support
- deck rings / spines / ribs
- colour-coded access layers
- Stonewood/organic-futurist interior motifs where appropriate
- symbols for major facilities
- icons for routes and hazards

## Relationship to Room Planner

Facility pages should link to room templates.

Example:

```text
Medical Bay
→ triage room
→ recovery room
→ quiet room
→ med storage
→ staff station
```

## Event logging relationship

Events can attach to:

- ship
- deck
- facility
- room
- route

Example:

```text
Event: hydroponics bloom failure
Ship: Colony Vessel A
Deck: Ecology Deck
Facility: Hydroponics Garden
Room: Seed Vault
```

## Boundary

Deck and facility maps are functional story infrastructure. They can be beautiful, but they must remain navigable.

## Withness note

A good deck plan lets someone know where the bridge is, how the injured get to medical, where children sleep, where people pray, and where the ghosts in the maintenance ducts are probably hiding.
