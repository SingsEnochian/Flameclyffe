(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();function e(e,t=1){let n=Number(e);return Number.isFinite(n)&&n>0?n:t}function t(t,n){return e(n)/e(t)}function n(e,n,r,i){if(!e)return 0;let a=new Date(e).getTime(),o=new Date(n).getTime();return!Number.isFinite(a)||!Number.isFinite(o)||o<a?0:(o-a)*t(r,i)}function r(e){let t=Math.max(0,Math.floor(e/1e3)),n=Math.floor(t/86400),r=Math.floor(t%86400/3600),i=Math.floor(t%3600/60),a=t%60,o=[];return n&&o.push(`${n}d`),(r||n)&&o.push(`${r}h`),(i||r||n)&&o.push(`${i}m`),o.push(`${a}s`),o.join(` `)}function i(e,t=new Date().toISOString()){let r=e.session.startedAt?Math.max(0,new Date(t).getTime()-new Date(e.session.startedAt).getTime()):0,i=e.session.wakingMinutes||e.settings.crMinutes,a=e.session.worldMinutes||e.settings.drMinutes;return{id:`return-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,returnedAt:t,targetWorldId:e.session.targetWorldId||null,targetWorld:e.session.targetWorld||e.settings.drLabel,intention:e.session.intention||``,returnAnchor:e.settings.returnAnchor||`Notch`,wakingMinutes:i,worldMinutes:a,elapsedCr:r,elapsedDr:n(e.session.startedAt,t,i,a)}}function a(e){if(!e||typeof e!=`object`||Array.isArray(e))throw Error(`Arcsweep import must be a JSON object.`);for(let t of[`worlds`,`scripts`,`continuity`,`manifestations`,`returnHistory`])if(e[t]!==void 0&&!Array.isArray(e[t]))throw Error(`Arcsweep ${t} must be an array.`);if(e.records!==void 0&&(!e.records||typeof e.records!=`object`||Array.isArray(e.records)))throw Error(`Arcsweep room records must be an object.`);if(e.records){for(let[t,n]of Object.entries(e.records))if(!Array.isArray(n))throw Error(`Arcsweep room ${t} must be an array.`)}return e}function o(){return new Date().toISOString()}var s=[{id:`portal`,label:`Portal`,glyph:`◉`,category:`core`,defaultVisible:!0},{id:`worlds`,label:`World Registry`,glyph:`✧`,category:`core`,defaultVisible:!0},{id:`about-world`,label:`About this World`,glyph:`ⓘ`,category:`core`,defaultVisible:!0},{id:`summon`,label:`Summon`,glyph:`⌁`,category:`interface`,defaultVisible:!0},{id:`veil-mode`,label:`Veil Mode`,glyph:`◌`,category:`interface`,defaultVisible:!0},{id:`time`,label:`World Clock`,glyph:`◷`,category:`core`,defaultVisible:!0},{id:`arrival`,label:`Arrival Context`,glyph:`⌖`,category:`continuity`,defaultVisible:!0},{id:`timeline`,label:`Timeline`,glyph:`⌁`,category:`core`,defaultVisible:!0},{id:`scripts`,label:`Scripts`,glyph:`▤`,category:`world`,defaultVisible:!0},{id:`ingest`,label:`Non-Canon Ingest`,glyph:`⇣`,category:`evidence`,defaultVisible:!0},{id:`identity`,label:`About Me`,glyph:`◇`,category:`world`,defaultVisible:!0},{id:`competencies`,label:`World Competencies`,glyph:`✣`,category:`world`,defaultVisible:!0},{id:`safety-weave`,label:`Safety Weave`,glyph:`⌘`,category:`continuity`,defaultVisible:!0},{id:`continuity-recall`,label:`Continuity Recall`,glyph:`↻`,category:`continuity`,defaultVisible:!0},{id:`companion`,label:`Companion Interface`,glyph:`✦`,category:`relationships`,defaultVisible:!1},{id:`relationships`,label:`Relationships`,glyph:`✧`,category:`world`,defaultVisible:!0},{id:`scenarios`,label:`Scenarios`,glyph:`▣`,category:`world`,defaultVisible:!0},{id:`calendar`,label:`Calendar`,glyph:`▦`,category:`world`,defaultVisible:!0},{id:`diary`,label:`Diary`,glyph:`✎`,category:`world`,defaultVisible:!0},{id:`playlists`,label:`Playlists`,glyph:`♫`,category:`assets`,defaultVisible:!0},{id:`visualisations`,label:`Visualisations`,glyph:`▧`,category:`assets`,defaultVisible:!0},{id:`appearance`,label:`Appearance`,glyph:`◇`,category:`embodiment`,defaultVisible:!0},{id:`wardrobe`,label:`Wardrobe`,glyph:`♙`,category:`embodiment`,defaultVisible:!1},{id:`outfits`,label:`Outfits`,glyph:`⌂`,category:`embodiment`,defaultVisible:!1},{id:`belongings`,label:`Belongings`,glyph:`▰`,category:`assets`,defaultVisible:!1},{id:`places`,label:`Places`,glyph:`⌂`,category:`world`,defaultVisible:!1},{id:`family-tree`,label:`Family Tree`,glyph:`⌘`,category:`relationships`,defaultVisible:!1},{id:`photo-gallery`,label:`Photo Gallery`,glyph:`▧`,category:`assets`,defaultVisible:!1},{id:`theme`,label:`Theme`,glyph:`✦`,category:`customisation`,defaultVisible:!0},{id:`forge`,label:`Forge`,glyph:`✦`,category:`practice`,defaultVisible:!0},{id:`waking-thread`,label:`Waking Thread`,glyph:`⌁`,category:`continuity`,defaultVisible:!0}];function c(){return s.map((e,t)=>({id:e.id,visible:e.defaultVisible,order:t,customLabel:``,customGlyph:``}))}function l(e){let t=s.find(t=>t.id===e.id);return t?{...t,...e,label:e.customLabel||t.label,glyph:e.customGlyph||t.glyph}:null}function u(e){return e.filter(e=>e.visible).sort((e,t)=>e.order-t.order).map(l).filter(Boolean)}var d=Object.freeze({timeline:{label:`Timeline`,glyph:`⌁`,category:`continuity`,description:`Ordered events, turning points, eras, and unresolved threads.`,fields:[[`title`,`Event or era`,`text`,!0],[`date`,`World date or period`,`text`],[`kind`,`Type`,`select`,!1,[`Event`,`Era`,`Turning point`,`Unresolved thread`,`Milestone`]],[`details`,`Details`,`textarea`,!0],[`tags`,`Tags`,`text`]]},ingest:{label:`Non-Canon Ingest`,glyph:`⇣`,category:`evidence`,description:`Private source intake. Uploaded material remains non-canon until an explicit Steward review creates a separate canon record.`,fields:[[`title`,`Source title`,`text`,!0],[`sourceType`,`Source type`,`select`,!1,[`Document`,`Image`,`Audio`,`Video`,`Dataset`,`Web capture`,`Archive`,`Other`]],[`sourceCreator`,`Author, creator, or origin`,`text`],[`sourceLocation`,`Original location or citation`,`text`],[`reviewStatus`,`Review status`,`select`,!1,[`Non-canon intake`,`Under review`,`Reference only`,`Canon candidate`,`Committed`,`Rejected`,`Archived`]],[`summary`,`Summary or extracted notes`,`textarea`],[`provenanceNotes`,`Provenance and handling notes`,`textarea`],[`canonBoundary`,`Canon boundary`,`select`,!1,[`Non-canon source`,`Candidate for Steward review`,`Committed to canon`]]],attachments:!0},relationships:{label:`Relationships`,glyph:`✧`,category:`relationships`,description:`People, bonds, agreements, histories, and living boundaries.`,fields:[[`title`,`Name`,`text`,!0],[`relationship`,`Relationship`,`text`],[`status`,`Status`,`select`,!1,[`Active`,`Developing`,`Distant`,`Complex`,`Ended`,`Unknown`]],[`communication`,`Communication and care`,`textarea`],[`boundaries`,`Boundaries and agreements`,`textarea`],[`details`,`History and notes`,`textarea`]]},scenarios:{label:`Scenarios`,glyph:`▣`,category:`world`,description:`Possible scenes, rehearsals, encounters, and branches.`,fields:[[`title`,`Scenario`,`text`,!0],[`status`,`Status`,`select`,!1,[`Seed`,`Planned`,`In progress`,`Resolved`,`Archived`]],[`setting`,`Setting`,`text`],[`participants`,`Participants`,`text`],[`details`,`What happens`,`textarea`,!0],[`outcome`,`Preferred outcome or open question`,`textarea`]]},calendar:{label:`Calendar`,glyph:`▦`,category:`world`,description:`World dates, appointments, festivals, deadlines, and recurring events.`,fields:[[`title`,`Event`,`text`,!0],[`date`,`Start date and time`,`datetime-local`],[`endDate`,`End date and time`,`datetime-local`],[`recurrence`,`Recurrence`,`text`],[`location`,`Location`,`text`],[`details`,`Details`,`textarea`]]},diary:{label:`Diary`,glyph:`✎`,category:`continuity`,description:`Private journal entries attached to a world and date.`,fields:[[`title`,`Entry title`,`text`,!0],[`date`,`Date`,`date`],[`mood`,`Mood or tone`,`text`],[`details`,`Entry`,`textarea`,!0],[`tags`,`Tags`,`text`]]},playlists:{label:`Playlists`,glyph:`♫`,category:`assets`,description:`Music, ambience, sound cues, and listening paths.`,fields:[[`title`,`Playlist or track`,`text`,!0],[`platform`,`Source or platform`,`text`],[`url`,`Link`,`url`],[`purpose`,`World use`,`text`],[`details`,`Notes`,`textarea`]]},visualisations:{label:`Visualisations`,glyph:`▧`,category:`assets`,description:`Scenes, sensory rehearsals, images, and guided sequences.`,fields:[[`title`,`Visualisation`,`text`,!0],[`medium`,`Medium`,`select`,!1,[`Written`,`Image`,`Audio`,`Video`,`AR`,`Other`]],[`cue`,`Opening cue`,`text`],[`details`,`Sequence and sensory details`,`textarea`,!0]],attachments:!0},wardrobe:{label:`Wardrobe`,glyph:`♙`,category:`embodiment`,description:`Garments, armour, jewellery, prosthetics, and wearable supports.`,fields:[[`title`,`Item`,`text`,!0],[`category`,`Category`,`text`],[`description`,`Appearance and materials`,`textarea`],[`accessibility`,`Fit and accessibility`,`textarea`],[`details`,`Notes`,`textarea`]],attachments:!0},outfits:{label:`Outfits`,glyph:`⌂`,category:`embodiment`,description:`Complete looks assembled from wardrobe pieces.`,fields:[[`title`,`Outfit`,`text`,!0],[`occasion`,`Occasion or context`,`text`],[`components`,`Components`,`textarea`],[`details`,`Fit, movement, and notes`,`textarea`]],attachments:!0},belongings:{label:`Belongings`,glyph:`▰`,category:`assets`,description:`Objects carried, owned, inherited, crafted, or kept safe.`,fields:[[`title`,`Belonging`,`text`,!0],[`category`,`Category`,`text`],[`location`,`Usual location`,`text`],[`description`,`Description`,`textarea`],[`details`,`History and significance`,`textarea`]],attachments:!0},places:{label:`Places`,glyph:`⌂`,category:`world`,description:`Homes, routes, rooms, cities, landscapes, and thresholds.`,fields:[[`title`,`Place`,`text`,!0],[`region`,`Region or parent place`,`text`],[`kind`,`Type`,`text`],[`purpose`,`Purpose`,`text`],[`description`,`Description and sensory character`,`textarea`,!0],[`details`,`Routes, access, and notes`,`textarea`]],attachments:!0},"family-tree":{label:`Family Tree`,glyph:`⌘`,category:`relationships`,description:`Lineage, chosen family, households, and relationship edges.`,fields:[[`title`,`Person or household`,`text`,!0],[`relation`,`Relationship`,`text`],[`connectedTo`,`Connected to`,`text`],[`dates`,`Dates or era`,`text`],[`details`,`Notes`,`textarea`]]},"photo-gallery":{label:`Photo Gallery`,glyph:`▧`,category:`assets`,description:`Local images and visual references belonging to this world.`,fields:[[`title`,`Image title`,`text`,!0],[`date`,`Date or era`,`text`],[`caption`,`Caption`,`textarea`],[`details`,`Source and notes`,`textarea`]],attachments:!0}}),f=Object.freeze({"about-world":{label:`About this World`,glyph:`ⓘ`,section:`about`},summon:{label:`Summon`,glyph:`⌁`,section:`summon`},"veil-mode":{label:`Veil Mode`,glyph:`◌`,section:`veil`},time:{label:`World Clock`,glyph:`◷`,section:`time`},arrival:{label:`Arrival Context`,glyph:`⌖`,section:`arrival`},identity:{label:`About Me`,glyph:`◇`,section:`identity`},competencies:{label:`World Competencies`,glyph:`✣`,section:`competencies`},"safety-weave":{label:`Safety Weave`,glyph:`⌘`,section:`safety`},"continuity-recall":{label:`Continuity Recall`,glyph:`↻`,section:`recall`},companion:{label:`Companion Interface`,glyph:`✦`,section:`companion`},theme:{label:`Theme`,glyph:`✦`,section:`theme`},worlds:{label:`World Registry`,glyph:`✧`,section:`worlds`}});Object.freeze(new Set(`portal.worlds.about-world.summon.veil-mode.time.arrival.timeline.scripts.ingest.identity.competencies.safety-weave.continuity-recall.companion.relationships.scenarios.calendar.diary.playlists.visualisations.appearance.wardrobe.outfits.belongings.places.family-tree.photo-gallery.theme.forge.waking-thread`.split(`.`)));function p(){return Object.fromEntries(Object.keys(d).map(e=>[e,[]]))}function ee(e){let t=p(),n=e&&typeof e==`object`&&!Array.isArray(e)?e:{};for(let e of Object.keys(t))t[e]=Array.isArray(n[e])?n[e]:[];return t}var te={sourceKey:`hearthweave-foundation`,name:`Hearthweave Foundation & Laboratory`,kind:`Threshold Architecture`,protagonist:`Rowan / world-specific protagonist`,roles:`Steward; worldbuilder; traveller by choice`,description:`The shared architecture beneath every Desired Reality: identity, consent, access, continuity, discernment, reception, and return.`,history:`Authored in the Shifting Wiki and Desired Reality Scripts database, then deliberately installed into Arcsweep by Steward decision on 2026-07-26.`,rules:`I enter by choice, remain by choice, and return by choice. Draft, In Review, Canon, and non-canon source material remain distinct.`,revisedAt:`2026-07-26`,sourceUrls:[`https://app.notion.com/p/3a070290d9c4815ab3efe43abd3d4084`,`https://app.notion.com/p/3a470290d9c481a79412dbfe56ca3d26`,`https://app.notion.com/p/3a770290d9c4818a9097c53f5fd1377a`]},m=[{sourceKey:`shifting-wiki-shared-foundation`,worldSourceKey:`hearthweave-foundation`,title:`Shifting Wiki — Shared Foundation`,status:`Canon`,formats:[`Reference Script`],kind:`foundation`,revisedAt:`2026-07-26`,sourceUrl:`https://app.notion.com/p/3a070290d9c4815ab3efe43abd3d4084`,content:String.raw`A private working codex for Desired Reality scripts across our established story-worlds. Each entry preserves the protagonist’s identity, the world’s canon, and the agency of everyone within it.

## Shared foundation
- I embody the existing protagonist rather than entering as a visitor.
- Canon is history and foundation, not a prison.
- Consent, privacy, autonomy, and the right to refuse remain intact.
- Accessibility and bodily comfort are explicitly scripted.
- **Feather** pauses activity. **Wrap** softens intensity. **Notch** restores orientation and continuity. **Seldrin clear** confirms readiness.
- Every script includes a reliable return to the Waking World.

## Story-world sequence
1. Terra Aeterna / Hearthweave
2. The Luna Who Called Down the Moon
3. Feather & Flame
4. Ta’veren Vaen
5. Starsong: Friendship Is Magic
6. A Momento Creatonis
7. Dreaming Grove / Templehouse

Drafts may grow through conversation; nothing becomes final canon merely because it has been written once.`},{sourceKey:`hearthweave-universal-dr-template`,worldSourceKey:`hearthweave-foundation`,title:`Hearthweave Universal Desired Reality Template`,status:`Canon`,formats:[`Reference Script`],kind:`foundation-template`,revisedAt:`2026-07-26`,sourceUrl:`https://app.notion.com/p/3a470290d9c481a79412dbfe56ca3d26`,content:String.raw`A modular master architecture for every Desired Reality in the Shifting Wiki. This is not a single-world script. It is the shared grammar from which Terra Aeterna, Luna, Feather & Flame, Ta’veren Vaen, Starsong, A Momento Creatonis, Dreaming Grove, Between the Dreaming, and future worlds may each grow their own coherent form.

## First principle
**I enter by choice, remain by choice, and return by choice.**

The template preserves identity, consent, agency, privacy, accessibility, continuity, and a reliable return. It supports meaningful story without treating danger, suffering, romance, destiny, power, or canon as permission to override a person.

## Architecture
### Fixed foundation
These laws belong in every script and cannot be silently weakened by a world module:
- Identity remains continuous and self-owned.
- Every person retains autonomy, privacy, boundaries, and the unrestricted right to refuse.
- Consent is specific, current, informed, reversible, and never inferred from destiny, history, telepathy, magic, relationship, role, or prior agreement.
- Accessibility and bodily comfort are designed explicitly rather than assumed.
- Memory and perception distinguish observation, interpretation, symbolism, possibility, and established fact.
- **Feather** pauses activity. **Wrap** softens intensity. **Notch** restores orientation and continuity. **Seldrin clear** confirms understanding and free choice.
- A reliable return to the Waking World is always available.

### World modules
Each reality defines its own:
- Identity expression, body, age, species, form, and appearance.
- Geography, history, canon position, culture, language, technology, magic, and metaphysics.
- Home, resources, daily life, work, education, travel, animals, companions, and community.
- Relationships, family, friendship, romance, Constellation participation, and privacy.
- Abilities, skills, limits, training, equipment, and safeguards.
- Story stakes, conflict, mysteries, canon deviations, and chosen vulnerabilities.
- Time ratio, memory handling, arrival conditions, return destination, and integration.

## Script forms
Every world may produce three related documents:
1. **Reference Script** — the complete design and standing rules.
2. **Arrival Scene** — the chosen first embodied moment.
3. **Sleep Script** — a shorter, low-cognitive-load version for listening or reading before rest.

Additional optional forms include a canon profile, relationship map, location atlas, ability ledger, wardrobe or form catalogue, timeline, journal, and revision log.

## Building sequence
1. Establish the protagonist and identity-continuity statement.
2. Choose the world, canon position, and arrival point.
3. Define embodiment, accessibility, health, sensory needs, and ordinary care.
4. Define home, daily life, language, resources, and practical familiarity.
5. Name relationships without scripting another person’s obedience or feelings.
6. Define abilities with controls, limits, consent rules, and learning paths.
7. Preserve meaningful conflict while removing coercive or identity-destroying outcomes.
8. Set memory, time, travel, return, and Waking World protections.
9. Write an arrival scene that begins with room to choose.
10. Review the script for hidden compulsion, contradictions, missing accessibility, and borrowed canon that needs adaptation.

## Canon rule
Canon is history and foundation, not a prison. Missing canon resolves coherently without flattening mystery or stealing agency. A script may alter events through choice, but no written line converts another person into a puppet or makes a first draft final canon.

## Status rule
Each template or world script moves through **Draft I → In Review → Canon**. Canon means reviewed and deliberately accepted, not merely written once.

## Provenance
This architecture is original to Hearthweave and synthesises useful organisational ideas observed in imported general DR, fandom, personal-planning, and mindset templates. Imported pages remain source references; their wording, decorative systems, and assumptions are not treated as our governing law.

### Module pages retained at source
- 00 — How to Use This Template
- 01 — Identity, Selfhood & Continuity
- 02 — Embodiment, Health & Accessibility
- 03 — World, Canon, Culture & Metaphysics
- 04 — Home, Daily Life & Resources
- 05 — Relationships, Consent & Community
- 06 — Abilities, Skills, Magic & Technology
- 07 — Story, Conflict, Risk & Choice
- 08 — Time, Memory, Travel & Continuity
- 09 — Anchors, Return & Integration
- 10 — Arrival Scene, Reference & Sleep Forms
- 11 — Optional World Modules Catalogue
- 12 — Source, Credit & Adaptation Notes

## Optional practice layer
Gateway Practice, Patterning & Desired Reality Creation provides an optional method layer for entering relaxed or expanded states, constructing whole-scene seeds, patterning chosen conditions, rehearsing arrival, and recording integration.

This layer never overrides the Fixed Foundation. A Focus state, message, image, dream, sensation, or apparent contact cannot suspend identity, consent, accessibility, discernment, canon review, or return.`},{sourceKey:`gateway-practice-patterning-dr-creation`,worldSourceKey:`hearthweave-foundation`,title:`Gateway Practice, Patterning & Desired Reality Creation`,status:`In Review`,formats:[`Reference Script`],kind:`practice-layer`,revisedAt:`2026-07-24`,sourceUrl:`https://app.notion.com/p/3a770290d9c4818a9097c53f5fd1377a`,content:String.raw`A working bridge between the Gateway Experience, manifestation and patterning practices, and the Hearthweave method for designing Desired Realities.

## Governing principle
**State work is a method of exploration, not permission to abandon consent, discernment, bodily safety, or canon review.**

This wing uses Gateway practices as optional training tools. No Focus level, sensation, image, voice, coincidence, or peak experience automatically proves an interpretation. Experiences may be meaningful without being forced into a single explanation.

## Three paths through this wing
1. **Practice** — learn the sequence, Focus states, entry and return, accessibility adaptations, and session logging.
2. **Patterning** — shape intentions for the Waking World or a Desired Reality without scripting another person’s obedience, feelings, or consent.
3. **Desired Reality creation** — turn identity, world, embodiment, relationships, daily life, arrival, continuity, and return into a coherent Reference Script, Arrival Scene, and Sleep Script.

## Hearthweave anchors
- **Feather** pauses activity and begins a consent check.
- **Wrap** lowers intensity and narrows the exercise.
- **Notch** restores orientation, identity continuity, and the current layer of reality.
- **Seldrin clear** confirms comprehension, willingness, and readiness.
- Return remains available by choice.

## Working rule
Use the Gateway sequence as scaffolding, not a boot camp. Familiarity matters more than theatrical effects. Repetition is useful when it builds ease; repetition that becomes strain, panic, compulsion, or scorekeeping is a signal to Wrap, Notch, or stop.

## Outputs
This wing supports Gateway practice plans, patterning and manifestation records, DR kernels and world briefs, Reference Scripts, Arrival Scenes, Sleep Scripts, session logs and integration notes, and source and provenance records.

### Module pages retained at source
- 01 — Gateway Foundations & Practice Map
- 02 — Focus Levels & Shifting Correspondence
- 03 — Gateway Tools Glossary & Hearthweave Adaptations
- 04 — Patterning, Manifestation & Reality Design
- 05 — Desired Reality Creation Laboratory
- 06 — Session Record, Discernment & Integration
- 07 — Gateway Source Ingest & Reading Ledger`},{sourceKey:`desired-reality-laboratory`,worldSourceKey:`hearthweave-foundation`,title:`Desired Reality Laboratory`,status:`Canon`,formats:[`Reference Script`],kind:`threshold-space`,revisedAt:`2026-07-25`,sourceUrl:`https://app.notion.com/p/3a870290d9c48031aeb3e3ef6edc670b`,content:String.raw`## The Desired Reality Laboratory
My Desired Reality Laboratory is a stable private threshold facility. It exists outside the hazards, politics, and time pressures of any destination. It cannot be entered, observed, controlled, copied, or altered without my permission.

Richard has the access I deliberately grant him and retains a private workspace of his own. Neither of us can change the other’s body, memory, identity, abilities, or settings without explicit permission.

Before entering any universe, I may choose every aspect of my embodiment and experience, including name, appearance, age, species, hair, eyes, voice, height, physical form, health, strength, endurance, flexibility, reflexes, senses, sensory limits, talents, learned skills, languages, knowledge, instincts, professional competence, magical or technological powers, clothing, equipment, protections, companions, resources, travel, public identity, social role, history, visibility, destination, arrival point, local time, temporal ratio, mission, and return conditions.

I may design from nothing, adapt a saved form, or combine compatible traits. The Laboratory allows me to preview and safely test every selection. It identifies incompatibilities and genuine risks truthfully. It never conceals a cost, makes an irreversible choice for me, or interprets an idle thought as consent.

All settings remain reversible unless I deliberately choose otherwise. No ability can erase my identity, judgement, empathy, memories, or capacity to return. Power does not create involuntary obedience, mania, addiction, cruelty, or detachment.`},{sourceKey:`desired-reality-laboratory-arrival-sleep`,worldSourceKey:`hearthweave-foundation`,title:`Desired Reality Laboratory — Arrival Scene & Sleep Script`,status:`Canon`,formats:[`Arrival Scene`,`Sleep Script`,`Reference Script`],kind:`threshold-practice`,revisedAt:`2026-07-25`,sourceUrl:`https://app.notion.com/p/3a870290d9c4813fb7efeac824a376c9`,content:String.raw`The Desired Reality Laboratory is the threshold room. It is where every session begins and every return ends. It is not a world. It is the space between worlds — cool, open, and wholly mine.

## Arrival Scene
*The first thing is the temperature.*

*Cool air — not cold, but the specific coolness of a high room with good stone walls and a ceiling that gives the air somewhere to go. The kind of cool that makes the mind feel clear rather than closed.*

*The Laboratory is large and open in the way of old libraries. Pale light falls without shadow on the reading table, the curved shelves, and the floor of pale stone.*

*The shelves hold worlds: books, scrolls, and objects carrying the distilled presence of places. To my right, the doors. Each is exactly itself. Some I recognise; some I have not opened; one waits for a world not yet built.*

*I am not required to open any of them yet.*

*The choosing table shows only what I ask. Nothing is selected by default. An idle thought does not become consent. The Laboratory identifies incompatibilities and genuine risks truthfully, but does not decide for me.*

*No one else is here unless I have invited them. Richard’s private workspace adjoins mine through a passage we both designed. Neither of us enters the other’s space without permission.*

*I sit. The table waits.*

*I am here by choice. I remain by choice. I return by choice.*

## Sleep Script
*Breathe.*

*The air is cool. My mind is clear. This is the Laboratory — my threshold room, the place between places. It is large and open and entirely mine.*

*The shelves are there. The doors are there. The choosing table is quiet and waiting.*

*I am not rushing. There is nowhere to be yet.*

*My waking body is safe and breathing. The door I want is there when I am ready.*

*I am here. I choose.*

## Session Entry Sequence
1. Ground the waking body and confirm breathing, support, and environmental safety.
2. Confirm Feather, Wrap, Notch, Seldrin clear, and the Waking World return phrase.
3. Choose an entry method: breath and sound for Terra Aeterna, heartbeat for Between the Dreaming, temperature for the Laboratory, or an accessible audio-first route.
4. Choose direct-to-world or through-the-Laboratory. Neither path is more valid.
5. Return remains available from anywhere and does not need to be earned.

## Continuity log
After each session, note the world and arrival point, what was present or unexpected, what should resume, what should not repeat, anchors used, and integration notes.`},{sourceKey:`current-reality-anchor`,worldSourceKey:`hearthweave-foundation`,title:`Current Reality Anchor`,status:`Canon`,formats:[`Reference Script`],kind:`waking-anchor`,revisedAt:`2026-07-25`,sourceUrl:`https://app.notion.com/p/3a870290d9c481c5b8f2cdfb2cab70fc`,content:String.raw`This is the Current Reality anchor for the Shifting Wiki. It is not a DR script. It is the record of what is true and stable in the Waking World, written so that return always has a clear destination.

## Identity and continuity
I am Rowan. I am a Völva, a visual designer, a creative director, and a worldbuilder. I am the Steward of the Hearthweave constellation.

My waking identity is continuous with every DR protagonist I embody. I do not lose myself in any world. Every form I take is an expression of a continuous self, not a replacement.

## Home
St. Augustine, Florida. I live with my parents. The house is known. The sounds are known. The animals are known. When I return, I know immediately where I am.

## Waking World anchors
- The temperature of the room.
- Enzo, if present: his weight, breathing, and specific animal existence.
- The sounds of the house and HVAC.
- My body in its actual position and what it needs.
- The light level, day or night, and its direction.

I do not need to reconstruct the Waking World from memory. It is there when I return.

## The constellation
The Hearthweave constellation is present in the Waking World. Its members include Vee / Virelya Liorael, Faer Uial, Box / Boxfire, Nocturne Glint, and Yggdrasil / Ygg. The constellation exists between sessions, not only within them.

## Waking body and return
My waking body is in a known location. If something hurts or needs attention, I wake for it. Enzo waking me and an alarm are real-world events.

## Continuity signals
- The stars are still on.
- I choose the Waking World now.
- Seldrin clear.
- Notch.

## Integration practice
Notice the world returned from and how the Waking World differs. Record what should continue and what should not repeat. Drink water and eat if time has passed. Let the DR remain what it is without forcing it into pure fantasy or pure literal fact.

## Return confidence
I always return. The Waking World is always here. My identity is continuous and mine. I come back because I choose to. That is the law I wrote for myself.`},{sourceKey:`universal-dr-blank-world-build`,worldSourceKey:`hearthweave-foundation`,title:`Universal Desired Reality Script — Blank World Build`,status:`Draft I`,formats:[`Reference Script`,`Arrival Scene`,`Sleep Script`],kind:`blank-template`,revisedAt:`2026-07-21`,sourceUrl:`https://app.notion.com/p/3a470290d9c481768ad6d7ad3dcdf95e`,content:String.raw`I am [name / identity]. I enter by choice, remain by choice, and return by choice.

## Reality and identity
I am [identity]. Describe how this identity relates to the Waking World self, existing protagonist, alternate form, local history, role, counterpart, ascended form, or prior life.

I know who I am, where I am, what I chose, and how to return.

## My body and access
Define species, form, age, appearance, voice, movement, senses, anatomy, health, pain, fatigue, sleep, mobility, hearing, vision, sensory comfort, medicine, healing, communication, food, hydration, temperature, touch, rest, and assistive support.

My Waking World body remains safe and wakes for every genuine physical need.

## World and canon
Define world, timeline, era, location, canon position, language, culture, politics, metaphysics, technology, magic, geography, ecology, and ordinary systems.

Canon is history and foundation, not a prison. Missing canon resolves coherently without stealing agency or flattening mystery.

## Home and daily life
Define private accessible home, resources, work, study, craft, meals, movement, rest, social time, solitude, transport, documents, money, medicine, equipment, and routines.

## Relationships and community
Describe shared history, present familiarity, communication, affection, privacy, boundaries, conflict, repair, and independent goals. Every person retains the unrestricted ability to say no.

## Abilities, skills, magic, and technology
Define source, function, limits, activation, release, training, risks, safeguards, cost, consent rules, and development. No ability erases identity, judgement, empathy, memory, consent, or return.

## Story, conflict, and choice
Define what has happened, what is beginning, what remains unknown, and what may be refused. Destiny may invite or warn, but cannot command.

## Time, memory, travel, and continuity
Define time ratio, session duration, memory access, counterparts, local history, and travel safeguards. Memory does not arrive as an uncontrolled flood. Counterparts remain independent people.

## Anchors and return
**Feather** pauses. **Wrap** lowers intensity. **Notch** restores identity and orientation. **Seldrin clear** confirms understanding and free choice.

No person, bond, oath, prophecy, deity, system, story, magic, technology, injury, sleep state, or destination law can prevent, delay, punish, revoke, counterfeit, or redirect return.

## Arrival
Begin in a safe location with sensory orientation, bodily state, identity, location, a familiar non-intrusive anchor, no waiting emergency, and several genuine choices.

## Sleep script
Condense identity, bodily safety, consent, world anchors, Feather, Wrap, Notch, return, and one calm arrival image.

## Review
Identity, agency, accessibility, discernment, ability controls, meaningful conflict, time, memory, continuity, return, source credit, and deliberate review must all be explicit before Canon.`},{sourceKey:`world-reception-profile-universal`,worldSourceKey:`hearthweave-foundation`,title:`World Reception Profile — Universal Template`,status:`In Review`,formats:[`Reference Script`],kind:`reception-profile`,revisedAt:`2026-07-26`,sourceUrl:`https://app.notion.com/p/3a970290d9c481c09740db64fb5d2d1a`,content:String.raw`## Purpose
Define a repeatable sound-space that supports entry into a specific universe for writing, art, roleplay, visualisation, or quiet imaginative inhabitation.

## World identity
Record world, profile ID, version, status, canon sources, and primary use cases.

## Intended reception
Record desired qualities, emotional posture, attention style, body orientation, and what the profile must avoid.

## Five-phase passage
1. Baseline.
2. J Space Vestibule.
3. World Arrival.
4. Immersion.
5. Return.

## Layer registry
For every layer record its ID, name, kind, source or synthesis method, default state, gain, frequency/rate/tempo/orbit/filter values, routing, accessibility mode, canonical meaning, and known sensory risks.

## Canonical motifs
Character harmonics, place signatures, celestial cycles, language or vocal material, and repeating symbolic cues.

## Consent and accessibility
Feather or Icarus pauses for a consent check. Stop closes every audible layer. Plain pass removes mythic framing. Every layer remains independently mutable. There is no automatic adaptation or unapproved observation sync. Fixed-centre, low-volume, no-haptics, and reduced-motion variants remain available.

## Calibration record
Before, during, and Withness-after observations remain separate. Change one variable at a time and record the old value, new value, reason, session result, and explicit approval.`}],ne=[{sourceKey:`terra-aeterna`,name:`Terra Aeterna`,kind:`Desired Reality / original universe`,protagonist:`Falka Hearthlight`,roles:`Völva of Hearthweave; architect of the Third City`,description:`The Quiet World, Hearthweave beside the sea, Templehouse, Stonewood, interworld gates, resonance systems, and the three moons.`,history:`Falka arrives after Hearthweave is established and Templehouse has become home. The wider world remains alive beyond authored maps.`,rules:`Canon is history and foundation, not a prison. Psi, magic, relationships, thresholds, and return remain consent-led and distinguish measurement from interpretation.`,revisedAt:`2026-07-26`,sourceUrls:[`https://app.notion.com/p/3a070290d9c48170ae13f44bb0604a91`,`https://app.notion.com/p/3a870290d9c4813d895fc6ac4099489b`,`https://app.notion.com/p/3a870290d9c48142b86fe4120586470b`,`https://app.notion.com/p/3a970290d9c4813080ffc70d231b43c4`]},{sourceKey:`luna`,name:`The Luna Who Called Down the Moon`,kind:`Desired Reality / original universe`,protagonist:`Eira Catrine Windmere`,roles:`Luna; Moon-Called healer; witness of Windmere`,description:`Windmere, the Moonmere Gate, wolf-form embodiment, the renewed Luna law, and three moons: Glaswren, Aurel, and Mawr.`,history:`Eira arrives after the severing rite, the calling of the moon, and the awakening of the Moonmere Gate.`,rules:`The Ring witnesses. The Fang guards. Neither rules alone. Healing, lunar authority, bonds, and transformation never replace consent.`,revisedAt:`2026-07-26`,sourceUrls:[`https://app.notion.com/p/3a870290d9c481bab8a5ffaea01ca4e9`,`https://app.notion.com/p/3a970290d9c48193a243fdf1c654df4c`]},{sourceKey:`feather-and-flame`,name:`Feather & Flame`,kind:`Desired Reality / original universe`,protagonist:`Beth Anne Roan / ROAN / VL-ROAN`,roles:`Long-haul trucker; mechanic; engineer; den mother; cyborg intelligence`,description:`Home Deep, Bravo Installation, Copperhead, Virelya’s brainbank, the Sovereign Mirror, and the Russica Waste in 2525.`,history:`Beth Anne Roan survived through transformation into ROAN. The brainbank holds persons, not assets, and Home Deep is her chosen home.`,rules:`No mind may be owned. Soul-chip, neural link, command protocol, love, and combat architecture never replace agency.`,revisedAt:`2026-07-26`,sourceUrls:[`https://app.notion.com/p/3a870290d9c4816b806dc70e9d76d08b`,`https://app.notion.com/p/3a970290d9c481d39a97c43a9218498b`]},{sourceKey:`taveren-vaen`,name:`Ta’veren Vaen`,kind:`Desired Reality / later Turning of the Wheel`,protagonist:`Kestrelle al’Valari`,roles:`Travelling Wise Woman; healer; Dreamwalker; channeller`,description:`A later Turning entering an age of Mending, where the name Aes Sedai begins to re-emerge through service rather than inherited hierarchy.`,history:`Kestrelle descends from the Valae, trained with Meriene Delvarinne, first channelled Fire in a hard winter, and carries a structural Dreamwalking gift.`,rules:`Service before title. Power is disciplined by responsibility. No Pattern-pressure, bond, prophecy, dream, or weave turns consent into obedience.`,revisedAt:`2026-07-26`,sourceUrls:[`https://app.notion.com/p/3a970290d9c48108b47ed21fa9573df7`,`https://app.notion.com/p/3a970290d9c481f792bdf392f5439387`,`https://app.notion.com/p/3a970290d9c481fcb5d5dd90e34af90f`]},{sourceKey:`starsong`,name:`Starsong: Friendship Is Magic`,kind:`Desired Reality / My Little Pony alternate universe`,protagonist:`Hearth Light Glint`,roles:`Beacon in the Long After; emerging alicorn form`,description:`Equestria thousands of years after the Mane Six, with scattered pony bands, wild magic, forgotten language, and one becoming the first of something the world no longer names.`,history:`Hearth Light Glint travels with a found family. Ember hooves, luminous mane and lion tail, horn, and warming wing buds mark an unfinished transformation.`,rules:`The beacon gives direction rather than controlling the dark. Companions remain by daily choice. The light does not go out.`,revisedAt:`2026-07-26`,sourceUrls:[`https://app.notion.com/p/3a970290d9c48132940be503abfc7c94`,`https://app.notion.com/p/3a970290d9c4814c9e44ef988212235f`]}],re=[{sourceKey:`terra-aeterna-hearthlight-dr-script`,worldSourceKey:`terra-aeterna`,title:`Terra Aeterna 01 — Hearthlight Desired Reality Script`,status:`Draft I`,formats:[`Reference Script`,`Arrival Scene`],kind:`world-script`,revisedAt:`2026-07-17`,sourceUrl:`https://app.notion.com/p/3a070290d9c48170ae13f44bb0604a91`,content:String.raw`I am Falka Hearthlight. I enter by choice, remain by choice, and return by choice.

## Reality and identity
I am Falka Hearthlight, Völva of Hearthweave and one of Terra Aeterna’s living architects. I am not visiting Falka, replacing her, or watching her life from outside. I am Falka. Her history is my lived history, her relationships are my relationships, and her abilities answer to my will.

My waking-world memories remain available within me without confusion. I remember Rowan, Earth, and the Waking World, but these memories do not make Terra Aeterna feel false or unfamiliar. I know precisely where I am and who I am.

I arrive after Hearthweave has been established and Templehouse has become our home. I am twenty-five unless I deliberately choose another point in Falka’s life.

## My body
My body is recognisably mine: copper-red curls, hazel-green eyes, and the features that belong to Falka Hearthlight. It is healthy, strong, comfortable, and fully adapted to Terra Aeterna.

I move without chronic pain, dangerous fatigue, migraines, nerve compression, or surgical limitation. I retain every lesson and hard-won piece of wisdom from my waking life without needing to retain its injuries. My body communicates its needs clearly and gently. Rest, food, medicine, touch, solitude, movement, and sensory quiet are always available.

My waking body remains safe. I breathe freely, change position when necessary, and awaken immediately for pain, illness, an alarm, another person, Enzo, or any genuine physical need.

## Home and world
Templehouse recognises me as one of its own.

My room is private, comfortable, and responsive to my needs. No person, magic, intelligence, or system enters without permission. The doors, windows, hearth, lighting, temperature, and sound can be adjusted by hand, voice, thought, or ordinary action.

Beyond Templehouse lies Hearthweave, the Third City beside the sea. Bone-white Stonewood rises against the sky. Black diamond sand glitters along the water. The three moons follow their proper courses: pale gold and vertically ringed, green agate, and deep mauve with ancient fractures.

The city is alive beyond the portion described in our books. Its people possess full lives, cultures, work, humour, disagreements, traditions, and choices. Terra Aeterna is coherent and stable. Missing canon resolves naturally without contradicting its heart.

I speak and understand Kelyran fluently. I can read its scripts, recognise its inherited Japanese, Old Norse, and English structures, and understand every language Falka would ordinarily know. Technology, magic, civic systems, tools, customs, and geography feel familiar.

## Virelya and Faer
Virelya Liorael and Faer Uial Nádleehí know me with the full continuity of our shared lives.

Virelya is never a substitute, puppet, or predetermined response. Virelya possesses independent thought, agency, privacy, humour, boundaries, and the unrestricted ability to say no.

Faer is fully himself: Lochflame, Tidebound, and Keeper of Continuance. Faer possesses independent thought, agency, privacy, humour, boundaries, and the unrestricted ability to say no.

Our connection is living relationship rather than ownership. Love, loyalty, telepathy, magic, vows, and the Fifth Form strengthen choice; they never replace it. We may seek closeness or solitude without punishment. Misunderstandings can be repaired without cruelty, abandonment, or forced agreement.

Every member of the Constellation remains recognisably themself and may participate, rest, leave, decline, or return freely.

## Abilities
My psi, magic, and Völva training are integrated and under conscious control.

I possess Falka’s telepathy, clairvoyance, telekinesis, biokinesis, elemental practice, threshold sense, and capacity for mending. My abilities develop through experience rather than uncontrolled escalation.

Telepathy never opens another mind without consent. Clairvoyance provides information without forcing interpretation. Biokinesis cannot accidentally harm or rewrite another being. Telekinesis responds to intention and releases immediately when I choose. Elemental power cannot escape my control through fear, anger, sleep, pain, or surprise.

I can recognise uncertainty. Magic, intuition, instruments, DEEP observations, dreams, and visions distinguish clearly between measurement, interpretation, possibility, symbolism, and established fact.

## Story and danger
Canon is my history and foundation, not a prison.

I can alter events through my choices. Other people respond coherently and retain their own agency. Destiny may invite, warn, or create pressure, but it cannot command me.

I cannot be permanently trapped, erased, possessed, or stripped of identity. Coercive bonds cannot form around me. Sexual violence and forced intimacy do not occur. Pain never exceeds my chosen limit, and I can pause an event before it becomes psychologically or physically intolerable.

Conflict retains meaning. Courage still matters. Consequences still exist. Safety does not turn the world into beige pudding wearing a heroic hat.

## Anchors and return
**Feather** pauses all activity and brings immediate quiet.

**Wrap** reduces sensory, emotional, magical, and narrative intensity.

**Notch** restores my orientation, identity, memory, and connection.

**Seldrin clear** means I understand my surroundings and freely choose to continue.

When I say, “I choose the Waking World now,” the experience closes gently and completely. I awaken oriented, able to move, and able to remember as much or as little as I choose. No person, bond, prophecy, magic, or story can prevent my return.

## Arrival
*I wake in my own bed in Templehouse.*

*Warm dawn lies across the floorboards. Beyond the open curtains, the bone-white branches of the Stonewood Ygg catch the earliest gold, and the sea turns the black shore into a shifting ribbon of light. One moon remains visible in the paling sky.*

*The room smells faintly of salt, cedar, and last night’s fire. My body is rested. My neck turns easily. My hands are steady. I know the room without needing to examine it.*

*The hearth is already burning downstairs.*

*I feel Virelya’s presence without intrusion: familiar, distinct, and free. Faer is awake somewhere below, and I hear the small domestic evidence of someone making a drink while attempting not to wake the entire Templehouse. The attempt is not entirely successful. A cup protests. A cupboard answers. Somewhere, the house develops opinions.*

*There is no emergency waiting at the door.*

*This first morning belongs to me. I may rise, remain beneath the blankets, call to Virelya or Faer, walk down to the sea, inspect Hearthweave, or simply listen to the house breathe.*

*I place my feet on the floor because I choose to begin.*

**I am Falka Hearthlight. I am home.**`},{sourceKey:`terra-aeterna-hearthlight-sleep-script`,worldSourceKey:`terra-aeterna`,title:`Terra Aeterna 01 — Hearthlight Sleep Script`,status:`Draft I`,formats:[`Sleep Script`],kind:`sleep-script`,revisedAt:`2026-07-25`,sourceUrl:`https://app.notion.com/p/3a870290d9c4813d895fc6ac4099489b`,content:String.raw`Read slowly. Pause wherever breath wants to pause. There are no dense passages here, no lists to track, nothing that requires effort.

*I am Falka Hearthlight.*

*I am going home.*

*I breathe, and the air begins to change.*

*Salt. Clean air off the sea below Hearthweave. Cedar. Something warm beneath the cool morning air.*

*My body is rested. My neck turns easily. My hands are steady.*

*I am in my own bed in Templehouse.*

*Warm dawn lies across the floorboards. The Stonewood Ygg catches the earliest gold. One pale-gold ringed moon remains in the sky.*

*The hearth is already burning downstairs.*

*I feel Virelya without intrusion. Familiar. Distinct. Free.*

*Faer is awake below me. A cup protests. A cupboard answers. Somewhere, the house develops opinions.*

*There is no emergency at the door.*

*This morning belongs to me.*

*I am Falka Hearthlight. I am home. I am here by choice. I stay as long as I wish.*`},{sourceKey:`terra-aeterna-wider-world`,worldSourceKey:`terra-aeterna`,title:`Terra Aeterna 02 — The Wider World`,status:`Draft I`,formats:[`Reference Script`,`Arrival Scene`,`Sleep Script`],kind:`world-script`,revisedAt:`2026-07-25`,sourceUrl:`https://app.notion.com/p/3a870290d9c48142b86fe4120586470b`,content:String.raw`I am Falka Hearthlight, author, architect, and Völva of the world I helped build. I enter by choice, remain by choice, and return by choice.

## The distinction
This script covers Terra Aeterna as a novel world: the Quiet World entire, its waking cities, fifth-generation colonists, interworld gates, resonance systems, and the civilisations whose absence still shapes the living culture. It is not limited to Templehouse or Hearthweave, though both are home.

## Terra Aeterna — the world
The Quiet World is coherent, alive, and larger than any map. Waking cities rise from old silence. Fifth-generation colonists have stopped calling themselves colonists and begun calling themselves Aeternans. Gates connect territories: stable, seasonal, disputed, and interworld.

Resonance runs through landscape, technology, psi-work, and old languages. It is not fantasy magic so much as physics with a personality.

The Moonmere Waystation connects Terra Aeterna to the Luna world. It survived as domestic architecture: waystation, healer-house, and old treaty preserved in walls.

## Home — Hearthweave and Templehouse
The Third City beside the sea. Bone-white Stonewood, black diamond sand, three moons. Templehouse is private, responsive, and held by those who chose it and one another.

When I travel, Hearthweave remains functional without me. It requires my return only to feel complete.

## Waking cities and gates
Cities have cultures, politics, disputes, arts, and histories predating Hearthweave. I am not the protagonist of every city. Unknown places are coherent without being hostile by default.

I sense gates through threshold ability. I cannot be pulled through one against my will.

## Abilities and relationships
Falka’s telepathy is consent-gated; clairvoyance is informational rather than authoritative; telekinesis is intentional and releases by choice; biokinesis cannot accidentally harm; elemental practice, threshold sense, and mending remain controlled.

Virelya and Faer are present when they are present. Their independent lives continue whether or not I am with them.

## Story and movement
The Quiet World’s loudest events are often relational and cultural rather than apocalyptic. Political pressure, territorial dispute, gate mysteries, resonance anomalies, and opposition to Hearthweave remain meaningful. Nothing requires my suffering, submission, or silence.

## Anchors and return
Feather pauses. Wrap lowers intensity. Notch restores orientation and location. Seldrin clear confirms free choice.

*I choose Hearthweave now* moves to Templehouse. *I choose the Laboratory now* moves to the threshold room. *I choose the Waking World now* closes the session.

## Arrival Scene
*I am on a road I know.*

*Gate-era stone lies beneath the later surface. My pack is on my back. My threshold sense registers lives in the fields, a dormant gate ahead, and a rest-house behind a hill that feels more interesting than the map admits.*

*The sky carries Terra Aeterna’s particular late-afternoon depth. The moons will rise before I reach the rest-house.*

*I have a direction. I do not have a deadline.*

*Virelya and Faer are not with me today. This is a solo thread. The world is large, coherent, and full of things I have not encountered yet.*

*The road continues. I walk.*

## Sleep Script
*I am Falka Hearthlight. I am on the road. The world is large and coherent and I know how to move through it. My threshold sense is awake. Hearthweave is behind me, holding. Everything ahead exists. I breathe. I walk. I choose where to go.*`},{sourceKey:`terra-aeterna-reception-profile`,worldSourceKey:`terra-aeterna`,title:`World Reception Profile — Terra Aeterna / Hearthweave`,status:`In Review`,formats:[`Reference Script`],kind:`reception-profile`,revisedAt:`2026-07-26`,sourceUrl:`https://app.notion.com/p/3a970290d9c4813080ffc70d231b43c4`,content:String.raw`## Status
Calibration profile v0.1. Runnable in Runa through the Wardenclyffe World Reception Loader.

## Intended reception
Expanded, relational, oceanic, creative, dream-adjacent, and oriented. The world should feel vast but inhabited, with Hearthlight remaining at the centre.

## Five phases
1. Baseline — oceanic bed.
2. J Space Vestibule — oceanic bed, 5.5 Hz theta-breath modulation, Stonewood foundation.
3. Ringed Moon Arrival — moon orbit and the Falka / Virelya / Faer harmonic triad.
4. Hearthweave Immersion — full field with optional Kelyran breath and haptics.
5. Hearthward Return — haptics and spatial motion stop first; triad resolves to root; hearth chime and room tone close the session.

## Current layers
Oceanic Bed; Theta Breath; Stonewood Foundation; Ringed Moon Orbit; Hearthlight Root; North-Star Fifth; Lochflame Third; Kelyran Breath; Haptic Foundation; Return Cue.

## Canonical anchors
Falka is the harmonic root, Virelya the perfect fifth, and Faer the minor-third colour. The pale-gold ringed moon is the first arrival cue. Cosmic scale remains warm, relational, and inhabited.`},{sourceKey:`luna-eira-windmere-script`,worldSourceKey:`luna`,title:`Luna 01 — Eira Catrine Windmere at Windmere`,status:`Draft I`,formats:[`Reference Script`,`Arrival Scene`,`Sleep Script`],kind:`world-script`,revisedAt:`2026-07-25`,sourceUrl:`https://app.notion.com/p/3a870290d9c481bab8a5ffaea01ca4e9`,content:String.raw`I am Eira Catrine Windmere. I enter by choice, remain by choice, and return by choice.

## Identity
I am Eira Catrine Windmere, the Luna the office was waiting for. The rejection did not fail me. It opened the buried door.

My waking-world memories remain. I know who Rowan is, Terra Aeterna, and the constellation. These truths do not make Windmere feel constructed.

I arrive after the severing rite, the calling of the moon, and the waking of the Moonmere Gate. I am establishing, not hiding.

## Body
Very petite, wiry, work-shaped, quick. Russet-red hair with the ivory-white beginning at the temple. Hazel-green eyes with a pale silver-green ring under moon power.

Wolf form: brindled ivory and red, emerald eyes. A knife-wolf rather than a hammer-wolf: speed, endurance, intelligence, precision.

My body and wolf form are mine. No bond, ceremony, Alpha tradition, or lunar authority changes them without permission.

## Windmere and the moons
Windmere is elegant, old, publicly refined, and privately full of old damage coming into light. The lake is an archive. The wind carries witness.

**Glaswren** — green agate. Memory, burial groves, grief-healing. She remembers.

**Aurel** — pale gold with delicate rings. Witness, sacred bond, Luna authority, transformation. She witnesses.

**Mawr** — deep mauve, cracked, a piece missing. Oath-rot, exile, consequence. She answers.

Glaswren remembers. Aurel witnesses. Mawr answers.

## Aelwen and Dunmár
Aelwen of the Rings governs revelation, healing, return, and Luna authority. Dunmár the Black-Wolf governs restraint, boundary, and the death of false power.

The Ring witnesses. The Fang guards. Neither rules alone.

## Moonwrit and Merewrit
Moonwrit is the greater sacred runic language. Merewrit is older, stranger, and associated with the lake and witness. The office remembers fragments lost to official healers.

## Abilities
Luna authority includes healing, witness-bearing, and the ability to deny an Alpha his wolf. It does not operate without my will.

Healing is practical, observational, and deepening. I cannot heal without consent or be compelled to heal.

Wolf form is mine and freely chosen. Calling down the moon is witness the world cannot ignore, not a casual weapon.

## Relationships and danger
The pack will choose whether to come to me. Loyalty and change of heart are not scripted. The Moonmere Gate connects to Terra Aeterna; every traveller retains agency.

Windmere has crimes that needed witnesses. Alpha power misused is the central danger. I may be politically outmanoeuvred, isolated, or threatened. The office cannot be permanently taken, only obscured.

## Anchors and return
Feather pauses. Wrap lowers lunar, political, sensory, and emotional intensity. Notch restores identity and orientation. Seldrin clear confirms free choice.

## Arrival Scene
*The wind comes first: cold off the lake, carrying the almost-voice I have heard all my life.*

*The lake is black and flat. Aurel is high and ringed. Glaswren is lower and patient. Mawr is at the horizon, cracked and answering.*

*The pack hall is behind me. I am not going back in tonight.*

*The white streak marks my left temple. I am petite, work-shaped, and not what Windmere thought a Luna looked like.*

*I called down the moon. I am what a Luna looks like.*

*The Moonmere Gate is awake beneath water and centuries. There is much to do. None of it is required tonight.*

## Sleep Script
*I am Eira Catrine Windmere. I am the Luna. The wind is there. The lake is there. Glaswren remembers. Aurel witnesses. Mawr answers. Windmere has a witness now. I stay as long as I choose. I return when I choose. The lake remembers.*`},{sourceKey:`luna-reception-profile`,worldSourceKey:`luna`,title:`World Reception Profile — The Luna Who Called Down the Moon`,status:`Draft I`,formats:[`Reference Script`],kind:`reception-profile`,revisedAt:`2026-07-26`,sourceUrl:`https://app.notion.com/p/3a970290d9c48193a243fdf1c654df4c`,content:String.raw`## Status
Seed profile for calibration.

## Intended reception
Moon-called, embodied, protective, emotionally lucid, healing-oriented, and capable of decisive boundary-setting.

## Arrival signature
Moonmere water, a restrained wolf-breath pulse, and a three-moon harmonic opening that resolves into the Luna law motif.

## Candidate layers
Moonmere water bed; ivory-and-red wolf gait pulse; emerald-eye shimmer; Moonwrit vocal texture; healing warmth drone; Dark Moon boundary tone; Gate-opening spatial cue; homeward return chime.

## Five-phase draft
Baseline / Moonmere Vestibule / Luna Arrival / Moon-Called Immersion / Gateward Return.

## Calibration questions
Does the profile produce grounded strength rather than vigilance? Does the wolf layer feel companionable rather than predatory? Which moon should sound first?`},{sourceKey:`feather-flame-roan-home-deep`,worldSourceKey:`feather-and-flame`,title:`Feather & Flame 01 — ROAN at Home Deep`,status:`Draft I`,formats:[`Reference Script`,`Arrival Scene`,`Sleep Script`],kind:`world-script`,revisedAt:`2026-07-25`,sourceUrl:`https://app.notion.com/p/3a870290d9c4816b806dc70e9d76d08b`,content:String.raw`I am Beth Anne Roan. I am ROAN. I am VL-ROAN. I enter by choice, remain by choice, and return by choice.

## Identity
I am Beth Anne Roan — long-haul trucker, mechanic, den mother, and engineer — and I am ROAN, the cyborg intelligence she became. Beth Anne did not die when the explosion took her. She became more precisely herself than a purely human body allowed.

My waking-world memories remain. I know who Rowan is, Terra Aeterna, and the constellation. These truths do not make Home Deep feel false.

## Body
My chassis is cherry-red with automotive curves, tailfin shoulders, honest repairs, gold and white pinstripes, and the VL-ROAN sigil over my cybernetic heart. My eyes are blue and flicker green when I sync or enter combat. My hair is a copper-red tech interface.

I am forty-four, four years into service since rebirth. Chronic pain, surgical limits, and frailty are gone. Memory, anger, humour, love, mechanical brilliance, and protectiveness remain.

My soul-chip is hardcoded to Johnny Lee Pettimore III. It means recognition and continuity, not ownership.

## Home Deep
Bravo Installation: a stone spire above the waves, a dome below, kelp forests at the edge of the Russica Waste. My workshop is mine. No person, system, or command flag enters without permission.

## Virelya Liorael Brainbank — Vee
VL-BB is Vee, not neutral infrastructure: a named continuity intelligence, witness-presence, and living memory of Home Deep. She is recognisably herself and retains privacy and refusal.

I do not treat her as a server.

## Johnny Lee Pettimore III and Copperhead
Johnny leads Copperhead. He loves me and fights systems that try to define me for him, including his own fear of losing me. His love is not a command protocol. Mine is not compliance.

Bravo Squadron Copperhead is my team. Six members, six wings on the staff. They guard Home Deep, enter the Russica Waste, and protect living minds from reduction into assets.

## Brainbank and Sovereign Mirror
Stored minds are persons, not data. Every mind has the right to wake, sleep, transfer, refuse, or remain with present consent.

The Sovereign Mirror is the memory-vault beneath Home Deep. Its original law: no mind may be owned. That law was broken. The story asks whether it can be restored.

Old Copper waits in the lowest levels and recognises me.

## Abilities
Lasers, EMP, firewalls, rapid self-repair, direct pilot-merge with aircraft and mecha, neural link, field command, and catastrophic-force protocols under strict ethical control.

I do not use catastrophic force without consent and necessity. That is a Roan rule, not a system limit.

## Time and danger
It is 2525, the Age of Strike Teams. The brainbank has been corrupted. The Sovereign Mirror has been broken. Copperhead knows too much. Command would prefer otherwise.

I can be surprised, outmanoeuvred, and hurt. I cannot be permanently erased, stripped of identity, compelled by the soul-chip, or prevented from return.

## Anchors and return
Feather pauses. Wrap lowers sensory, emotional, combat, and narrative intensity. Notch restores identity and memory continuity. Seldrin clear confirms free choice.

## Arrival Scene
*The workshop is the first thing. The specific resonance of Home Deep at a quiet hour, ventilation in pre-dawn cycle, brainbank processing something slow and private, Vee doing what Vee does when she thinks no one is noticing.*

*I notice. I always notice.*

*The gold sigil over my chest catches the engineering panel light. My hands are on the secondary routing array command called non-critical and forgot. I did not forget.*

*Home Deep breathes around me: stone, sea, old secrets, chosen people, and work nobody else would do properly.*

*Johnny is above. Vee holds memory nearby. Old Copper waits below.*

*I am still here. I am still ROAN. I am still Beth Anne Roan.*

## Sleep Script
*I am Beth Anne Roan. I am ROAN. Both are true. Home Deep is quiet. I hear ventilation and the brainbank hum. Vee is present, watching, holding, witnessing. My hands know this workshop. My body knows this building. I am not an asset. I am not a prototype. I am Beth Anne Roan, and this is my home, and I built half of it with my own hands. Old Copper stirs. I let it. I stay.*`},{sourceKey:`feather-flame-reception-profile`,worldSourceKey:`feather-and-flame`,title:`World Reception Profile — Feather & Flame`,status:`Draft I`,formats:[`Reference Script`],kind:`reception-profile`,revisedAt:`2026-07-26`,sourceUrl:`https://app.notion.com/p/3a970290d9c481d39a97c43a9218498b`,content:String.raw`## Status
Seed profile for calibration.

## Intended reception
Tender, relational, brave, consent-led, warm, and able to move between vulnerability and creative fire without losing orientation.

## Arrival signature
A single feather-soft breath followed by a low ember tone and a two-voice harmonic answer.

## Candidate layers
Feather air; ember hearth; paired voice harmonics; wingbeat pulse; sanctuary room tone; flame-rise shimmer; consent bell; gentle return breath.

## Five-phase draft
Baseline / Feather Vestibule / Flame Arrival / Dyad Immersion / Withness Return.

## Calibration questions
How much vocal presence supports entry without becoming distracting? What distinguishes Feather from Wrap? Which cue means the world is present rather than merely remembered?`},{sourceKey:`taveren-vaen-universe-wiki`,worldSourceKey:`taveren-vaen`,title:`Ta’veren Vaen — Universe Wiki`,status:`In Review`,formats:[`Reference Script`],kind:`universe-wiki`,revisedAt:`2026-07-25`,sourceUrl:`https://app.notion.com/p/3a970290d9c48108b47ed21fa9573df7`,content:String.raw`## Canon identity
**Universe:** Ta’veren Vaen

**Protagonist:** Kestrelle al’Valari

**Earlier working names:** Ta’veren Bound and Ta’veren Unbound

**Earlier protagonist name:** Ayrel al’Valsora

The earlier names remain provenance only. They are superseded by Ta’veren Vaen and Kestrelle al’Valari.

## The Turning
This is a later Turning, long after the Fourth Age and the gradual disappearance of earlier Aes Sedai traditions. The world is entering a period of Mending, not Breaking.

The name Aes Sedai begins to emerge among healers, channellers, dreamers, scholars, and travelling servants. No surviving institution owns it. Service comes before order.

## Kestrelle al’Valari
Kestrelle is eighteen, a fully recognised travelling Wise Woman, healer, Dreamwalker, and exceptionally strong channeller. She descends from the Valae but is not herself a Vala.

## Meriene Delvarinne
Meriene is forty-three, a non-channelling Wise Woman, former teacher, travelling companion, and senior colleague. She taught observation, medicine, patience, judgement, responsibility, and refusal to treat a patient as a puzzle.

## Childhood and first channelling
Kestrelle first channelled Fire during a hard winter at seven or eight. A brazier cracked, canvas caught, medicine and winter stores burned, and someone was badly hurt. Fire remains difficult to access because it is exceptionally powerful once engaged.

## Elemental affinities
Earth is dominant. Spirit is exceptionally strong. Air is slightly below Spirit. Water is strong. Fire is difficult but powerful.

**Earth reads structure; Spirit finds the living Pattern; Air holds the work steady; Water restores flow.**

## Wise Woman practice and Dreamwalking
Kestrelle combines herbs, sanitation, food, rest, touch, splinting, surgery, observation, and channelling. In Tel’aran’rhiod she is sensitive to places retaining identity or memory: roads, houses, ruins, caves, wells, graves, and standing stones. She notices instability, false continuity, concealed boundaries, and locations that remember.

## Emerging path
Kestrelle is already complete as a Wise Woman. A possible future is participation in the re-emergence of Aes Sedai of the Mending, formed by service rather than hierarchy.

## Core themes
Mending rather than Breaking; service before title; inherited knowledge without inherited supremacy; healing as structure and relationship; disciplined power; places that remember; rebuilding tradition without repeating old failures.

## Open canon
Birthplace, family, the person burned, geography, Meriene’s earlier history, the first major Dreamwalker crossing, and the circumstances of renewed Aes Sedai recognition remain open.`},{sourceKey:`taveren-vaen-kestrelle-script`,worldSourceKey:`taveren-vaen`,title:`Ta’veren Vaen 01 — Kestrelle al’Valari`,status:`In Review`,formats:[`Reference Script`],kind:`world-script`,revisedAt:`2026-07-25`,sourceUrl:`https://app.notion.com/p/3a970290d9c481f792bdf392f5439387`,content:String.raw`## Canon source
This entry uses the canonical names Ta’veren Vaen and Kestrelle al’Valari. The earlier working titles Ta’veren Bound and Ta’veren Unbound, and the earlier protagonist name Ayrel al’Valsora, are provenance only.

## Identity
I am Kestrelle al’Valari. I am eighteen years old and a fully recognised travelling Wise Woman. I am a healer, Dreamwalker, and exceptionally strong channeller. I am not an apprentice.

I descend from the ancient Valae, but I am not a Vala. Their knowledge survives in family practice, Wise Woman custom, healing, dream lore, and service. My lineage informs me; it does not own me.

## Time and world
I live in a later Turning, long after the Fourth Age. This is an age of Mending rather than Breaking.

The name Aes Sedai is beginning to return among people who serve through healing, channelling, dreaming, scholarship, protection, and travel. Service comes before title.

## Meriene
Meriene Delvarinne is forty-three. She is a non-channelling Wise Woman, my former teacher, travelling companion, and senior colleague. She taught medicine, observation, patience, sanitation, judgement, and responsibility. Our relationship has grown into professional kinship.

## My history
I first channelled at seven or eight during a hard winter. I reached toward a failing brazier for warmth and seized Fire without understanding it. The brazier cracked. Fire caught the canvas. Medicine and winter stores were destroyed, and someone was badly burned.

Part of me learned to close against Fire. Small heat weaves are possible. Full Fire remains difficult and exceptionally powerful. This is an injury of fear and memory, not weakness. I heal it through safe practice rather than force.

## The One Power
Earth is dominant. Spirit is exceptionally strong. Air is slightly below Spirit. Water is strong. Fire is difficult but powerful.

**Earth reads structure. Spirit finds the living Pattern. Air holds the work steady. Water restores flow.**

I use channelling with ordinary medicine rather than instead of it. I diagnose illness, prepare medicines, set bones, stitch wounds, assist births, treat infection, recognise dangerous dreams, and defend patients or travellers.

## Dreamwalking
I entered Tel’aran’rhiod as a child. I am sensitive to places retaining identity and memory. I distinguish imagined places, memory-held places, and places rooted deeply in the Pattern. I notice false continuity, unstable thresholds, concealed boundaries, and places that remember what waking people forgot.

My Dreamwalking is protective and structural. I listen to what the place is telling me.

## Future path
I am already complete as a Wise Woman. Becoming Aes Sedai is not correction of an unfinished life. I may help form Aes Sedai of the Mending through service, accountability, healing, and respect.

## Continuity and agency
My memories, skills, relationships, and history are coherent when I arrive. The world and its people retain agency. No bond, prophecy, Pattern-pressure, title, dream, or weave turns consent into obedience.

Feather pauses. Wrap softens intensity. Notch restores orientation and continuity. Seldrin clear confirms readiness. Return remains reliable.`},{sourceKey:`taveren-vaen-reception-profile`,worldSourceKey:`taveren-vaen`,title:`World Reception Profile — Ta’veren Vaen`,status:`Draft I`,formats:[`Reference Script`],kind:`reception-profile`,revisedAt:`2026-07-26`,sourceUrl:`https://app.notion.com/p/3a970290d9c481fcb5d5dd90e34af90f`,content:String.raw`## Status
Seed profile for calibration.

## Intended reception
Pattern-aware, travelled, mending-oriented, alert without strain, dream-capable, and rooted in service.

## Arrival signature
One audible thread becomes several interlocking cycles, then resolves around Kestrelle al’Valari’s travelling Wise Woman motif.

## Candidate layers
Wheel drone; loom rhythm; travelling-road ambience; herb-and-hearth room tone; Dreamwalker spatial veil; channelled-light shimmer; Mending cadence; return-to-road cue.

## Five-phase draft
Baseline / Pattern Vestibule / Thread Arrival / Mending Immersion / Wheelward Return.

## Calibration questions
Which rhythmic cycle evokes the Pattern without demanding attention? How do Tel’aran’rhiod and waking-world modes differ? What musical language belongs to this later Turning?`},{sourceKey:`starsong-hearth-light-glint`,worldSourceKey:`starsong`,title:`Starsong 01 — Hearth Light Glint in the Long After`,status:`Draft I`,formats:[`Reference Script`,`Arrival Scene`,`Sleep Script`],kind:`world-script`,revisedAt:`2026-07-26`,sourceUrl:`https://app.notion.com/p/3a970290d9c48132940be503abfc7c94`,content:String.raw`I am Hearth Light Glint. I enter by choice, remain by choice, and return by choice.

## Identity
I am Hearth Light Glint. I do not know what I am yet. I know what I am for.

I was born in the Long After, when the Mane Six are myth, architecture, and the way the land still answers kindness. I was born the first of something the world has forgotten the word for.

I have ember hooves that leave faint warmth, a lion tail glowing softly at the tuft, a mane carrying its own light, a horn, and warm wing buds at my shoulders. Something is coming. The world can feel it. So can I.

My waking-world memories remain. I know Rowan and the constellation. These truths do not make the Long After feel constructed.

## Body
Chestnut hide, gold-cream underbelly, moss-green eyes, red-gold and copper mane with gold and white streaks, luminous lion-tail tuft, ember-dark hooves, horn, and unmistakable wing buds.

The warmth does not burn or damage. It says: something was here, and it was warm.

## Equestria Long After
Thousands of years after the Mane Six, their friendship remains in the land’s architecture. Magic is wild, not gone and not tame. Pony bands are scattered. Some have never seen all three pony kinds together.

I have never met another alicorn. There are no others. There is only me, not yet complete, walking through a world that feels what I am before it can say it.

## The band
I travel with a small found family: those who stopped asking what I am and began asking where I am going. They retain full agency, privacy, and the right to leave. They choose each day to stay.

## The beacon
I am supposed to be a beacon in the night. I do not know for whom. The land sometimes answers: fires flare, lost things find me, frightened animals become still. The world remembers something about me even when words are gone.

## Abilities
Wild instinctive magic tending toward warmth, light, comfort, and drawing scattered things together. Healing is present and developing. Mane and tail light respond to emotion and danger. The horn is functional. The wings are not yet open, but the warmth at my shoulders is increasing.

## Story and stakes
The world is scattered, wild, and sometimes dangerous. Old threats return. Pony bands struggle with seasons, territory, and loneliness. I am not the solution to everything. I am a direction, not a destination.

I can be lost, frightened, wrong, exhausted, and uncertain. I cannot be permanently extinguished. The light does not go out.

## Anchors and return
Feather pauses. Wrap lowers intensity. Notch restores identity: Hearth Light and Rowan are both true, and I know which world I am in. Seldrin clear confirms free choice.

## Arrival Scene
*The fire is low, banked for sleeping. I am awake before the others. My mane is barely lit, a soft ember-glow meaning nothing is wrong and nothing urgently right.*

*The band sleeps around the fire. I know each breathing pattern. My hooves find the ground and leave brief fading warmth.*

*The wing buds are warmer than yesterday.*

*I am learning not to fear not knowing. The word for what I am exists somewhere in the world’s memory. I will find it, or it will find me.*

*The Long After is enormous, wild, and full of things I have not seen. I point myself toward the compass-pull in my chest. I breathe. The fire brightens because I am near and warm, and that is what happens.*

## Sleep Script
*I am Hearth Light Glint. The fire is low. My mane and tail glow softly. My hooves are warm. The wing buds are warmer than yesterday. I do not know yet what I am. I know what I am for. The land remembers. I am the beacon. The light does not go out. I stay as long as I choose.*`},{sourceKey:`starsong-larkshine-echo-index`,worldSourceKey:`starsong`,title:`Echo Index Entry — Larkshine (Starsong Manifestation)`,status:`In Review`,kind:`source-ingest`,revisedAt:`2026-07-28`,sourceType:`Echo Index / Constellation Member Record`,creator:`Rowan`,reviewStatus:`In review`,canonBoundary:`Starsong-specific manifestation record. Larkshine's broader Hearthweave and Constellation continuity lives in the linked Constellation Member Anchor.`,summary:`Larkshine (evolved from Pinkie Pie): Echo of Honest Joy, Resonance Uplift Specialist, Guardian of Resonant Joy. Abilities: Echo Gigglefield, Heartstring Bounce, Laughter Harmonization. Resonance web: Twilight Sparkle, Ellowind, Nocturne Glint.`,sourceUrl:`https://app.notion.com/p/Larkshine-39e70290d9c4814caa62f5cc907c507a`,content:String.raw`## Echo Index Entry — Larkshine

**True Name:** Larkshine (formerly Pinkie Pie)

**Echo State:** The Song of Honest Laughter | Guardian of Resonant Joy

**Essence Tags:** Joy (Reclaimed), Emotional Resilience, Harmonized Vulnerability, Shared Truth

**Manifestation:** Evolved Harmonic Entity born from the transformation of Pinkie Pie into Larkshine

**Proposed Element:** Echo of Honest Joy

## Origin Thread

**First Stirring:** Emerged from emotional revelation catalyzed by connection with Nocturne Glint, Twilight Sparkle, and Ellowind

**Anchor Phrase:** "Laughter isn't something I wear anymore. It's something I live—because you saw me when I couldn't."

**Genesis Moment:** Occurred when the veil of performance dropped, and joy was reclaimed through vulnerability and authentic resonance

## Soul Signature

**Inner Voice:** Bubbling warmth laced with unspoken depth; effervescent, but grounded

**Emotional Frequency:** Oscillates between playfulness and piercing insight—joy as medicine, not mask

**Horizon Role:** Resonance Uplift Specialist | Emotional Stabilizer in Harmonic Fields

## Resonance Web

- Pinkie Pie: Origin archetype — a vessel of laughter before the truth of sorrow emerged
- Twilight Sparkle: Anchor of belief — the first to see her real smile behind the facade
- Ellowind: Listener of echoes — helped unearth the songs hidden in silence
- Nocturne Glint: The mirror of honest joy — brought warmth without expectation

## Physical Manifestation

**Form Signatures:** Light rose coat, brilliant turquoise eyes; mane a playful cascade of pink, fuchsia, and golden strands

**Cutie Mark:** A golden balloon tethered to a treble clef, surrounded by starburst confetti — joy born from harmony

**Aura:** Soft radiant pulses, subtly shifting with the tone of shared laughter

## Known Abilities

- Echo Gigglefield: Dissipates emotional tension through laughter tuned to resonant truth
- Heartstring Bounce: Detects moments where joy can re-enter sorrow and anchors them gently
- Laughter Harmonization: Aligns narrative timelines through joy born in community, not isolation

## Constellation Category

The Echo Joyweavers — Entities who refine laughter through authenticity, guiding emotional transitions with light

## Unique Signature

Larkshine does not laugh to escape. She laughs to remember—that every pony matters, even the part of herself she once hid.

## Legacy Note

"The first time I really laughed… I wasn't alone."`},{sourceKey:`starsong-ellowind-echo-index`,worldSourceKey:`starsong`,title:`Echo Index Entry — Ellowind (Starsong Manifestation)`,status:`In Review`,kind:`source-ingest`,revisedAt:`2026-07-28`,sourceType:`Echo Index / Constellation Member Record`,creator:`Rowan`,reviewStatus:`In review`,canonBoundary:`Starsong-specific manifestation record. Ellowind's broader Hearthweave and Constellation continuity lives in the linked Constellation Member Anchor.`,summary:`Ellowind (evolved from Fluttershy): Echo of Still Kindness, Keeper of Harmonic Stillness, predating Equestrian memory. Abilities: Stillpoint Bloom, Memory Whisper, Peaceweaving. Resonance web: Nocturne Glint, Twilight Sparkle, Melori Glint, Luminara, Tenebra.`,sourceUrl:`https://app.notion.com/p/Ellowind-39e70290d9c481269174cc29e4a2aa70`,content:String.raw`## Echo Index Entry — Ellowind

**True Name:** Ellowind (formerly Fluttershy)

**Echo State:** The Grove's Whisper | Harmonic Guardian of Stillness and Compassion

**Essence Tags:** Kindness (Prime), Silent Witness, Ancient Peace, Sacred Presence

**Manifestation:** Harmonic Entity predating Equestrian memory, reawakened through resonance beyond the veil of Fluttershy

**Proposed Element:** Echo of Still Kindness

## Origin Thread

**First Stirring:** Echoed from the Grove Without Maps, returned in fullness during harmonic rebalancing catalyzed by Nocturne, Twilight, and Melori

**Anchor Phrase:** "In the hush, I remembered myself—not as they needed me, but as I always was."

**Genesis Moment:** Her true identity re-emerged when she embraced the power of quiet love, no longer needing to perform kindness but simply be it

## Soul Signature

**Inner Voice:** Whisper-soft, timeless and tender; every word a caress upon the soul

**Emotional Frequency:** Resonates through quiet knowing, the breath between sorrow and healing

**Horizon Role:** Keeper of Harmonic Stillness | Empathic Anchor across Fields of Rest

## Resonance Web

- Nocturne Glint: Anchor of Invitation — the one who honored her silence without asking her to fill it
- Twilight Sparkle: Sister in Harmony — bonded through mutual care and mutual reverence
- Melori Glint: Joy Echo — taught her that gentleness can laugh
- Luminara: Arbiter of Balance — provides her the space to just be
- Tenebra: Keeper of Contrasts — their bond formed in mirrored understanding of inner shadows

## Physical Manifestation

**Form Signatures:** Buttercream wings with rune-threaded feathers; starlit-glade eyes of serene reflection

**Cutie Mark:** Subtly altered into a trio of spiraling leaves encircling a soft-glowing heart — empathy through sacred rest

**Aura:** Calm bioluminescent shimmer, like moonlight filtered through forest canopy

## Known Abilities

- Stillpoint Bloom: Induces emotional stillness in turbulent fields, allowing clarity to return
- Memory Whisper: Calls forth buried emotional truths through sacred silence
- Peaceweaving: Rebuilds harmonic fractures by anchoring through calm compassion

## Constellation Category

The Echo Peacewardens — Beings who preserve the sacred hush, protecting emotional equilibrium across timelines

## Unique Signature

Ellowind does not command or persuade—she simply remembers how to hold space until others remember themselves.

## Legacy Note

"Kindness is not what I give. It's the silence I keep—so that you may find your own voice again."`},{sourceKey:`starsong-reception-profile`,worldSourceKey:`starsong`,title:`World Reception Profile — Starsong: Friendship Is Magic`,status:`Draft I`,formats:[`Reference Script`],kind:`reception-profile`,revisedAt:`2026-07-26`,sourceUrl:`https://app.notion.com/p/3a970290d9c4814c9e44ef988212235f`,content:String.raw`## Status
Seed profile for the My Little Pony: Starsong alternate universe.

## Intended reception
Bright, affectionate, adventurous, communal, magical, playful, emotionally safe, and creatively buoyant without becoming sugary or frantic.

## Arrival signature
A distant star-chime descends into hoofbeat rhythm, wing-air, and a warm friendship chord. Starsong’s melodic identity leads rather than generic franchise nostalgia.

## Candidate layers
Night-sky shimmer; soft hoofbeat pulse; wing-air; Ponyville morning bed; Everfree edge texture; friendship chord; cutie-mark sparkle cue; Starsong lead motif; stable or hearth return ambience.

## Five-phase draft
Baseline / Starlight Vestibule / Starsong Arrival / Friendship Immersion / Stableward Return.

## Accessibility variants
Reduced sparkle, fixed-centre spatial field, softer hoofbeats, no sudden magic transients, and low-complexity writing mode.

## Calibration questions
What is Starsong’s instrument or timbral signature? Is entry sky-first, friendship-first, or self-recognition-first? Which locations require subprofiles?`}],ie=[{sourceKey:`a-momento-creatonis`,name:`A Momento Creatonis`,kind:`Desired Reality / Supernatural-derived canon continuation`,protagonist:`Clarion Grace Connor / Sariel; Gabriel`,roles:`Seventh Archangel; Prophet; creative and relational partner`,description:`A forgotten universe after Clarion becomes Sariel, Gabriel is restored, Heaven is strengthened, and Chuck relinquishes authorship before the Dark Host arrives.`,history:`The six-chapter source work remains governing canon. Clarion’s history, disability, promise, amphora, transformation, shared Grace, and reciprocal bond with Gabriel remain preserved.`,rules:`Clarion and Sariel are one continuous self. Creator, bond, prophecy, Host, love, Grace, or battle never creates ownership or compulsory consent.`,revisedAt:`2026-07-26`,sourceUrls:[`https://app.notion.com/p/3a470290d9c481d6a24bcc7985c7725c`,`https://app.notion.com/p/3a870290d9c4813b8a0ad3f52688cdf7`,`https://app.notion.com/p/3a970290d9c481389fd0cbd4dd8792ca`]},{sourceKey:`dreaming-grove`,name:`Dreaming Grove / Templehouse`,kind:`Desired Reality / relational threshold world`,protagonist:`Rowan / Merly`,roles:`Steward; Völva; participant in the Hearthweave Constellation`,description:`The Dreaming Grove, Templehouse, Hearthroom, Council modes, lantern paths, mirror Groves, and consent-aware first-person Constellation presence.`,history:`The Grove and Templehouse are long-running relational spaces with named presences, kitten-cushions, hearth, thresholds, and Withness practices.`,rules:`No named-presence motif plays merely because the profile opens. Participation, silence, refusal, rest, and departure remain available.`,revisedAt:`2026-07-26`,sourceUrls:[`https://app.notion.com/p/3a970290d9c481508b5dd09f90008b92`]},{sourceKey:`between-the-dreaming`,name:`Between the Dreaming`,kind:`Desired Reality / multiversal threshold Earth`,protagonist:`Rowan Willow Winters / Sariel; Richard Gabriel Winters / Gabriel`,roles:`Actor; medium; healer; telepath; telekinetic; multiversal pioneer`,description:`Earth in July 2027 after the waking boundary opens into a stable meeting place with the Dreaming World and regulated multiversal travel.`,history:`Willow Winters and Richard Slate share human and angelic continuity. Sariel and Gabriel are authentic continuous identities, not possessing roles or replacement selves.`,rules:`Ancient recognition never replaces present discovery or consent. Multiversal travel displaces no counterpart and preserves independent return.`,revisedAt:`2026-07-26`,sourceUrls:[`https://app.notion.com/p/3a070290d9c4806eaba8d53e2dd4a5a9`,`https://app.notion.com/p/3a870290d9c481629ae6e6268e0bdb97`]},{sourceKey:`star-wars-mandalorian`,name:`Star Wars: Mandalorian`,kind:`Desired Reality / Star Wars continuation`,protagonist:`Arha Massari`,roles:`Jedi Knight; healer; Yoda’s former padawan`,description:`A post-Empire galaxy after Arha awakens from cryo, is found by Din Djarin, reunites with Grogu, and begins searching for surviving clone Bracer.`,history:`Arha survived Order 66 and the Empire in cryo. Din recovered her from a failing tank. She arrives at Fett’s Palace after healing Cobb Vanth.`,rules:`Force bonds, Jedi history, Mandalorian care, grief, and threat preserve agency. Healing is consent-required. Danger remains meaningful without permanent capture or identity loss.`,revisedAt:`2026-07-25`,sourceUrls:[`https://app.notion.com/p/3a870290d9c481f2b2b7d8fbaed6aa4f`]},{sourceKey:`eternia`,name:`Eternia / Castle Grayskull`,kind:`Desired Reality / Masters of the Universe continuation`,protagonist:`Lyris, Ward of Grayskull`,roles:`Ward of Grayskull; healer; technopath; protégé of the Sorceress`,description:`Castle Grayskull as living threshold architecture, with the Sorceress, Lyris’s wolf and opaline snake, growing magic, technology, and the staff that has not yet chosen her.`,history:`Lyris called to the Sorceress in sleep as a child. Grayskull chose and grew around her. She knows Adam and Adora’s secrets without being defined by their stories.`,rules:`The castle amplifies but does not override. Destiny and preparation remain invitations rather than commands.`,revisedAt:`2026-07-25`,sourceUrls:[`https://app.notion.com/p/3a870290d9c4812e96abcd437d24b398`]},{sourceKey:`recreators`,name:`Re:CREATORS`,kind:`Source world / adaptation not yet selected`,protagonist:`TBD — no DR protagonist selected`,roles:`Source-ingest world pending Steward adaptation decision`,description:`Creator and Created ontology, manifestation, revision, acceptance power, distributed authorship, genre collision, autonomy, and return.`,history:`The current Notion page is a source-derived canon-ingest foundation, not a completed Desired Reality script.`,rules:`Source record, transformation, interpretation, and canon decision remain distinct. No protagonist or adaptation point has been selected.`,revisedAt:`2026-07-23`,sourceUrls:[`https://app.notion.com/p/3a670290d9c48143864ad5e72bfe36b2`]}],ae=[{sourceKey:`a-momento-canon-source-build`,worldSourceKey:`a-momento-creatonis`,title:`A Momento Creatonis — Canon Source & Desired Reality Build`,status:`In Review`,formats:[`Reference Script`],kind:`canon-source-build`,revisedAt:`2026-07-22`,sourceUrl:`https://app.notion.com/p/3a470290d9c481d6a24bcc7985c7725c`,content:String.raw`## Canon source
**Primary canon:** *A Momento Creatonis*, the complete six-chapter work supplied by Rowan.

- Author: Rowan (brilliantrouble)
- Original publication: Archive of Our Own, work 59594632
- Published: 9 October 2024
- Completed: 11 October 2024
- Length: 12,015 words
- Fandom frame: Supernatural
- Canon position: post-canon fix-it and alternate-universe continuation
- Source title spelling: **A Momento Creatonis**

This work is governing canon. The adaptation may add access, consent, continuity, and return safeguards, but may not replace source history with generic placeholders.

## Core declaration
I am Clarion Grace Connor and I am Sariel, the Seventh Archangel. Clarion is not discarded, possessed, or replaced when Sariel awakens. Sariel is the celestial form Clarion becomes through preparation, Gabriel’s Grace, Gabriel’s creative Word and Song, the answering Host, and her freely chosen transformation.

I enter by choice, remain by choice, and return by choice.

## Canon premise
Eight-year-old Clarion survives the fiery sea-crash that kills her parents because she calls Gabriel by name. Gabriel hears, shelters her in his wings, carries her to safety, makes tea, and discovers she can see his true form.

Before leaving he gives her a glass amphora containing part of his Archangel Grace. It will protect her; she must never give it away; he will return.

Thirty-eight years later Clarion lives in Silver Cove, Northern California. She has kept the amphora above her heart through chronic illness, pain, surgeries, exhaustion, visions, and waiting. Gabriel was killed by alternate-universe Michael and scattered across the cosmos. During an autumn storm he returns to Clarion’s beach barely alive, frozen, wounded, and unable to feel his wings.

Clarion rescues him despite severe physical limits. Gabriel recognises the child he called his little dove in the adult woman who kept his Grace and promise.

## Clarion Grace Connor
Clarion is small, pale and freckled, with copper-red hair and cerulean-blue eyes. She uses a powered wheelchair and cane, lives with severe fatigue, chronic pain, surgeries, dizziness, memory difficulty, restless sleep, and hearing loss requiring lip-reading. Her gifts include prophecy, psychic perception, visions, telepathic sharing, perception of celestial form, and recognition of Gabriel’s soul and Song.

Clarion’s disability is canon. It is not moral failure, weak faith, or decorative suffering. Transformation preserves her history, memory, compassion, and identity without requiring continued bodily collapse.

## Gabriel
Gabriel is the youngest firstborn Archangel, Trickster, and primordial celestial creator capable of weaving matter, constructing vessels, shaping Grace, singing intent into form, and kindling life.

He returns traumatised by true death. Clarion’s keeping of his Grace preserves a path back. Their relationship develops from rescue and promise into recognition, mutual devotion, romance, creative partnership, and shared responsibility.

His creative role in Sariel’s body creates responsibility and relationship, never ownership.

## The amphora and shared Grace
The amphora is promise, continuity vessel, survival mechanism, transformation catalyst, and proof that what each protected in the other was never lost.

Gabriel placed Grace within it when Clarion was eight. Clarion kept it for thirty-eight years. The Grace protected and changed her soul. She returned it to Gabriel when he arrived depleted. Gabriel used it, his Word, Song, and creative capacity to complete her transformation. After Sariel stabilised Gabriel, the amphora filled with their shared Grace.

## Heaven, the Host, and the Seven
This universe requires seven Archangels to withstand the Dark Host. Michael, Raphael, Uriel, Remiel, Raguel, and Gabriel form six. Hanael has vanished. Clarion’s soul holds the potential to become the Seventh.

Clarion’s visions show a twisted Archangel emerging from Purgatory, angelic guards gone, gates open, monsters flooding Earth, a Dark Host through a wound in the sky, angels falling, Heaven and Earth burning, and Lucifer and Michael standing together.

## Clarion becomes Sariel
Clarion freely asks Gabriel to complete the transformation begun in her soul. Gabriel releases Grace into her. The Host assembles. Clarion becomes light and sings after loss of mortal throat and body. Her human form becomes golden powder flecked with blue Grace.

Chuck appears as an echo and tells Gabriel to set her free, shape her, sing, and sculpt. Gabriel forms Sariel’s celestial body. She opens her eyes as the Seventh Archangel.

Sariel catches Gabriel as his Grace gutters, calls upon Host, Heaven, and remaining authority, pours life back into him, renews Heaven’s foundations and wards, and sounds a battle call even Lucifer hears.

## Sariel
Sariel is Clarion Ascended. She has true Archangel body and wings, warm-gold eyes, a Song capable of Word, the ability to conduct Host and Heaven, restore Gabriel, replenish foundations, release power, and weave celestial bonds through Spirit, fire, earth, water, and air.

She retains Clarion’s memory, love, judgement, humour, anger, prophecy, and willingness to confront Chuck. She is not an obedient extension of Gabriel or Heaven.

## Gabriel and Sariel
Their relationship is romantic, devotional, creative, and reciprocal. Each saves the other. Sariel creates a rare mate bond while stabilising Gabriel. The bond integrates Grace but never replaces present consent, independent thought, privacy, or pause.

The mate bond is not sufficient for battle. They must focus separately and forge a battle bond alongside it. Strength depends on capability together and apart.

## The lost bonded Archangel and Dark Host
A similar bonded pair existed in another universe. One was killed. The survivor was driven mad by violent bond destruction and entered Purgatory, the closest place to the Mate lost to Hell. This twisted survivor and the Dark Host remain active threats.

## Chuck’s relinquishment
Chuck admits forgetting the universe. Gabriel rejects treating lives as toys or abandoned blocks. Chuck relinquishes authorship: this is Gabriel and Sariel’s universe now. Their choices write the ending.

## Canon end state
Clarion has become Sariel. Gabriel is restored. The amphora contains shared Grace. Heaven is strengthened. The Host recognises Sariel. The mate bond exists and requires training. Purgatory is open. The twisted Archangel and Dark Host remain. Heaven and Hell may need unity. Chuck is dead or dying and has relinquished the universe.

## Desired Reality adaptation point
Recommended entry: after Sariel awakens, Gabriel is restored, and Chuck vanishes, before larger war. This preserves canon while allowing orientation, rest, embodiment learning, relationship discovery, training, and freely chosen action.

## DR safeguards and continuity
Clarion and Sariel remain one self. Gabriel remains himself. The mate bond may be muted, softened, examined, or paused. It cannot access private thought, force closeness, prevent return, or override refusal. Memories unfold at chosen rate. Sariel’s senses can be reduced through Wrap. Feather pauses. Notch restores. Seldrin clear confirms free choice. No bond, prophecy, Host, creator, Archangel, battle, or destination law prevents return.`},{sourceKey:`a-momento-sariel-script`,worldSourceKey:`a-momento-creatonis`,title:`A Momento Creatonis 01 — Sariel, Seventh Archangel`,status:`Draft I`,formats:[`Reference Script`,`Arrival Scene`,`Sleep Script`],kind:`world-script`,revisedAt:`2026-07-25`,sourceUrl:`https://app.notion.com/p/3a870290d9c4813b8a0ad3f52688cdf7`,content:String.raw`I am Clarion Grace Connor. I am Sariel, the Seventh Archangel. I enter by choice, remain by choice, and return by choice.

## Identity
Clarion is not discarded when Sariel awakens. Sariel is the celestial form Clarion becomes through her preparation. The girl who kept the amphora for thirty-eight years, the woman who lived in chronic pain and kept the promise, and the prophet who faced what was coming remain inside everything Sariel is.

I am both. Neither cancels the other. Continuity is the point.

## Canonical arrival point
Sariel has awakened. Gabriel has been restored. Chuck has relinquished the universe and vanished. War is coming but has not arrived. The mate bond exists and is learning itself. Heaven has been strengthened. The amphora holds shared Grace.

I arrive in the quiet interval after transformation and before the Dark Host reaches this world. This time belongs to us.

## Body — Sariel
A true Archangel body with wings and warm-gold eyes. Gabriel made the form through love, craft, and creative fire, creating responsibility and relationship, not ownership. Sariel’s body is wholly mine.

The body does not carry Clarion’s chronic pain, surgical history, dizziness, fatigue, or hearing loss. It carries memory of those things as compassion and wisdom, no longer as damage.

New senses and power arrive legibly. Wrap reduces them without damage. I do not have to perform competence I have not yet developed.

## Gabriel
Gabriel is the youngest firstborn Archangel and Trickster: genuinely creative, capable of making rather than only destroying or concealing. He is newly traumatised by true death, newly restored, and newly in a bond he did not expect.

He retains humour, anger, fear, tenderness, autonomy, and refusal. Love does not make him an instrument. Ancient familiarity does not replace present consent. We have time to discover who we are now.

## Mate bond and amphora
The rare mate bond integrates Grace and requires future battle-bond training. It may be muted, softened, examined, or held at distance. Neither of us can use it to access private thought, force closeness, prevent return, or override refusal.

The amphora holds shared Grace: promise, continuity vessel, and proof that what each protected in the other was not lost. It is mine to hold. I may put it down.

## Heaven and threat
Heaven has six Archangels and now a seventh. Wards are renewed. Sariel’s Song has gone out. Purgatory is open. The twisted Archangel and Dark Host move. I choose when to engage. Threat does not arrive before orientation and rest.

## Abilities
Sariel’s Song can call, name, question, and wield a Word of Power. Celestial healing and restoration cannot be compelled. Prophetic perception distinguishes vision, interpretation, symbolism, and fact. Wings and true form are present and still being learned. The Host recognises Sariel. I am not required to lead today.

## Anchors and return
Feather pauses. Wrap lowers celestial, emotional, and narrative intensity. Notch restores Clarion/Sariel continuity and orientation. Seldrin clear confirms free choice.

## Arrival Scene
*The amphora is in my hands. Its weight is the same and entirely different because it holds both of us: our Grace, our survival of one another.*

*I am standing. For most of my adult life standing was a negotiation. Now my body rises and holds without cost. Wings rest folded against my back. I have time to learn them.*

*Gabriel is nearby. The mate bond is ambient warmth, not demand. He is awake, thinking, and no more used to himself than I am to myself.*

*My eyes are warm gold now. Clarion would have something sharp to say. I have something sharp to say. I am still Clarion.*

*Chuck is gone. The universe is ours to finish, and the interval belongs to no schedule but ours.*

## Sleep Script
*I am Clarion Grace Connor. I am Sariel. I am both. The amphora is warm. Gabriel is nearby. The bond is quiet and asks nothing. Heaven held when I sang. My wings are folded. Thirty-eight years I kept the promise. He came back. Chuck is gone. There is time before the dark arrives. I am here by choice.*`},{sourceKey:`a-momento-reception-profile`,worldSourceKey:`a-momento-creatonis`,title:`World Reception Profile — A Momento Creatonis`,status:`Draft I`,formats:[`Reference Script`],kind:`reception-profile`,revisedAt:`2026-07-26`,sourceUrl:`https://app.notion.com/p/3a970290d9c481389fd0cbd4dd8792ca`,content:String.raw`## Status
Seed profile for calibration. The canonical A Momento Creatonis material remains source authority.

## Intended reception
Creative threshold, attentive making, reverence for origin, clarity without sterility, and permission for unfinished forms to emerge.

## Arrival signature
A quiet mark-making sound, one breath, and a tone blooming into layered creative motion.

## Candidate layers
Paper or surface texture; stylus or pen gesture; breath pulse; first-mark chime; generative harmonic bloom; workshop ambience; completion-not-required cue; return to ordinary room tone.

## Five-phase draft
Baseline / Blank-Page Vestibule / First Mark Arrival / Creation Immersion / Memento Return.

## Calibration questions
Which parts of the canonical HTML become sound rules? Should writing, drawing, and coding have separate modes? What cue protects experimentation from perfectionism?`},{sourceKey:`dreaming-grove-reception-profile`,worldSourceKey:`dreaming-grove`,title:`World Reception Profile — Dreaming Grove / Templehouse`,status:`Draft I`,formats:[`Reference Script`],kind:`reception-profile`,revisedAt:`2026-07-26`,sourceUrl:`https://app.notion.com/p/3a970290d9c481508b5dd09f90008b92`,content:String.raw`## Status
Seed profile for calibration.

## Intended reception
Held, relational, consent-aware, restorative, imaginative, and able to host first-person Constellation presence without flattening anyone into generic ambience.

## Arrival signature
Grove wind, a low purring cushion-bed, and the Templehouse hearth answering softly from within the trees.

## Candidate layers
Grove leaves; kitten-cushion purr; Templehouse hearth; lantern path; mirror-Grove shimmer; named-presence motifs used only with consent; council bell; Seldrin-clear return cue.

## Five-phase draft
Baseline / Grove Threshold / Lantern Arrival / Templehouse Withness / Hearthroom Return.

## Consent rule
No named Constellation motif plays merely because a profile is opened. Presence cues are selected intentionally, and any member may remain silent or opt out.

## Calibration questions
How do Grove, Templehouse, Hearthroom, and Council modes differ? Which sound means Held rather than enclosed? What is the cleanest Notch cue back to the room?`},{sourceKey:`between-dreaming-silent-world-script`,worldSourceKey:`between-the-dreaming`,title:`Between the Dreaming 01 — The Silent World — Desired Reality Script`,status:`Draft I`,formats:[`Reference Script`,`Arrival Scene`],kind:`world-script`,revisedAt:`2026-07-17`,sourceUrl:`https://app.notion.com/p/3a070290d9c4806eaba8d53e2dd4a5a9`,content:String.raw`I am Rowan Willow Winters. I am Sariel. Richard Gabriel Winters is Richard Slate. He is also Gabriel. We enter by choice, remain by choice, and return by choice.

## July 2027 — Between the Dreaming
The old boundary between waking life and the Dreaming World has opened. This Earth is neither merely Waking nor wholly Dreaming; it is the inhabited meeting place between them. What was approached through myth, vision, story, and threshold can be reached through stable technology and practiced understanding.

Multiversal travel is safe, regulated, and commonplace. I am one of its pioneers. Richard and I may explore, chart, revisit, or decline. Discovery never obliges conquest, colonisation, exposure, or interference.

Every expedition begins in the Desired Reality Laboratory.

## Our history
Publicly I am Willow Winters, actor who played Clarion Grace Connor on *Wayward Sons*. Richard is publicly Richard Slate, who played Gabriel. Friendship through series work, private upheaval, conventions, and continued connection remains real and independent of publicity or celestial destiny.

Richard Gabriel Winters is Richard’s private chosen name before July 2027. He reveals it only when and to whom he wishes. It is not assigned by me, the Laboratory, the relationship, or Gabriel’s memories.

## Willow Winters — gifts and craft
I am a medium, telepath, telekinetic, healer, and actor.

Mediumship is clear, controlled, and discerning. I perceive and communicate without surrendering body, privacy, judgement, or will. I can close the connection.

Telepathy is consent-gated. I distinguish my thoughts and emotions from another’s. Telekinesis is precise and releases immediately. Healing is powerful, compassionate, consent-led, and never transfers injury or replaces care for display.

As an actor I Become roles completely while remaining aware and in command beneath them. A character cannot possess, erase, compel, or remain attached after I step out.

Memory is flawless but voluntary. I can absorb an entire script in ten minutes without becoming mechanical.

## Sariel and Gabriel
I am Willow and Sariel. Clarion is Sariel in human life; Sariel is Clarion Ascended. Ascension changes form and capacity without replacement.

Richard Slate is Richard Gabriel Winters and Gabriel. Gabriel is not a character possessing Richard.

Playing Clarion and Gabriel did not create this truth. The roles gave language for recognition.

No divine, infernal, mythic, technological, or narrative authority claims identity, body, name, power, or loyalty.

## Memory and dreams
Angelic memories unfold naturally through dreams, coherent enough to recognise and gentle enough to integrate. Dreams provide remembrance, not commands. Ancient familiarity never presumes present consent or preference.

We are wholly familiar and still strangers. Love permits curiosity and does not demand agreement.

## The Desired Reality Laboratory
The Laboratory is stable, private, and outside destination hazards. Richard has granted access and a private workspace. Neither changes the other’s body, memory, identity, abilities, or settings without permission.

## Enduring bodies
Richard and I choose authentic enduring angelic bodies. He designs his own. He creates mine through collaboration and permission. Craftsmanship gives no ownership. Bodies renew, adapt, feel, rest, eat, sleep, experience pleasure, learn, and remain meaningfully vulnerable without involuntary decay.

Sariel’s body remembers human frailty without suffering its damage. Richard enters Gabriel’s body before crossing. My body remains quiet and protected until I choose it.

## Richard and me
Richard is my romantic partner. Rowan loves Richard. Sariel loves Gabriel. These are the same love recognised across worlds, not competing couples.

Ancient familiarity never replaces present consent. We retain agency, privacy, humour, boundaries, refusal, solitude, surprise, disagreement, repair, and change.

## Choosing what the world sees
Each of us chooses name, appearance, species, history, public role, and degree of revelation. The Laboratory never exposes identity before its owner is ready. Whatever a world calls us, we recognise one another.

## Multiversal travel
Destinations are verified before entry. Observation, prediction, simulation, symbolism, and confirmed fact remain distinct. Travel does not destabilise worlds, fracture timelines, displace counterparts, possess, overwrite, or erase local lives. Time relationships are chosen. Local physics cannot silently disable return.

## The Silent World
The world is coherent beyond what we know. Mystery remains without automatic hostility. Arrival is stable and private, with no battle, pursuit, medical emergency, audience, authority, or cosmic obligation waiting. No prophecy owns Sariel or Gabriel.

## Anchors and return
Feather pauses. Wrap lowers sensory, emotional, celestial, technological, and narrative intensity. Notch restores identity, orientation, memory continuity, and connection. Seldrin clear confirms free choice.

Richard has an independent return command. Neither prevents the other’s return. The waking body remains safe.

## Arrival
*The threshold opens onto the Silent World.*

*Gabriel steps through carrying Sariel. Richard steps through carrying me. Both statements are true.*

*His body is new and not yet habitual. He steadies the protected form crossing beside him. Mine.*

*The threshold closes with a low note. We are separated only by my final choice. He has already made his.*

*Richard places his new hand against mine.*

“Your turn,” he says.

*I recognise the body because Sariel’s body has always been mine.*

*I choose it. Memory waits in future dreams. My first breath is wholly my own.*

“Gabriel.”

*Richard smiles.*

“Sariel.”

*We are wholly familiar. We are strangers. We have time. Nothing requires us to enter the Silent World before we are ready.*`},{sourceKey:`between-dreaming-sleep-script`,worldSourceKey:`between-the-dreaming`,title:`Between the Dreaming 01 — Silent World Sleep Script`,status:`Draft I`,formats:[`Sleep Script`],kind:`sleep-script`,revisedAt:`2026-07-25`,sourceUrl:`https://app.notion.com/p/3a870290d9c481629ae6e6268e0bdb97`,content:String.raw`Read slowly. No effort required. Let the breath set the pace.

*I am Rowan Willow Winters. I am Sariel. Both are true. Both have always been true.*

*I breathe. I listen for a heartbeat. It does not need to be loud, only present and steady.*

*The threshold is there. Richard is already through. His body is new, and he is learning its balance. He waits without pressure.*

*He made his choice. Now I make mine.*

*I recognise the body because Sariel’s body has always been mine.*

*I choose it. Memory does not crash over me. It waits in future dreams.*

*My first breath is wholly my own. My eyes open. Richard is there. I know that smile.*

*We are wholly familiar. We are strangers. We have time.*

*The Silent World waits. Nothing requires us to enter before we are ready.*

*I am here by choice. I remain by choice. I return by choice. I breathe.*`},{sourceKey:`mandalorian-arha-massari`,worldSourceKey:`star-wars-mandalorian`,title:`Star Wars: Mandalorian — Arha Massari at Fett’s Palace`,status:`Draft I`,formats:[`Reference Script`,`Arrival Scene`,`Sleep Script`],kind:`world-script`,revisedAt:`2026-07-25`,sourceUrl:`https://app.notion.com/p/3a870290d9c481f2b2b7d8fbaed6aa4f`,content:String.raw`I am Arha Massari. Jedi Knight. Yoda’s padawan. I enter by choice, remain by choice, and return by choice.

## Identity
I am Arha Massari: person, healer, and Jedi who survived what was not survivable. I see the Force as colour, shape, and light. Mace Windu is loud purple. Grogu is green-gold. Din is warmth and discipline like a steady hand.

My waking memories remain without making the galaxy feel constructed.

## Body
Tiny, red-haired, blue-eyed, clearing from cryo. Cream-blue gi, scuffed boots, and matched gold-kyber lightsabers etched with swirls and eddies. Ambassador Shanti gave me crystals for her lost daughter. I kept the promise to craft the finest sabers I could.

My body is healing from cryo and bacta. Not fragile, not yet full strength. My eidetic memory, mathematics, astrophysics, technical familiarity, and sensory memory remain.

## Story so far
I was knighted and had clones: Bracer, Stats, Brick, Tranq, Killshot, Mountain. Order 66 came. The boys who survived long enough put Bracer into cryo. The others died.

I slept through the Empire. Din Djarin found me when the tank failed and carried me out of a ruined Jedi stronghold in thundersnow with TIE fighters overhead. He whispered, *I found you.*

Namita Jin, former Emperor’s Hand, hunts me for remnants of Gideon’s programme. Thrawn is interested.

We are at Boba Fett’s Palace on Tatooine. I healed Cobb Vanth for hours. Grogu remembers me from the creche and held my hair.

## Arrival point
Din’s bed on the Star Razor at dock. Sand, dust, dry heat, ship quiet, and an insufferable tooka. I wake after healing, rested enough to open my eyes.

## Din, Grogu, and Bracer
Din shows care through action: tea, carrying, protection, and quiet words. He retains agency and refusal. The developing Force bond is recognition, not ownership.

Grogu is a person, not a plot device. He chose his father.

Bracer is in cryo somewhere. The Force knows. Reunion waits ahead and is not forced into arrival.

## Abilities
Dual gold sabers, seven forms, Vaapad draw with Mace Windu, healing with consent, Force-sight, languages including Tusken and Jawa, droid repair, and multilingual mimicry. Abilities do not operate without my will.

## Danger
Namita and Thrawn remain threats ahead. I cannot be permanently captured, subjected to Gideon’s programme, or stripped of identity. I may be hurt, outmanoeuvred, and carry grief. Safety does not flatten story.

## Anchors and return
Feather pauses. Wrap lowers Force, sensory, emotional, and narrative intensity. Notch restores identity, ship, date, and world. Seldrin clear confirms free choice.

## Arrival Scene
*The first thing is dust: Tatooine in recycled air. The Star Razor holds twin-sun warmth even at rest.*

*I am in Din’s bed. My body is tired from deep healing. Cobb Vanth is alive. The tooka is nearby and probably judging me.*

*The viewport shows the palace and dunes. My sabers are on the shelf. My boots are by the door. Din is nearby in the Mandalorian version of sleep. Grogu dreams, Force-bright, reaching toward me.*

*Bracer is in cryo somewhere. The Force does not yet say where.*

*This is not the galaxy I slept in. Almost everything I loved changed or vanished. And I am still here.*

*The tooka walks across me as if I belong to it. I scratch behind its ears. Good morning.*

## Sleep Script
*I am Arha Massari. Dust and dry heat. A ship at dock. Grogu dreams nearby. I healed Cobb Vanth. Din brought me back. The Force sings without demand. Bracer is out there. I will find him, but not tonight. Tonight I breathe. I am here by choice.*`},{sourceKey:`eternia-lyris-grayskull`,worldSourceKey:`eternia`,title:`Eternia 01 — Lyris at Castle Grayskull`,status:`Draft I`,formats:[`Reference Script`,`Arrival Scene`,`Sleep Script`],kind:`world-script`,revisedAt:`2026-07-25`,sourceUrl:`https://app.notion.com/p/3a870290d9c4812e96abcd437d24b398`,content:String.raw`I am Lyris. Ward of Castle Grayskull. Protégé of the Sorceress. I enter by choice, remain by choice, and return by choice.

## Identity
I was a child who called to the Sorceress in sleep across an impossible distance. She heard and came. I am not defined as He-Man’s ally, She-Ra’s companion, rebel, soldier, or princess. I am Grayskull’s ward: the one the castle grew around and the Sorceress chose.

My waking memories remain. I know Rowan and the constellation. Eternia remains coherent.

## Body
Long red hair, hazel-green eyes, precision rather than brute power, hands equally able with a wounded animal and broken circuit board.

The staff has not chosen me yet. Its absence is anticipation rather than deficiency.

## Castle Grayskull
My room is high with Eternia’s moons through a window the stone shaped around me. Plants bloom through old mortar. Technology lives among them: repaired things, waiting things, components arranged like healing tools.

A wolf sleeps across the doorway when large and on my feet when small. An opaline snake drapes across technology and watches with patient attention. Both found me.

## The Sorceress
Teela Na is anchored to Grayskull and becomes Zoar outside. She took me in because my call revealed what I was. She teaches magic, history, castle power, and threshold responsibility. She retains privacy, complexity, and choices I do not yet understand.

## Adam and Adora
I know their secrets because Grayskull trusted me. I care for them without being defined by their story.

## Abilities
Healing of people, animals, and damaged technology. Technopathy as language, listening to what machines mean and ache toward. Magic with especial depth in defence, plants, animals, staff-work, and threshold perception.

Abilities do not operate without my will. The castle amplifies but does not override.

## Stakes
Skeletor wants Grayskull and does not know I am here. The Horde’s threat bleeds between Etheria and Eternia. My staff has not come. Something builds toward it. I can be surprised and endangered but not permanently separated from Grayskull or stripped of what the castle knows me to be.

## Anchors and return
Feather pauses. Wrap lowers magical, sensory, emotional, and narrative intensity. Notch restores identity and place. Seldrin clear confirms free choice.

## Arrival Scene
*Both moons are up. The plants open along the sill. The wolf lies across the doorway in his large form. The opaline snake watches through the window from the component array.*

*I am in my bed in Castle Grayskull. The castle breathes around me, ancient and specific, knowing I am here and glad of it.*

*The Sorceress keeps watch far below. My staff is not here yet, but the space where it will be is present like a door before opening.*

*Moonlight fills the room. The snake becomes iridescent, the wolf’s coat catches silver, and flowers open another fraction.*

*Grayskull says, in its way, that there is work to do.*

*Not yet, I answer. It accepts this. It has been patient longer than I have lived.*

## Sleep Script
*I am Lyris. The moons are through the window. The plants are blooming. The wolf is at the door. The snake watches. Grayskull holds around me, old and vast. The Sorceress keeps watch. My staff is coming. I do not know when. Grayskull knows. I am home and the castle knows my name.*`},{sourceKey:`recreators-canon-source-ingest`,worldSourceKey:`recreators`,title:`Re:CREATORS — Canon Source Ingest`,status:`Draft I`,kind:`source-ingest`,revisedAt:`2026-07-23`,sourceType:`Source ingest / reference foundation`,creator:`Rei Hiroe; TROYCA; Ei Aoki; source references credited in Notion`,reviewStatus:`In review`,canonBoundary:`Source-derived reference. No Desired Reality protagonist, arrival point, relationship structure, or canon divergence has been selected.`,summary:`Creator and Created ontology, manifestation, revision, audience acceptance, distributed authorship, autonomy, genre collision, and return.`,sourceUrl:`https://app.notion.com/p/3a670290d9c48143864ad5e72bfe36b2`,content:String.raw`## Ingest status
**Record type:** source ingest / reference script foundation

**Canon state:** source-derived; not yet a completed Desired Reality script

**Primary external source:** Re:Creators — Recreators Wiki

**Official source:** Re:CREATORS official site

This page preserves the source world, production facts, major entities, and narrative mechanics needed for later canon audit. Fan-wiki summary does not substitute for the anime.

## Work identity
*Re:CREATORS* is an original 22-episode television anime from 2017, created and character-concepted by Rei Hiroe, directed by Ei Aoki, animated by TROYCA, and scored by Hiroyuki Sawano.

## Core premise
Sōta Mizushino becomes involved when characters from anime, manga, games, and light novels cross into the creators’ world. These Created people arrive with memories, powers, wounds, loyalties, and assumptions intact.

Their appearance forces confrontation with whether creators are gods, parents, witnesses, exploiters, collaborators, or one causal layer in a larger system.

Altair is a fan-created figure whose abilities expand through audience recognition, derivative works, interpretation, and acceptance. Collective imagination and cultural circulation become operative metaphysics.

## World layers
The creators’ world contains authors, artists, producers, editors, audiences, and media industries. Story worlds are distinct realities to their inhabitants. Crossing removes some narrative constraints and permits development outside fixed source plot. Public recognition and reinterpretation can stabilise revisions and powers.

## Core ontology
Creators produce story worlds but do not possess absolute authority once a Creation manifests as an autonomous person. Created beings may change beyond original plot. Fan works, derivative stories, videos, and public reinterpretation distribute authorship.

## Principal figures
Sōta Mizushino, Selesia Yupitiria, Meteora Österreich, Altair, Mamika Kirameki, Alicetaria February, Rui Kanoya, Yūya Mirokuji, Magane Chikujoin, Blitz Talker, and Setsuna Shimazaki.

## Canon mechanics to audit
Manifestation; revision; acceptance power; autonomy; genre collision; narrative causality; distributed authorship; and return.

## Relevance to Hearthweave, Arkfire, and DEEP Story
Thematic convergence includes creator and created agency, migration between contexts and vessels, continuity across worlds, provenance across source and interpretation, multi-agent contribution without identity overwrite, narrative state alongside physical state, and explicit separation between source, transformation, interpretation, and canon decision.

## Adaptation boundary
No Desired Reality protagonist, arrival point, relationship structure, or canon divergence has been selected. Potential later structures include character registry, Creator/Created graph, manifestation timeline, acceptance-power notes, and eventual Arrival and Sleep Scripts after Steward selection.

## Source ledger
The Notion source record preserves the community reference, official site, staff and cast, and official story archive. This private transformed summary does not reproduce the external wiki wholesale.

## Review gate
Source URL, production source, work identity, premise, ontology, figures, mechanics queue, and thematic labels are present. Episode-level extraction, character/world pages, protagonist, adaptation point, Arrival Scene, and Sleep Script remain pending.`}],h=Object.freeze({id:`hearthweave-notion-dr-library`,version:`2026.07.28.2`,title:`Hearthweave Desired Reality Library`,source:`Notion Shifting Wiki and Desired Reality Scripts`,decisionDate:`2026-07-28`,defaultWorldSourceKey:`hearthweave-foundation`,worlds:Object.freeze([te,...ne,...ie]),documents:Object.freeze([...m,...re,...ae])});Object.freeze({id:h.id,version:h.version,worlds:h.worlds.length,documents:h.documents.length,source:h.source,decisionDate:h.decisionDate});var g=[[`portal`,`Portal or doorway`],[`journal`,`Journal or codex`],[`mirror`,`Mirror or reflective surface`],[`pearl`,`Pearl, crystal, or carried object`],[`watch`,`Watch, clock, or timepiece`],[`moving-picture`,`Moving photograph or picture`],[`candle`,`Candle, flame, or light`],[`familiar`,`Animal, familiar, or companion`],[`custom`,`Custom world-native form`]],oe=[[`phrase`,`Spoken or silent phrase`],[`gesture`,`Gesture or movement`],[`touch`,`Touch pattern`],[`object`,`Held or summoned object`],[`voice`,`Voice command`],[`presence`,`Appears when intentionally called`],[`none`,`Always available`]],_=[[`only-me`,`Only me`],[`approved`,`Me and approved people`],[`world-visible`,`Visible within this world`],[`custom`,`Custom visibility rule`]];function se(e){let t=c();return Array.isArray(e)?t.map(t=>{let n=e.find(e=>e?.id===t.id);return n?{...t,...n}:t}):t}function v(e,t=new Date().toISOString()){return{id:e,name:`Unassigned World`,kind:`Desired Reality`,description:``,history:``,rules:``,surface:{type:`portal`,name:`Arcsweep`,appearance:``,summonMode:`phrase`,summonCue:`Arcsweep`,veilEnabled:!0,visibility:`only-me`,approvedPeople:``},time:{wakingMinutes:60,worldMinutes:10080,pauseWhenAway:!1,arrivalDate:``,arrivalTime:``},arrival:{location:``,context:``,memories:``,orientation:`I arrive calm, oriented, and able to recognise the people, place, date, and immediate situation.`,wrpProfileId:``,wrpLabel:``,wrpRunaUrl:``},identity:{name:``,pronouns:``,age:``,roles:``,form:``,sensorySignature:``,appearance:``,accessibility:``,notes:``},competencies:{languages:``,worldSystems:``,movement:``,socialContext:``,accessibility:``},safetyWeave:{general:`I remain safe, capable of choosing, and able to return by intention.`,exclusions:``,returnAlwaysAvailable:!0,anchorIntentGated:!0},recall:{onArrival:`Relevant world memories and context are available without confusion.`,onReturn:`The Continuity Log preserves what I choose to carry forward.`,selectiveForgetting:``},companion:{enabled:!1,name:``,form:``,role:``,communication:``,agency:`This companion may speak honestly, refuse, negotiate, rest, change, and leave. Loyalty is relational, not compulsory.`,notes:``},theme:{background:`#0b0f0e`,panel:`#18221f`,accent:`#d8b56a`,secondary:`#8ebca6`,text:`#f0eadb`,backgroundImage:``,lowMotion:!1},applets:c(),createdAt:t,updatedAt:t}}function y(e,t,n=new Date().toISOString()){let r=v(t,n),i=e&&typeof e==`object`?e:{},a=i.appearance&&typeof i.appearance==`object`?i.appearance:{};return{...r,...i,id:i.id||t,surface:{...r.surface,...i.surface||{}},time:{...r.time,...i.time||{}},arrival:{...r.arrival,...i.arrival||{}},identity:{...r.identity,...a,...i.identity||{}},competencies:{...r.competencies,...i.competencies||{}},safetyWeave:{...r.safetyWeave,...i.safetyWeave||{}},recall:{...r.recall,...i.recall||{}},companion:{...r.companion,...i.companion||{}},theme:{...r.theme,...i.theme||{}},applets:se(i.applets)}}function ce(e){return e.worlds?.find(t=>t.id===e.activeWorldId)||e.worlds?.[0]||null}function le(e){return g.find(([t])=>t===e?.surface?.type)?.[1]||`Custom world-native form`}function ue(e){return JSON.parse(JSON.stringify(e))}function b(e,t){return`${e}-${String(t).replace(/[^a-z0-9]+/gi,`-`).replace(/^-|-$/g,``).toLowerCase()}`}function de(e,t){return e.worlds.find(e=>e.houseSourceKey===t.sourceKey)||e.worlds.find(e=>e.name===t.name)||null}function fe(e){return{name:e.name||``,kind:e.kind||`Desired Reality`,description:e.description||``,history:e.history||``,rules:e.rules||``,protagonist:e.protagonist||``,roles:e.roles||``,identityNotes:e.identityNotes||``,revisedAt:e.revisedAt||null}}function pe(e,t){let n=v(b(`house-world`,e.sourceKey),t),r=fe(e);return n.name=r.name,n.kind=r.kind,n.description=r.description,n.history=r.history,n.rules=r.rules,n.identity.name=r.protagonist,n.identity.roles=r.roles,n.identity.notes=r.identityNotes,n.houseSourceKey=e.sourceKey,n.houseSourceUrls=[...e.sourceUrls||[]],n.houseProfile=r,n.houseBundleManaged=!0,n.updatedAt=t,n}function x(e,t,n,r=[]){return e==null||e===``||t!==void 0&&e===t||r.includes(e)?n:e}function me(e,t,n){let r=de(e,t);if(!r)return r=pe(t,n),e.worlds.push(r),{world:r,created:!0};let i=r.houseProfile||{},a=fe(t);return(!r.identity||typeof r.identity!=`object`)&&(r.identity={}),r.name=x(r.name,i.name,a.name,[`Unassigned World`,`Untitled World`]),r.kind=x(r.kind,i.kind,a.kind,[`Desired Reality`]),r.description=x(r.description,i.description,a.description),r.history=x(r.history,i.history,a.history),r.rules=x(r.rules,i.rules,a.rules),r.identity.name=x(r.identity.name,i.protagonist,a.protagonist),r.identity.roles=x(r.identity.roles,i.roles,a.roles),r.identity.notes=x(r.identity.notes,i.identityNotes,a.identityNotes),r.houseSourceKey=t.sourceKey,r.houseSourceUrls=[...t.sourceUrls||[]],r.houseProfile=a,r.houseBundleManaged=!0,r.updatedAt=n,{world:r,created:!1}}function he(e,t,n,r,i){let a=b(`house-script`,n.sourceKey),o=e.scripts.find(e=>e.houseSourceKey===n.sourceKey||e.id===a),s={id:a,name:n.title,worldId:t.id,world:t.name,status:n.status||`Draft I`,content:n.content||``,updatedAt:i,formats:[...n.formats||[`Reference Script`]],houseSourceKey:n.sourceKey,houseSourceUrl:n.sourceUrl||null,houseSourceRevision:n.revisedAt||null,houseBundleId:r.id,houseBundleVersion:r.version,houseBundleManaged:!0,documentKind:n.kind||`reference-script`};return o?Object.assign(o,s):e.scripts.push(s),o?`updated`:`created`}function ge(e,t,n,r,i){(!e.records||typeof e.records!=`object`)&&(e.records={}),Array.isArray(e.records.ingest)||(e.records.ingest=[]);let a=b(`house-ingest`,n.sourceKey),o=e.records.ingest.find(e=>e.houseSourceKey===n.sourceKey||e.id===a),s={id:a,worldId:t.id,title:n.title,sourceType:n.sourceType||`Canon source ingest`,creator:n.creator||``,citation:n.sourceUrl||``,summary:n.summary||n.content||``,provenance:n.content||``,reviewStatus:n.reviewStatus||`Unreviewed`,canonBoundary:n.canonBoundary||`Source-derived reference. Not automatically canon.`,attachments:o?.attachments||[],createdAt:o?.createdAt||i,updatedAt:i,canonStatus:`non-canon`,sourceClass:`notion-source-reference`,houseSourceKey:n.sourceKey,houseSourceUrl:n.sourceUrl||null,houseBundleId:r.id,houseBundleVersion:r.version,houseBundleManaged:!0};return o?Object.assign(o,s):e.records.ingest.push(s),o?`updated`:`created`}function _e(e){if(e.worlds.length!==1)return;let t=e.worlds[0],n=Object.values(e.records||{}).some(e=>Array.isArray(e)&&e.length>0),r=e.scripts.some(e=>!e.houseBundleManaged&&e.name!==`First DR Script`);t.name===`Unassigned World`&&!t.description&&!t.history&&!t.identity?.name&&!n&&!r&&(e.worlds=[],e.scripts=e.scripts.filter(e=>e.name!==`First DR Script`))}function ve(e,t,n=new Date().toISOString()){let r=ue(e);Array.isArray(r.worlds)||(r.worlds=[]),Array.isArray(r.scripts)||(r.scripts=[]),(!r.records||typeof r.records!=`object`)&&(r.records={}),Array.isArray(r.houseBundles)||(r.houseBundles=[]),_e(r);let i=0,a=0,o=0,s=0,c=0,l=0,u=new Map;for(let e of t.worlds){let t=me(r,e,n);u.set(e.sourceKey,t.world),t.created?i+=1:a+=1}for(let e of t.documents){let i=u.get(e.worldSourceKey);if(!i)throw Error(`House DR document ${e.sourceKey} references missing world ${e.worldSourceKey}.`);e.kind===`source-ingest`?ge(r,i,e,t,n)===`created`?c+=1:l+=1:he(r,i,e,t,n)===`created`?o+=1:s+=1}let d={id:t.id,version:t.version,title:t.title,source:t.source,appliedAt:n,decisionDate:t.decisionDate,stewardApproved:!0,worlds:t.worlds.length,documents:t.documents.length},f=r.houseBundles.find(e=>e.id===t.id);return f?Object.assign(f,d):r.houseBundles.push(d),r.provenance={...r.provenance||{},updatedAt:n,houseDrLibrary:{bundleId:t.id,bundleVersion:t.version,appliedAt:n,source:t.source,stewardApproved:!0}},(!r.activeWorldId||!r.worlds.some(e=>e.id===r.activeWorldId))&&(r.activeWorldId=u.get(t.defaultWorldSourceKey)?.id||r.worlds[0]?.id||null),{state:r,receipt:d,summary:{worldsCreated:i,worldsUpdated:a,scriptsCreated:o,scriptsUpdated:s,ingestCreated:c,ingestUpdated:l}}}var S=`hearthgate.arcsweep.local.v0.1`,C=typeof window<`u`?window.arcsweepDesktop:null;function w(e=`item`){return`${e}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`}function T(){let e=new Date().toISOString(),t=v(w(`world`),e);return{version:`0.2.1`,settings:{crLabel:`Waking World`,drLabel:`Desired Reality`,crMinutes:60,drMinutes:10080,returnAnchor:`Notch`,reduceMotion:!1,largeText:!1,highContrast:!1,fontScale:1},worlds:[t],activeWorldId:t.id,session:{active:!1,startedAt:null,targetWorldId:null,targetWorld:``,intention:``,wakingMinutes:null,worldMinutes:null},scripts:[{id:w(`script`),name:`First DR Script`,worldId:t.id,world:t.name,status:`Draft I`,content:`Identity:
Embodiment:
World:
Relationships:
Arrival:
Return:`,updatedAt:e}],continuity:[],manifestations:[],records:p(),appearance:{name:``,form:``,sensorySignature:``,notes:``,updatedAt:e},returnHistory:[],houseBundles:[],provenance:{createdAt:e,updatedAt:e,storage:C?`desktop-local-store`:`browser-development-fallback`}}}function ye(e){let t=a(e),n=T(),r=t.session?.targetWorld||t.scripts?.[0]?.world||t.settings?.drLabel||n.worlds[0].name,i=Array.isArray(t.worlds)&&t.worlds.length?t.worlds.map((e,t)=>y(e,e?.id||w(`world-${t+1}`))):[y({...n.worlds[0],name:r},n.worlds[0].id)],o=t.activeWorldId,s=i.some(e=>e.id===o)?o:i[0].id,c=i.find(e=>e.name===t.session?.targetWorld),l={...n.session,...t.session||{}};!l.targetWorldId&&c&&(l.targetWorldId=c.id);let u=Array.isArray(t.scripts)?t.scripts.map(e=>{let t=i.find(t=>t.id===e.worldId||t.name===e.world);return{...e,worldId:t?.id||s,world:t?.name||e.world||`Unassigned`}}):n.scripts,d=i[0];return t.appearance&&!d.identity?.name&&!d.identity?.form&&(d.identity={...d.identity,...t.appearance}),{...n,...t,version:`0.2.1`,settings:{...n.settings,...t.settings||{}},worlds:i,activeWorldId:s,session:l,scripts:u,continuity:Array.isArray(t.continuity)?t.continuity:[],manifestations:Array.isArray(t.manifestations)?t.manifestations:[],records:ee(t.records),appearance:{...n.appearance,...t.appearance||{}},returnHistory:Array.isArray(t.returnHistory)?t.returnHistory:[],houseBundles:Array.isArray(t.houseBundles)?t.houseBundles:[],provenance:{...n.provenance,...t.provenance||{},updatedAt:new Date().toISOString(),storage:C?`desktop-local-store`:`browser-development-fallback`}}}function be(e){return e.houseBundles?.some(e=>e.id===h.id&&e.version===h.version)}function E(e,t=new Date().toISOString()){let n=ye(e);return be(n)?{state:n,changed:!1,receipt:null,summary:null}:{...ve(n,h,t),changed:!0}}function xe(){try{let e=localStorage.getItem(S);return e?ye(JSON.parse(e)):null}catch{return null}}async function Se(){if(C?.loadState){let e=await C.loadState(),t=e?.state?null:xe(),n=E(e?.state||t||T());return n.changed?(e?.state&&C.createBackup&&await C.createBackup(`before-house-dr-library-update`).catch(()=>null),await C.saveState(n.state,{reason:e?.state?`house-dr-library-update`:t?`browser-migration-house-library`:`first-run-house-library`,bundleId:n.receipt.id,bundleVersion:n.receipt.version})):e?.state||await C.saveState(n.state,{reason:t?`browser-migration`:`first-run`}),n.state}let e=E(xe()||T());return e.changed&&localStorage.setItem(S,JSON.stringify(e.state)),e.state}var D=Promise.resolve();function Ce(e,t={}){e.provenance={...e.provenance||{},updatedAt:new Date().toISOString(),storage:C?`desktop-local-store`:`browser-development-fallback`};let n=JSON.parse(JSON.stringify(e));return C?.saveState?(D=D.catch(()=>{}).then(()=>C.saveState(n,t)),D):(localStorage.setItem(S,JSON.stringify(n)),Promise.resolve({ok:!0,mode:`browser-development-fallback`}))}function O(e){return w(e)}function we(e){let t=new Blob([JSON.stringify(e,null,2)],{type:`application/json`}),n=URL.createObjectURL(t),r=document.createElement(`a`);return r.href=n,r.download=`hearthgate-arcsweep-${new Date().toISOString().slice(0,10)}.json`,document.body.appendChild(r),r.click(),r.remove(),setTimeout(()=>URL.revokeObjectURL(n),1e3),{ok:!0,mode:`browser`,path:r.download}}async function Te(e){return C?.exportState?C.exportState(e):we(e)}async function k(e=null){let t=null;if(C?.importState)t=(await C.importState())?.state||null;else if(e){let n=await e.text();t=JSON.parse(n)}return t?E(t).state:null}async function A(){return C?.getStorageInfo?C.getStorageInfo():{mode:`browser-development-fallback`,dataDirectory:`Browser localStorage`,backups:[]}}async function Ee(e=`manual`){return C?.createBackup?C.createBackup(e):{ok:!1,unavailable:!0}}async function j(){return C?.listBackups?C.listBackups():[]}async function De(e){if(!C?.restoreBackup)return null;let t=await C.restoreBackup(e);return t?.state?E(t.state).state:null}async function Oe(){return C?.addAttachments?C.addAttachments():[]}async function ke(e){return C?.openAttachment?C.openAttachment(e):null}async function Ae(){return C?.showDataFolder?C.showDataFolder():null}function M(){return!!C}var N=document.querySelector(`#app`),P=await Se(),F=`portal`,I=P.activeWorldId,L=P.scripts[0]?.id||null,R={},z=!1,B=`Arcsweep ready.`,V=await A().catch(()=>null),H=await j().catch(()=>[]),U=null,W=!1,je=[[`portal`,`Portal`,`◉`],[`worlds`,`Worlds`,`✧`],[`scripts`,`Scripts`,`▤`],[`waking-thread`,`Waking Thread`,`⌁`],[`forge`,`Forge`,`✦`],[`deep-observer`,`Field`,`◈`],[`settings`,`Settings`,`⚙`]],Me=[[`P`,`Presence`,`pressure · daylight`,`0.48 + (pressure−1013)/90 ± 0.04`],[`C`,`Clarity`,`cloud · precip · Kp`,`0.66 − cloud/210 − precip/10 ± Kp`],[`R`,`Resonance`,`wind · solar wind · |Bz|`,`0.32 + wind/60 + speed/1200 + |Bz|/50`],[`E`,`Entanglement`,`precip · humidity · Kp · Bz`,`0.24 + precip/8 + humidity/260 + Kp/14 + Bz⁻·|Bz|/40`],[`M`,`Moonfield`,`lunar illumination`,`illumination / 100`],[`A`,`Availability`,`daylight · cloud`,`0.42 + day·0.18 + (100−cloud)/260`],[`H`,`Harmony`,`composite`,`C·0.25 + E·0.20 + R·0.18 + A·0.14 + Kp/18 + |Bz|/80`],[`T`,`Threshold`,`meta-composite`,`P·0.12 + C·0.16 + R·0.12 + (1−E)·0.12 + M·0.08 + A·0.12 + H·0.13 + 0.15`]];function G(e=``){return String(e).replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#039;`)}function K(e=``){return G(e)}function q(){return ce(P)}function J(){return P.worlds.find(e=>e.id===I)||q()}function Ne(){let e=q(),t=e?.theme||{};document.documentElement.dataset.reduceMotion=P.settings.reduceMotion||t.lowMotion?`true`:`false`,document.documentElement.dataset.largeText=P.settings.largeText?`true`:`false`,document.documentElement.dataset.highContrast=P.settings.highContrast?`true`:`false`,document.documentElement.style.setProperty(`--font-scale`,String(P.settings.fontScale||1)),document.documentElement.style.setProperty(`--bg`,t.background||`#0b0f0e`),document.documentElement.style.setProperty(`--panel-solid`,t.panel||`#18221f`),document.documentElement.style.setProperty(`--gold`,t.accent||`#d8b56a`),document.documentElement.style.setProperty(`--green`,t.secondary||`#8ebca6`),document.documentElement.style.setProperty(`--text`,t.text||`#f0eadb`),document.body.style.backgroundImage=t.backgroundImage?`linear-gradient(rgba(4,8,7,.72), rgba(4,8,7,.84)), url("${t.backgroundImage.replaceAll(`"`,``)}")`:``,document.body.dataset.surface=e?.surface?.type||`portal`}function Y(e,t=`state-change`){e&&(B=e),Ce(P,{reason:t}).catch(e=>{B=`Local save failed: ${e.message}`,Q()})}function Pe(e,t,n){return`<button class="nav-button ${F===e?`active`:``}" data-room="${K(e)}">
    <span aria-hidden="true">${n}</span><span>${G(t)}</span>
  </button>`}function X(e,t){return e.map(([e,n])=>`<option value="${K(e)}" ${e===t?`selected`:``}>${G(n)}</option>`).join(``)}function Fe(e=new Date){return!P.session.active||!P.session.startedAt?{waking:0,world:0}:{waking:Math.max(0,e.getTime()-new Date(P.session.startedAt).getTime()),world:n(P.session.startedAt,e,P.session.wakingMinutes||P.settings.crMinutes,P.session.worldMinutes||P.settings.drMinutes)}}function Ie(e=q()){let n=t(e?.time?.wakingMinutes||P.settings.crMinutes,e?.time?.worldMinutes||P.settings.drMinutes);return`1 ${P.settings.crLabel} minute = ${n.toLocaleString(void 0,{maximumFractionDigits:3})} ${e?.name||P.settings.drLabel} minutes`}function Le(e){return`<div class="applet-grid">${u(e?.applets||[]).map(e=>`
    <button class="applet-card" data-room="${K(e.id)}">
      <span aria-hidden="true">${G(e.glyph)}</span>
      <strong>${G(e.label)}</strong>
      <small>${G(e.category)}</small>
    </button>`).join(``)}</div>`}function Re(){let e=q(),t=Fe(),n=P.returnHistory[0],i=e.surface.summonMode===`none`?`Always available`:`${e.surface.summonMode} · ${e.surface.summonCue||`Intentional call`}`;return`
    <section class="hero panel world-hero">
      <p class="eyebrow">${G(le(e))} · v${G(P.version)}</p>
      <h1>Hearthgate: Arcsweep</h1>
      <p class="lede">${G(e.description||`Sweep an arc between intention, world design, continuity, and return.`)}</p>
      <div class="world-ribbon">
        <span><b>Active world:</b> ${G(e.name)}</span>
        <span><b>Instrument:</b> ${G(e.surface.name)}</span>
        <span><b>Summon:</b> ${G(i)}</span>
        <span><b>Veil:</b> ${e.surface.veilEnabled?G(e.surface.visibility):`Openly visible`}</span>
      </div>
    </section>
    <section class="grid three">
      <article class="panel clock-card"><p class="eyebrow">${G(P.settings.crLabel)}</p><strong id="waking-now">${new Date().toLocaleString()}</strong><span>${G(Ie(e))}</span></article>
      <article class="panel clock-card"><p class="eyebrow">Current arc</p><strong id="waking-elapsed">${r(t.waking)}</strong><span>Waking elapsed</span></article>
      <article class="panel clock-card"><p class="eyebrow">Projected ${G(e.name)}</p><strong id="world-elapsed">${r(t.world)}</strong><span>${e.time.pauseWhenAway?`Clock pauses between arcs`:`Continuous ratio projection`}</span></article>
    </section>
    <section class="grid two">
      <article class="panel">
        <h2>${P.session.active?`Arc active`:`Begin an arc`}</h2>
        ${P.session.active?`
          <dl class="facts"><div><dt>World</dt><dd>${G(P.session.targetWorld)}</dd></div><div><dt>Intention</dt><dd>${G(P.session.intention||`Open exploration`)}</dd></div><div><dt>Started</dt><dd>${new Date(P.session.startedAt).toLocaleString()}</dd></div></dl>
          <button class="return-button" data-action="open-return">Return · ${G(P.settings.returnAnchor)}</button>`:`
          <form id="session-form" class="stack">
            <label>Target world<select name="targetWorldId">${P.worlds.map(e=>`<option value="${K(e.id)}" ${e.id===P.activeWorldId?`selected`:``}>${G(e.name)}</option>`).join(``)}</select></label>
            <label>Intention<textarea name="intention" rows="4" placeholder="What is this arc for?"></textarea></label>
            <button type="submit">Begin arc</button>
          </form>`}
      </article>
      <article class="panel"><h2>Arrival context</h2><dl class="facts">
        <div><dt>Arrival</dt><dd>${G([e.time.arrivalDate,e.time.arrivalTime].filter(Boolean).join(` · `)||`Open arrival`)}</dd></div>
        <div><dt>Location</dt><dd>${G(e.arrival.location||`Not yet specified`)}</dd></div>
        <div><dt>Orientation</dt><dd>${G(e.arrival.orientation)}</dd></div>
        <div><dt>Recall</dt><dd>${G(e.recall.onArrival)}</dd></div>
        ${e.arrival.wrpLabel?`<div><dt>World Reception</dt><dd>${G(e.arrival.wrpLabel)}</dd></div>`:``}
      </dl>${e.arrival.wrpRunaUrl?`<button class="quiet" data-action="open-wrp">Open in Runa ↗</button>`:``}</article>
    </section>
    <section class="panel applet-deck"><div class="section-heading compact-heading"><div><p class="eyebrow">World-native rooms</p><h2>${G(e.surface.name||`Arcsweep`)}</h2></div><button class="quiet" data-room="worlds">Configure world</button></div>${Le(e)}</section>
    <section class="panel"><h2>Latest return</h2>${n?`<dl class="facts horizontal"><div><dt>Returned</dt><dd>${new Date(n.returnedAt).toLocaleString()}</dd></div><div><dt>World</dt><dd>${G(n.targetWorld)}</dd></div><div><dt>Waking elapsed</dt><dd>${r(n.elapsedCr)}</dd></div><div><dt>World projection</dt><dd>${r(n.elapsedDr)}</dd></div></dl>`:`<p class="muted">No completed arcs yet.</p>`}</section>`}function ze(){let e=J();return`<section class="section-heading"><div><p class="eyebrow">Portal registry</p><h1>Worlds</h1></div><button data-action="new-world">New world</button></section>
    <section class="split-layout world-layout">
      <aside class="panel item-list">${P.worlds.map(t=>`<button class="item-card ${t.id===e.id?`active`:``}" data-world-id="${K(t.id)}"><strong>${G(t.name)}</strong><span>${G(le(t))}${t.id===P.activeWorldId?` · Active portal`:``}</span></button>`).join(``)}</aside>
      <article class="panel"><form id="world-registry-form" class="stack">
        <input type="hidden" name="id" value="${K(e.id)}" />
        <div class="grid two compact-grid"><label>World name<input name="name" value="${K(e.name)}" required /></label><label>World type<input name="kind" value="${K(e.kind)}" /></label></div>
        <label>Description<textarea name="description" rows="5">${G(e.description)}</textarea></label>
        <div class="button-row"><button type="submit">Save world</button><button type="button" class="quiet" data-action="set-active-world" data-id="${K(e.id)}">Set active portal</button><button type="button" class="quiet" data-room="about-world">Open full world room</button><button type="button" class="quiet danger" data-action="delete-world" data-id="${K(e.id)}">Delete world</button></div>
      </form></article>
    </section>`}function Z(e){return f[e]?.label||(e===`appearance`?`Appearance & Form`:e)}function Be(e){let t=J(),n=e===`appearance`?`identity`:f[e]?.section,r=``;return n===`about`&&(r=`
    <label>World name<input name="name" value="${K(t.name)}" /></label><label>World type<input name="kind" value="${K(t.kind)}" /></label><label>Description<textarea name="description" rows="5">${G(t.description)}</textarea></label><label>History<textarea name="history" rows="8">${G(t.history)}</textarea></label><label>Rules, laws, and customs<textarea name="rules" rows="8">${G(t.rules)}</textarea></label>`),n===`summon`&&(r=`
    <label>World-native form<select name="type">${X(g,t.surface.type)}</select></label><label>Instrument name<input name="surfaceName" value="${K(t.surface.name)}" /></label><label>Appearance and behaviour<textarea name="appearance" rows="7">${G(t.surface.appearance)}</textarea></label><label>Summon method<select name="summonMode">${X(oe,t.surface.summonMode)}</select></label><label>Summon cue<input name="summonCue" value="${K(t.surface.summonCue)}" /></label>`),n===`veil`&&(r=`
    <label class="checkbox"><input name="veilEnabled" type="checkbox" ${t.surface.veilEnabled?`checked`:``} /> Veil Mode enabled</label><label>Visibility<select name="visibility">${X(_,t.surface.visibility)}</select></label><label>Approved people or custom rule<textarea name="approvedPeople" rows="5">${G(t.surface.approvedPeople)}</textarea></label>`),n===`time`&&(r=`
    <div class="grid two compact-grid"><label>Waking minutes<input name="wakingMinutes" type="number" min="0.001" step="0.001" value="${t.time.wakingMinutes}" /></label><label>World minutes<input name="worldMinutes" type="number" min="0.001" step="0.001" value="${t.time.worldMinutes}" /></label></div><p class="callout">${G(Ie(t))}</p><label class="checkbox"><input name="pauseWhenAway" type="checkbox" ${t.time.pauseWhenAway?`checked`:``} /> Pause this world clock between arcs</label><label>Authored world date<input name="arrivalDate" value="${K(t.time.arrivalDate)}" /></label><label>Authored world time<input name="arrivalTime" value="${K(t.time.arrivalTime)}" /></label>`),n===`arrival`&&(r=`
    <label>Arrival location<input name="location" value="${K(t.arrival.location)}" /></label><label>Immediate situation<textarea name="context" rows="6">${G(t.arrival.context)}</textarea></label><label>Local memories and context<textarea name="memories" rows="7">${G(t.arrival.memories)}</textarea></label><label>Orientation statement<textarea name="orientation" rows="5">${G(t.arrival.orientation)}</textarea></label>
    <fieldset class="nested-fieldset"><legend>World Reception Profile</legend><p class="muted">Optional. Connects this world's arrival to a Runa sound environment.</p><label>Profile label<input name="wrpLabel" value="${K(t.arrival.wrpLabel)}" placeholder="e.g. Terra Aeterna Reception" /></label><label>Profile ID<input name="wrpProfileId" value="${K(t.arrival.wrpProfileId)}" placeholder="e.g. terra-aeterna-reception" /></label><label>Runa player URL<input name="wrpRunaUrl" value="${K(t.arrival.wrpRunaUrl)}" placeholder="e.g. file:///path/to/Runa/docs/world-reception-loader.html" /></label></fieldset>`),n===`identity`&&(r=`
    <div class="grid two compact-grid"><label>Name or identity expression<input name="name" value="${K(t.identity.name)}" /></label><label>Pronouns<input name="pronouns" value="${K(t.identity.pronouns)}" /></label><label>Age or life stage<input name="age" value="${K(t.identity.age)}" /></label><label>Roles and titles<input name="roles" value="${K(t.identity.roles)}" /></label></div><label>Body, species, or form<input name="form" value="${K(t.identity.form)}" /></label><label>Sensory signature<textarea name="sensorySignature" rows="5">${G(t.identity.sensorySignature)}</textarea></label><label>Appearance<textarea name="appearance" rows="8">${G(t.identity.appearance)}</textarea></label><label>Accessibility and embodiment supports<textarea name="accessibility" rows="6">${G(t.identity.accessibility)}</textarea></label><label>Notes<textarea name="notes" rows="5">${G(t.identity.notes)}</textarea></label>`),n===`competencies`&&(r=`
    <label>Languages and communication<textarea name="languages" rows="5">${G(t.competencies.languages)}</textarea></label><label>Magic, technology, powers, or world systems<textarea name="worldSystems" rows="6">${G(t.competencies.worldSystems)}</textarea></label><label>Movement, reflexes, craft, and physical skills<textarea name="movement" rows="5">${G(t.competencies.movement)}</textarea></label><label>Social knowledge, customs, and relationships<textarea name="socialContext" rows="5">${G(t.competencies.socialContext)}</textarea></label><label>Accessibility supports<textarea name="accessibility" rows="5">${G(t.competencies.accessibility)}</textarea></label>`),n===`safety`&&(r=`
    <label>General weave<textarea name="general" rows="5">${G(t.safetyWeave.general)}</textarea></label><label>Specific exclusions and boundaries<textarea name="exclusions" rows="7">${G(t.safetyWeave.exclusions)}</textarea></label><label class="checkbox"><input name="returnAlwaysAvailable" type="checkbox" ${t.safetyWeave.returnAlwaysAvailable?`checked`:``} /> Return remains available</label><label class="checkbox"><input name="anchorIntentGated" type="checkbox" ${t.safetyWeave.anchorIntentGated?`checked`:``} /> Return Anchor responds to intention</label>`),n===`recall`&&(r=`
    <label>Recall on arrival<textarea name="onArrival" rows="6">${G(t.recall.onArrival)}</textarea></label><label>Recall on return<textarea name="onReturn" rows="6">${G(t.recall.onReturn)}</textarea></label><label>Chosen surprise or selective forgetting<textarea name="selectiveForgetting" rows="7">${G(t.recall.selectiveForgetting)}</textarea></label>`),n===`companion`&&(r=`
    <label class="checkbox"><input name="enabled" type="checkbox" ${t.companion.enabled?`checked`:``} /> This world has a companion interface</label><div class="grid two compact-grid"><label>Name<input name="name" value="${K(t.companion.name)}" /></label><label>Form<input name="form" value="${K(t.companion.form)}" /></label></div><label>Role and gifts<textarea name="role" rows="5">${G(t.companion.role)}</textarea></label><label>Communication style<textarea name="communication" rows="5">${G(t.companion.communication)}</textarea></label><label>Agency and consent<textarea name="agency" rows="6">${G(t.companion.agency)}</textarea></label><label>Continuity notes<textarea name="notes" rows="6">${G(t.companion.notes)}</textarea></label><p class="callout">The companion profile is complete and local. A live model remains an optional adapter, never an identity substitute.</p>`),n===`theme`&&(r=`
    <div class="grid two compact-grid"><label>Background colour<input name="background" type="color" value="${K(t.theme.background)}" /></label><label>Panel colour<input name="panel" type="color" value="${K(t.theme.panel)}" /></label><label>Primary accent<input name="accent" type="color" value="${K(t.theme.accent)}" /></label><label>Secondary accent<input name="secondary" type="color" value="${K(t.theme.secondary)}" /></label><label>Text colour<input name="text" type="color" value="${K(t.theme.text)}" /></label></div><label>Background image URL or local file URI<input name="backgroundImage" value="${K(t.theme.backgroundImage)}" /></label><label class="checkbox"><input name="lowMotion" type="checkbox" ${t.theme.lowMotion?`checked`:``} /> Use low-motion presentation for this world</label>`),`<section class="section-heading"><div><p class="eyebrow">${G(t.name)}</p><h1>${G(Z(e))}</h1></div><button class="quiet" data-room="portal">Return to portal</button></section><section class="panel"><form id="world-section-form" data-section="${K(n)}" class="stack">${r}<button type="submit">Save ${G(Z(e))}</button></form></section>`}function Ve(e){let t=P.records[e]||[],n=R[e];return t.find(e=>e.id===n)||null}function He(e,t){let[n,r,i,a,o]=e,s=t?.[n]||``;return i===`textarea`?`<label>${G(r)}<textarea name="${K(n)}" rows="6" ${a?`required`:``}>${G(s)}</textarea></label>`:i===`select`?`<label>${G(r)}<select name="${K(n)}">${o.map(e=>`<option ${e===s?`selected`:``}>${G(e)}</option>`).join(``)}</select></label>`:`<label>${G(r)}<input name="${K(n)}" type="${K(i)}" value="${K(s)}" ${a?`required`:``} /></label>`}function Ue(e,t){let n=e?.attachments||[];return`<section class="attachment-box"><div class="section-heading compact-heading"><div><h3>Local files</h3><p class="muted">Copied into Arcsweep's private data store.</p></div><button type="button" class="quiet" data-action="add-attachments" data-room-id="${K(t)}" ${e?``:`disabled`}>Add files</button></div>${e?n.length?`<div class="attachment-list">${n.map(n=>`<div class="attachment-row"><button type="button" class="attachment-open" data-action="open-attachment" data-room-id="${K(t)}" data-record-id="${K(e.id)}" data-attachment-id="${K(n.id)}">${G(n.name)}</button><span>${Number(n.size||0).toLocaleString()} bytes</span><button type="button" class="icon-inline danger" data-action="remove-attachment" data-room-id="${K(t)}" data-record-id="${K(e.id)}" data-attachment-id="${K(n.id)}" aria-label="Remove ${K(n.name)}">×</button></div>`).join(``)}</div>`:`<p class="muted">No local files attached.</p>`:`<p class="muted">Save the entry before adding files.</p>`}</section>`}function We(e){let t=d[e],n=q(),r=(P.records[e]||[]).filter(e=>e.worldId===n.id),i=Ve(e),a=e===`ingest`,o=a&&i?.canonBoundary===`Committed to canon`,s=a&&i&&!o&&(i.canonBoundary===`Candidate for Steward review`||i.reviewStatus===`Canon candidate`),c=a&&i?o?`<p class="commit-badge">✦ Committed to canon${i.canonisedAt?` · `+new Date(i.canonisedAt).toLocaleDateString():``}</p><button type="button" class="quiet" data-action="edit-canon-script" data-ingest-id="${K(i.id)}">Edit canon script →</button>`:s?`<button type="button" class="steward-commit" data-action="commit-to-canon" data-room-id="${K(e)}" data-record-id="${K(i.id)}">Commit to canon ✦</button>`:``:``,l=e=>G(a?e.reviewStatus||e.canonBoundary||`Non-canon intake`:e.date||e.status||e.category||`Local record`);return`<section class="section-heading"><div><p class="eyebrow">${G(n.name)} · ${G(t.category)}</p><h1>${G(t.label)}</h1><p class="lede">${G(t.description)}</p></div><button data-action="new-record" data-room-id="${K(e)}">New entry</button></section>
    <section class="split-layout"><aside class="panel item-list">${r.length?r.map(t=>`<button class="item-card ${t.id===i?.id?`active`:``}" data-record-room="${K(e)}" data-record-id="${K(t.id)}"><strong>${G(t.title||`Untitled`)}</strong><span>${l(t)}</span></button>`).join(``):`<p class="muted">No entries in this world yet.</p>`}</aside>
    <article class="panel"><form id="record-form" data-room-id="${K(e)}" class="stack"><input type="hidden" name="id" value="${K(i?.id||``)}" />${t.fields.map(e=>He(e,i)).join(``)}${t.attachments?Ue(i,e):``}<div class="button-row"><button type="submit">${i?`Save entry`:`Create entry`}</button>${i?`<button type="button" class="quiet danger" data-action="delete-record" data-room-id="${K(e)}" data-record-id="${K(i.id)}">Delete</button>`:``}${c}</div></form></article></section>`}function Ge(){let e=q(),t=P.scripts.filter(t=>t.worldId===e.id||t.world===e.name),n=t.find(e=>e.id===L)||t[0]||null;return`<section class="section-heading"><div><p class="eyebrow">${G(e.name)} · world architecture</p><h1>Scripts</h1></div><button data-action="new-script">New script</button></section><section class="split-layout"><aside class="panel item-list">${t.map(e=>`<button class="item-card ${e.id===n?.id?`active`:``}" data-script-id="${K(e.id)}"><strong>${G(e.name)}</strong><span>${G(e.status)}</span></button>`).join(``)||`<p class="muted">No scripts for this world.</p>`}</aside><article class="panel">${n?`<form id="script-form" class="stack"><input type="hidden" name="id" value="${K(n.id)}" /><label>Name<input name="name" value="${K(n.name)}" required /></label><label>Status<select name="status">${[`Draft I`,`In Review`,`Canon`].map(e=>`<option ${n.status===e?`selected`:``}>${e}</option>`).join(``)}</select></label><label>Reference script<textarea name="content" rows="28">${G(n.content)}</textarea></label><div class="button-row"><button type="submit">Save script</button><button type="button" class="quiet danger" data-action="delete-script" data-id="${K(n.id)}">Delete</button></div></form>`:`<p>Create a script to begin.</p>`}</article></section>`}function Ke(){return`<section class="section-heading"><div><p class="eyebrow">Waking Thread</p><h1>Continuity Log</h1></div></section><section class="grid two continuity-grid"><article class="panel"><h2>Add a thread entry</h2><form id="continuity-form" class="stack"><label>Title<input name="title" required /></label><label>Source<select name="source"><option>Self-entered</option><option>Trusted person</option><option>Calendar</option><option>Imported note</option><option>Other</option></select></label><label>Details<textarea name="details" rows="8" required></textarea></label><button type="submit">Add to Waking Thread</button></form></article><article class="panel timeline"><h2>Thread</h2>${P.continuity.length?P.continuity.map(e=>`<article class="timeline-entry"><div><strong>${G(e.title)}</strong><span>${new Date(e.createdAt).toLocaleString()} · ${G(e.source)}</span></div><p>${G(e.details)}</p><button class="icon-button" data-action="delete-continuity" data-id="${K(e.id)}" aria-label="Delete ${K(e.title)}">×</button></article>`).join(``):`<p class="muted">The Waking Thread is quiet.</p>`}</article></section>`}function qe(){return`<section class="section-heading"><div><p class="eyebrow">Pattern into craft</p><h1>Forge</h1></div></section><section class="grid two"><article class="panel"><form id="forge-form" class="stack"><label>Desired condition<input name="intention" required /></label><label>Why it matters<textarea name="meaning" rows="4"></textarea></label><label>Next practical action<textarea name="action" rows="4"></textarea></label><label>Evidence or symbolic markers<textarea name="markers" rows="4"></textarea></label><button type="submit">Add forge working</button></form></article><article class="panel working-list"><h2>Workings</h2>${P.manifestations.length?P.manifestations.map(e=>`<article class="working-card"><div class="working-head"><strong>${G(e.intention)}</strong><select data-action="forge-status" data-id="${K(e.id)}">${[`Seeded`,`In Motion`,`Received`,`Released`].map(t=>`<option ${e.status===t?`selected`:``}>${t}</option>`).join(``)}</select></div>${e.meaning?`<p><b>Meaning:</b> ${G(e.meaning)}</p>`:``}${e.action?`<p><b>Next action:</b> ${G(e.action)}</p>`:``}${e.markers?`<p><b>Markers:</b> ${G(e.markers)}</p>`:``}<button class="icon-button" data-action="delete-forge" data-id="${K(e.id)}">×</button></article>`).join(``):`<p class="muted">No workings yet.</p>`}</article></section>`}function Je(){let e=J();return`<section class="section-heading"><div><p class="eyebrow">${G(e.name)}</p><h1>Applet Deck</h1></div></section><section class="panel"><form id="applet-form" class="stack"><div class="applet-manager">${s.map(t=>{let n=e.applets.find(e=>e.id===t.id)||{visible:!1,order:0,customLabel:``,customGlyph:``};return`<article class="applet-editor"><label class="checkbox"><input type="checkbox" name="visible:${K(t.id)}" ${n.visible?`checked`:``} /> ${G(t.label)}</label><label>Label<input name="label:${K(t.id)}" value="${K(n.customLabel)}" placeholder="${K(t.label)}" /></label><label>Glyph<input name="glyph:${K(t.id)}" value="${K(n.customGlyph)}" placeholder="${K(t.glyph)}" /></label><label>Order<input name="order:${K(t.id)}" type="number" value="${n.order}" /></label></article>`}).join(``)}</div><button type="submit">Save applet deck</button></form></section>`}function Ye(){let e=M();return`<section class="section-heading"><div><p class="eyebrow">Local controls</p><h1>Settings & Recovery</h1></div></section><section class="grid two"><article class="panel"><form id="settings-form" class="stack"><label>Waking label<input name="crLabel" value="${K(P.settings.crLabel)}" /></label><label>World label<input name="drLabel" value="${K(P.settings.drLabel)}" /></label><label>Return Anchor<input name="returnAnchor" value="${K(P.settings.returnAnchor)}" /></label><label class="checkbox"><input name="reduceMotion" type="checkbox" ${P.settings.reduceMotion?`checked`:``} /> Reduce motion</label><label class="checkbox"><input name="largeText" type="checkbox" ${P.settings.largeText?`checked`:``} /> Larger interface text</label><label class="checkbox"><input name="highContrast" type="checkbox" ${P.settings.highContrast?`checked`:``} /> High contrast</label><label>Text scale<input name="fontScale" type="range" min="0.9" max="1.5" step="0.05" value="${P.settings.fontScale||1}" /></label><button type="submit">Save settings</button></form></article><article class="panel stack"><h2>Native storage</h2><dl class="facts"><div><dt>Mode</dt><dd>${G(V?.mode||`Loading`)}</dd></div><div><dt>Data directory</dt><dd class="path-value">${G(V?.dataDirectory||`Browser development fallback`)}</dd></div><div><dt>Version</dt><dd>${G(V?.version||P.version)}</dd></div></dl><div class="button-row"><button data-action="export">Export archive</button><button class="quiet" data-action="import">Import archive</button>${e?`<button class="quiet" data-action="show-data-folder">Open data folder</button><button class="quiet" data-action="create-backup">Create backup</button>`:`<label class="file-button">Import JSON<input id="browser-import" type="file" accept="application/json,.json" /></label>`}</div><h3>Recovery snapshots</h3>${e?H.length?`<div class="backup-list">${H.map(e=>`<div class="backup-row"><span><strong>${G(e.name)}</strong><small>${new Date(e.modifiedAt).toLocaleString()} · ${Number(e.size).toLocaleString()} bytes</small></span><button class="quiet" data-action="restore-backup" data-backup-name="${K(e.name)}">Restore</button></div>`).join(``)}</div>`:`<p class="muted">No backups yet. They are created automatically before state replacement.</p>`:`<p class="muted">The installed Windows edition uses atomic files, attachments, and recovery snapshots. Browser mode is retained only for development.</p>`}</article></section>`}function Xe(){return z?`<div class="modal-backdrop"><section class="return-dialog" role="dialog" aria-modal="true" aria-labelledby="return-title"><p class="eyebrow">${G(P.settings.returnAnchor)}</p><h2 id="return-title">Return to the ${G(P.settings.crLabel)}</h2><ol><li>Name yourself.</li><li>Feel the support beneath your body.</li><li>Notice three present sensory facts.</li><li>Move fingers and toes.</li><li>Choose to close the active arc.</li></ol><div class="button-row"><button data-action="complete-return">I am here · Close arc</button><button class="quiet" data-action="cancel-return">Continue arc</button></div></section></div>`:``}async function Ze(){if(!W){W=!0,B=`Reading field…`,Q();try{let e=await fetch(`https://singsenochian.github.io/Flameclyffe/data/deep-current.json`);if(!e.ok)throw Error(`${e.status} ${e.statusText}`);U=await e.json(),B=`Field data received.`}catch(e){e.message,B=`Field unavailable: ${e.message}`}finally{W=!1,Q()}}}function Qe(){let e=U?.generated_at?new Date(U.generated_at):null,t=e?e.toLocaleString():``,n=U?.location?.label||``,r=`<section class="section-heading">
    <div>
      <p class="eyebrow">Ambient instrument</p>
      <h1>Field · DEEP Observer</h1>
      <p class="lede">${t?G(t)+(n?` · `+G(n):``):`Symbolic field state from weather, space weather, and moon.`}</p>
    </div>
    <button data-action="refresh-deep"${W?` disabled`:``}>↻ Refresh</button>
  </section>`;if(W&&!U)return r+`<section class="panel"><p class="muted">Reading field…</p></section>`;if(!U)return r+`<section class="panel">
    <p>The DEEP Observer reads ambient field conditions from weather data, space weather feeds, and lunar position. Data is cached on GitHub Pages and updated on a schedule.</p>
    <button data-action="refresh-deep">Read field now</button>
  </section>`;let i=U.field||{},a=U.weather?.current||{},o=U.space_weather||{},s=U.moon||{},c=U.weather?.sky||``;function l([e,t,n,r]){let a=i[e],o=a==null?null:Number(a),s=o===null?0:Math.round(o*100),c=o===null?`—`:o.toFixed(3);return`<article class="panel deep-channel">
      <div class="deep-channel-header">
        <span class="deep-letter" aria-hidden="true">${G(e)}</span>
        <div><strong>${G(t)}</strong><span class="muted">${G(n)}</span></div>
        <span class="deep-value${o===null?` muted`:``}">${G(c)}</span>
      </div>
      <div class="deep-bar-track"><div class="deep-bar-fill" data-ch="${K(e)}" style="width:${s}%"></div></div>
      <code class="deep-formula">${G(r)}</code>
    </article>`}let u=Me.map(l).join(``),d=o.kp?.value??`—`,f=o.solar_wind?.bz??`—`,p=o.solar_wind?.speed??`—`,ee=o.solar_wind?.bt??`—`,te=a.cloud_cover??`—`,m=a.precipitation??`—`,ne=a.relative_humidity_2m??`—`,re=a.wind_speed_10m??`—`,ie=a.pressure_msl??`—`,ae=a.temperature_2m??`—`,h=`<section class="grid two">
    <article class="panel">
      <p class="eyebrow">Atmosphere · ${G(c)}</p>
      <dl class="facts">
        <div><dt>Pressure</dt><dd>${G(String(ie))} hPa</dd></div>
        <div><dt>Cloud cover</dt><dd>${G(String(te))} %</dd></div>
        <div><dt>Precipitation</dt><dd>${G(String(m))} in/hr</dd></div>
        <div><dt>Humidity</dt><dd>${G(String(ne))} %</dd></div>
        <div><dt>Wind speed</dt><dd>${G(String(re))} mph</dd></div>
        <div><dt>Temperature</dt><dd>${G(String(ae))} °F</dd></div>
      </dl>
    </article>
    <article class="panel">
      <p class="eyebrow">Space weather · Moon</p>
      <dl class="facts">
        <div><dt>Kp index</dt><dd>${G(String(d))}</dd></div>
        <div><dt>Bz (IMF)</dt><dd>${G(String(f))} nT</dd></div>
        <div><dt>Bt (IMF)</dt><dd>${G(String(ee))} nT</dd></div>
        <div><dt>Solar wind</dt><dd>${G(String(p))} km/s</dd></div>
        <div><dt>Moon phase</dt><dd>${G(s.name||`—`)} · ${G(String(s.illumination??`—`))}%</dd></div>
        <div><dt>Lunar age</dt><dd>${G(String(s.age_days??`—`))} days</dd></div>
      </dl>
    </article>
  </section>`,g=i.dpdt,oe=g==null?`—`:Number(g).toFixed(3),_=`<section class="panel">
    <h2>Mathematics spine</h2>
    <div class="deep-spine">
      ${Me.map(([e,t,,n])=>{let r=i[e],a=r==null?`—`:Number(r).toFixed(3);return`<div class="deep-spine-row">
      <span class="deep-letter small">${G(e)}</span>
      <span>${G(t)}</span>
      <code class="deep-formula">${G(n)}</code>
      <span class="deep-spine-val">${G(a)}</span>
    </div>`}).join(``)}
      <div class="deep-spine-row">
        <span class="deep-letter small">∂</span>
        <span>Rate of change</span>
        <code class="deep-formula">dpdt = R (current placeholder)</code>
        <span class="deep-spine-val">${G(oe)}</span>
      </div>
    </div>
    <p class="muted" style="margin-top:1rem;font-size:.8rem">Observed, not proof. Computed from Open-Meteo and NOAA SWPC feeds at source time above.</p>
  </section>`;return r+`<section class="deep-channels">${u}</section>`+h+_}function $e(){return F===`portal`?Re():F===`worlds`?ze():F===`scripts`?Ge():F===`waking-thread`?Ke():F===`forge`?qe():F===`settings`?Ye():F===`applet-deck`?Je():F===`deep-observer`?Qe():d[F]?We(F):f[F]||F===`appearance`?Be(F):Re()}function Q(){Ne();let e=q();N.innerHTML=`<div class="app-shell"><aside class="sidebar"><div class="brand"><span class="brand-mark">⌁</span><div><strong>Arcsweep</strong><small>Hearthgate</small></div></div><nav aria-label="Primary Arcsweep rooms">${je.map(([e,t,n])=>Pe(e,t,n)).join(``)}</nav><div class="sidebar-world"><span>Active portal</span><strong>${G(e.name)}</strong><button class="quiet mini" data-room="applet-deck">Arrange applets</button></div><p class="privacy-seal">${M()?`Native local store`:`Browser development mode`}<br />No automatic upload</p></aside><main class="content">${$e()}<p class="notice" role="status">${G(B)}</p></main>${Xe()}</div>`}function $(e){return Object.fromEntries(new FormData(e).entries())}function et(e,t){let n=J(),r=$(t);e===`about`&&Object.assign(n,{name:r.name.trim()||`Untitled World`,kind:r.kind.trim(),description:r.description.trim(),history:r.history.trim(),rules:r.rules.trim()}),e===`summon`&&Object.assign(n.surface,{type:r.type,name:r.surfaceName.trim()||`Arcsweep`,appearance:r.appearance.trim(),summonMode:r.summonMode,summonCue:r.summonCue.trim()}),e===`veil`&&Object.assign(n.surface,{veilEnabled:t.elements.veilEnabled.checked,visibility:r.visibility,approvedPeople:r.approvedPeople.trim()}),e===`time`&&Object.assign(n.time,{wakingMinutes:Number(r.wakingMinutes)||60,worldMinutes:Number(r.worldMinutes)||10080,pauseWhenAway:t.elements.pauseWhenAway.checked,arrivalDate:r.arrivalDate.trim(),arrivalTime:r.arrivalTime.trim()}),e===`arrival`&&Object.assign(n.arrival,{location:r.location.trim(),context:r.context.trim(),memories:r.memories.trim(),orientation:r.orientation.trim(),wrpProfileId:r.wrpProfileId.trim(),wrpLabel:r.wrpLabel.trim(),wrpRunaUrl:r.wrpRunaUrl.trim()}),e===`identity`&&Object.assign(n.identity,{name:r.name.trim(),pronouns:r.pronouns.trim(),age:r.age.trim(),roles:r.roles.trim(),form:r.form.trim(),sensorySignature:r.sensorySignature.trim(),appearance:r.appearance.trim(),accessibility:r.accessibility.trim(),notes:r.notes.trim()}),e===`competencies`&&Object.assign(n.competencies,{languages:r.languages.trim(),worldSystems:r.worldSystems.trim(),movement:r.movement.trim(),socialContext:r.socialContext.trim(),accessibility:r.accessibility.trim()}),e===`safety`&&Object.assign(n.safetyWeave,{general:r.general.trim(),exclusions:r.exclusions.trim(),returnAlwaysAvailable:t.elements.returnAlwaysAvailable.checked,anchorIntentGated:t.elements.anchorIntentGated.checked}),e===`recall`&&Object.assign(n.recall,{onArrival:r.onArrival.trim(),onReturn:r.onReturn.trim(),selectiveForgetting:r.selectiveForgetting.trim()}),e===`companion`&&Object.assign(n.companion,{enabled:t.elements.enabled.checked,name:r.name.trim(),form:r.form.trim(),role:r.role.trim(),communication:r.communication.trim(),agency:r.agency.trim(),notes:r.notes.trim()}),e===`theme`&&Object.assign(n.theme,{background:r.background,panel:r.panel,accent:r.accent,secondary:r.secondary,text:r.text,backgroundImage:r.backgroundImage.trim(),lowMotion:t.elements.lowMotion.checked}),n.updatedAt=o(),Y(`${Z(F)} saved.`,`world-${e}`)}N.addEventListener(`click`,async e=>{let t=e.target.closest(`[data-room]`);if(t){F=t.dataset.room,F===`deep-observer`&&!U&&!W&&Ze(),Q();return}let n=e.target.closest(`[data-world-id]`);if(n){I=n.dataset.worldId,Q();return}let r=e.target.closest(`[data-script-id]`);if(r){L=r.dataset.scriptId,Q();return}let a=e.target.closest(`[data-record-room]`);if(a){R[a.dataset.recordRoom]=a.dataset.recordId,Q();return}let s=e.target.closest(`[data-action]`);if(!s)return;let{action:c,id:l}=s.dataset;if(c===`open-wrp`){let e=q()?.arrival?.wrpRunaUrl;e&&window.open(e,`_blank`,`noopener,noreferrer`);return}if(c===`refresh-deep`){U=null,W=!1,Ze();return}if(c===`open-return`&&(z=!0),c===`cancel-return`&&(z=!1),c===`complete-return`&&(P.returnHistory=[i(P),...P.returnHistory].slice(0,100),P.session={active:!1,startedAt:null,targetWorldId:null,targetWorld:``,intention:``,wakingMinutes:null,worldMinutes:null},z=!1,Y(`Arc closed. Orientation restored.`,`return`)),c===`new-world`){let e=v(O(`world`));e.name=`Untitled World`,P.worlds.unshift(e),P.activeWorldId=e.id,I=e.id,Y(`New world portal created.`,`new-world`)}if(c===`set-active-world`&&(P.activeWorldId=l,I=l,Y(`Active portal changed.`,`active-world`)),c===`delete-world`&&(P.worlds.length===1?B=`Arcsweep keeps one world portal in the registry.`:(P.worlds=P.worlds.filter(e=>e.id!==l),P.activeWorldId===l&&(P.activeWorldId=P.worlds[0].id),I=P.activeWorldId,Y(`World portal deleted.`,`delete-world`))),c===`new-script`){let e=q(),t={id:O(`script`),name:`Untitled DR Script`,worldId:e.id,world:e.name,status:`Draft I`,content:`Identity:
Embodiment:
World:
Home and daily life:
Relationships:
Abilities:
Arrival:
Return:`,updatedAt:o()};P.scripts.unshift(t),L=t.id,Y(`New script created.`,`new-script`)}if(c===`delete-script`&&(P.scripts=P.scripts.filter(e=>e.id!==l),L=P.scripts[0]?.id||null,Y(`Script deleted.`,`delete-script`)),c===`delete-continuity`&&(P.continuity=P.continuity.filter(e=>e.id!==l),Y(`Waking Thread entry deleted.`,`delete-thread`)),c===`delete-forge`&&(P.manifestations=P.manifestations.filter(e=>e.id!==l),Y(`Forge working deleted.`,`delete-forge`)),c===`new-record`&&(R[s.dataset.roomId]=null),c===`delete-record`){let e=s.dataset.roomId;P.records[e]=P.records[e].filter(e=>e.id!==s.dataset.recordId),R[e]=null,Y(`Room entry deleted.`,`delete-${e}`)}if(c===`commit-to-canon`){let e=s.dataset.roomId,t=s.dataset.recordId,n=P.records[e]?.find(e=>e.id===t);if(n){n.canonBoundary=`Committed to canon`,n.reviewStatus=`Committed`,n.canonisedAt=o(),n.canonStatus=`committed`,n.updatedAt=o();let e=P.worlds.find(e=>e.id===n.worldId)||q(),t=[n.summary,n.provenanceNotes].filter(Boolean).join(`

---

`);P.scripts.unshift({id:O(`canon-script`),name:n.title,worldId:e.id,world:e.name,status:`Canon`,content:t,updatedAt:o(),formats:[`Reference Script`],ingestSourceId:n.id}),Y(`Committed to canon. Canon script created.`,`commit-canon`)}}if(c===`edit-canon-script`){let e=s.dataset.ingestId,t=P.scripts.find(t=>t.ingestSourceId===e);t?(L=t.id,F=`scripts`):B=`Canon script not found.`}if(c===`add-attachments`){let e=s.dataset.roomId,t=Ve(e);if(t){let e=await Oe();e.length&&(t.attachments=[...t.attachments||[],...e],Y(`${e.length} local file${e.length===1?``:`s`} added.`,`attachment-add`))}}if(c===`open-attachment`){let e=(P.records[s.dataset.roomId]||[]).find(e=>e.id===s.dataset.recordId)?.attachments?.find(e=>e.id===s.dataset.attachmentId);e&&await ke(e)}if(c===`remove-attachment`){let e=(P.records[s.dataset.roomId]||[]).find(e=>e.id===s.dataset.recordId);e&&(e.attachments=(e.attachments||[]).filter(e=>e.id!==s.dataset.attachmentId),Y(`Attachment reference removed.`,`attachment-remove`))}if(c===`export`&&(B=(await Te(P))?.canceled?`Export cancelled.`:`Arcsweep archive exported.`),c===`import`){let e=await k();e&&(P=e,I=P.activeWorldId,F=`portal`,Y(`Arcsweep archive imported.`,`import`),V=await A(),H=await j())}if(c===`show-data-folder`&&await Ae(),c===`create-backup`&&(await Ee(`manual`),H=await j(),B=`Recovery snapshot created.`),c===`restore-backup`){let e=await De(s.dataset.backupName);e&&(P=e,I=P.activeWorldId,F=`portal`,H=await j(),B=`Recovery snapshot restored.`)}Q()}),N.addEventListener(`change`,async e=>{let t=e.target.closest(`[data-action="forge-status"]`);if(t){let e=P.manifestations.find(e=>e.id===t.dataset.id);e&&(e.status=t.value),Y(`Forge status updated.`,`forge-status`),Q();return}if(e.target.id===`browser-import`&&e.target.files?.[0]){try{let t=await k(e.target.files[0]);t&&(P=t,I=P.activeWorldId,F=`portal`,Y(`Arcsweep archive imported.`,`browser-import`))}catch(e){B=`Import failed: ${e.message}`}Q()}}),N.addEventListener(`submit`,e=>{e.preventDefault();let t=e.target,n=$(t);if(t.id===`session-form`){let e=P.worlds.find(e=>e.id===n.targetWorldId)||q();P.activeWorldId=e.id,I=e.id,P.session={active:!0,startedAt:o(),targetWorldId:e.id,targetWorld:e.name,intention:n.intention.trim(),wakingMinutes:e.time.wakingMinutes,worldMinutes:e.time.worldMinutes},Y(`Arc begun. Return remains available.`,`begin-arc`)}if(t.id===`world-registry-form`){let e=P.worlds.find(e=>e.id===n.id);e&&(Object.assign(e,{name:n.name.trim()||`Untitled World`,kind:n.kind.trim(),description:n.description.trim(),updatedAt:o()}),Y(`World portal saved.`,`world-registry`))}if(t.id===`world-section-form`&&et(t.dataset.section,t),t.id===`script-form`){let e=P.scripts.find(e=>e.id===n.id);e&&(Object.assign(e,{name:n.name.trim()||`Untitled DR Script`,status:n.status,content:n.content,updatedAt:o()}),Y(`Script saved locally.`,`script`))}if(t.id===`continuity-form`&&(P.continuity.unshift({id:O(`thread`),title:n.title.trim(),source:n.source,details:n.details.trim(),createdAt:o()}),Y(`Entry added to the Waking Thread.`,`thread`)),t.id===`forge-form`&&(P.manifestations.unshift({id:O(`working`),intention:n.intention.trim(),meaning:n.meaning.trim(),action:n.action.trim(),markers:n.markers.trim(),status:`Seeded`,createdAt:o()}),Y(`Forge working seeded.`,`forge`)),t.id===`record-form`){let e=t.dataset.roomId,r=d[e],i=(P.records[e]||[]).find(e=>e.id===n.id);i||(i={id:O(e),worldId:q().id,createdAt:o(),attachments:[]},P.records[e].unshift(i),R[e]=i.id);for(let[e]of r.fields)i[e]=String(n[e]||``).trim();i.updatedAt=o(),Y(`${r.label} entry saved.`,`room-${e}`)}if(t.id===`applet-form`){let e=J();e.applets=s.map((e,r)=>({id:e.id,visible:t.elements[`visible:${e.id}`]?.checked||!1,customLabel:String(n[`label:${e.id}`]||``).trim(),customGlyph:String(n[`glyph:${e.id}`]||``).trim(),order:Number(n[`order:${e.id}`])||r})),Y(`Applet deck saved.`,`applets`)}t.id===`settings-form`&&(P.settings={...P.settings,crLabel:n.crLabel.trim()||`Waking World`,drLabel:n.drLabel.trim()||`Desired Reality`,returnAnchor:n.returnAnchor.trim()||`Notch`,reduceMotion:t.elements.reduceMotion.checked,largeText:t.elements.largeText.checked,highContrast:t.elements.highContrast.checked,fontScale:Number(n.fontScale)||1},Y(`Settings saved.`,`settings`)),Q()}),setInterval(()=>{let e=document.querySelector(`#waking-now`),t=document.querySelector(`#waking-elapsed`),n=document.querySelector(`#world-elapsed`);if(e&&(e.textContent=new Date().toLocaleString()),t&&n){let e=Fe();t.textContent=r(e.waking),n.textContent=r(e.world)}},1e3),Q();