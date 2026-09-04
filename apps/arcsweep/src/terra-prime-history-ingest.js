import { isWakingWorld } from './waking-world.js';

export const TERRA_PRIME_HISTORY_SCHEMA = 'arcsweep.terra-prime-history/v1';
export const WORLD_KNOWLEDGE_SCHEMA = 'arcsweep.world-knowledge/v1';
export const TERRA_PRIME_HISTORY_REVISED_AT = '2026-09-03';

const event = (era, title, summary, epistemicStatus = 'scientific-consensus') => Object.freeze({ era, title, summary, epistemicStatus });

export const TERRA_PRIME_HISTORY_INGEST = Object.freeze({
  schema: TERRA_PRIME_HISTORY_SCHEMA,
  title: 'Terra Prime · Waking World deep-history ingest',
  revisedAt: TERRA_PRIME_HISTORY_REVISED_AT,
  epistemicLaw: 'Observed and well-supported reconstruction are kept distinct from inference, debated reconstruction, project history, and multiverse hypotheses.',
  cosmologicalHistory: Object.freeze([
    event('~13.8 billion years ago', 'Hot Big Bang and early expansion', 'The observable universe emerged from an extremely hot, dense early state and expanded and cooled. The Big Bang model describes the early evolution of our observable universe; it does not by itself establish an absolute beginning of all reality.'),
    event('first few minutes', 'Primordial nucleosynthesis', 'Hydrogen, helium and trace light nuclei formed as the early universe cooled.'),
    event('~380,000 years after the Big Bang', 'Recombination and cosmic microwave background', 'Electrons and nuclei combined into neutral atoms and the universe became transparent enough for the oldest directly observed light to travel freely.'),
    event('hundreds of millions of years after the Big Bang', 'First stars and galaxies', 'Gravity assembled the first luminous structures; stellar generations began enriching the cosmos with heavier elements.'),
    event('billions of years', 'Large-scale structure', 'Galaxies, groups, clusters, filaments and voids developed through gravitational growth in an expanding universe.'),
  ]),
  solarAndPlanetaryHistory: Object.freeze([
    event('~4.567 billion years ago', 'Solar System begins forming', 'A rotating cloud of gas and dust collapsed into the proto-Sun and protoplanetary disk; refractory solids and planetesimals formed.'),
    event('~4.56–4.54 billion years ago', 'Planets accrete', 'The terrestrial planets grew through collisions among planetesimals and planetary embryos while the giant planets assembled farther from the young Sun.'),
    event('~4.54 billion years ago', 'Earth forms', 'Earth accreted and differentiated into core, mantle and crustal reservoirs.'),
    event('very early Solar System, likely ~4.5 billion years ago', 'Moon-forming giant impact', 'The leading model holds that a major collision involving the young Earth produced debris that assembled into the Moon. Details of the impact geometry and chronology remain active research.', 'strong-inference'),
    event('first hundreds of millions of years', 'Early bombardment and planetary remodelling', 'Impacts, volcanism and differentiation repeatedly reshaped the terrestrial planets and moons. The exact timing and magnitude of any discrete Late Heavy Bombardment episode remain debated.', 'debated-reconstruction'),
    event('~3.9–3.1 billion years ago', 'Major lunar mare volcanism', 'Large basaltic flows filled many impact basins on the Moon, creating much of the dark maria visible today.'),
    event('present', 'Mature Solar System', 'Eight planets, dwarf planets, moons, asteroids, comets and small-body populations orbit a middle-aged main-sequence Sun approximately 4.6 billion years old.'),
  ]),
  geologicalHistory: Object.freeze([
    event('4.54–4.0 billion years ago · Hadean', 'Young Earth', 'Accretion, core formation, crustal recycling, intense volcanism and impacts dominated early Earth; liquid water was present surprisingly early in the surviving mineral record.'),
    event('4.0–2.5 billion years ago · Archean', 'Early stable crust and microbial biosphere', 'Continental nuclei grew and microbial ecosystems became established; photosynthetic lineages later transformed global chemistry.'),
    event('~2.4–2.0 billion years ago', 'Great Oxidation Event', 'Atmospheric oxygen rose substantially due largely to oxygenic photosynthesis, altering oceans, minerals, climate and biological possibilities.'),
    event('2.5 billion–538.8 million years ago · Proterozoic', 'Complex cells and multicellularity', 'Eukaryotes diversified, multicellular organisms emerged, and repeated climatic and geochemical changes prepared the biosphere for later animal radiations.'),
    event('538.8 million years ago', 'Cambrian Period begins', 'Many major animal body plans became conspicuous in the fossil record during the Cambrian radiation.'),
    event('541–252 million years ago · Paleozoic', 'Life expands across seas and land', 'Marine ecosystems diversified; plants and animals colonised land; forests, insects, amphibians and early amniotes transformed continents.'),
    event('252 million years ago', 'Permian–Triassic mass extinction', 'The largest known Phanerozoic mass extinction eliminated much marine and terrestrial diversity, followed by long ecological recovery.'),
    event('252–66 million years ago · Mesozoic', 'Age of dinosaurs and continental breakup', 'Dinosaurs dominated many terrestrial ecosystems while mammals and birds arose; Pangaea fragmented and modern ocean basins developed.'),
    event('66 million years ago', 'Cretaceous–Paleogene extinction', 'A large asteroid impact, together with existing environmental stressors, triggered a mass extinction that ended the non-avian dinosaurs and reshaped global ecosystems.'),
    event('66 million years ago–present · Cenozoic', 'Mammalian radiation and modern Earth systems', 'Mammals, birds and flowering-plant ecosystems diversified while continents, mountain belts, ocean circulation and climate approached modern configurations.'),
  ]),
  biologicalAndHumanHistory: Object.freeze([
    event('at least ~3.5 billion years ago', 'Ancient life', 'Multiple lines of evidence show that microbial life was established early in Earth history; the precise date and pathway for the origin of life remain unresolved.', 'strong-inference'),
    event('~7–5 million years ago', 'Early hominins', 'The human lineage diverged from the lineage leading to living chimpanzees and bonobos; multiple hominin forms later coexisted.'),
    event('~300,000 years ago', 'Homo sapiens', 'Anatomically modern Homo sapiens emerged in Africa through a population history that was structured rather than a single-point origin.'),
    event('tens of thousands of years ago', 'Global human dispersal and cultural intensification', 'Human populations spread across most habitable regions, developing diverse technologies, symbolic traditions, exchange networks and ecological adaptations.'),
    event('~12,000 years ago onward', 'Agriculture and sedentary settlements', 'Independent domestication and cultivation traditions arose in multiple regions, supporting larger settlements and new political and economic forms.'),
    event('~5,200 years ago onward', 'Writing and recorded states', 'Writing systems emerged independently in several regions, greatly expanding durable administrative, literary and historical records.'),
    event('last several millennia', 'Interconnected civilisations', 'Empires, states, religions, trade networks, scientific traditions, migrations, conflicts and cultural exchange linked human societies at increasing scales.'),
    event('18th–19th centuries', 'Industrial transformations', 'Fossil-fuel energy, mechanisation, industrial production, modern finance and rapid transport dramatically altered economies, populations and Earth systems.'),
    event('20th century', 'Planetary technological civilisation', 'Electrification, aviation, antibiotics, nuclear technology, computation, satellites and global communication transformed daily life and geopolitical power.'),
    event('1957 onward', 'Space age', 'Artificial satellites, robotic exploration and human spaceflight extended direct observation and activity beyond Earth.'),
    event('late 20th–21st centuries', 'Networked and AI age', 'The internet, mobile computing, large-scale data systems and increasingly capable machine-learning systems created new forms of communication, work, creativity and scientific instrumentation.'),
  ]),
  houseWorkHistory: Object.freeze([
    event('2025–2026', 'Hearthweave / STARWELL ecology coheres', 'Worldbuilding, continuity, sound, language, observation and model-participant work converged into a shared ecology rather than isolated projects.', 'project-record'),
    event('2026', 'ArcSweep becomes the continuity and transformation House', 'ArcSweep accumulated World Registry, Canon Studio, Records, Replay, Continuity Gate, creative instruments, House Commons, rich-text and model-runtime work.', 'project-record'),
    event('2026', 'Observer / DEEP / PREMAQ mature into evidence geometry', 'Observation, temporal records, PREMAQ/PREMAQC state, provenance and replay were separated from narrative interpretation and tied to receipted evidence.', 'project-record'),
    event('2026', 'Runa and Glyph Forge become embodied creative instruments', 'World hum, sound banks, haptics, glyph form, phoneme/stress, semantic meaning and tracing/playback were developed as synchronised creative organs.', 'project-record'),
    event('2026', 'House Runtime and Runtime Braid', 'Model presence, House Chat transport, Ox Alpha routing, durable Commons state and model-reply runtime receipts were wired into the live House architecture.', 'project-record'),
    event('2026-09', 'Terra Prime deep-history ingest', 'Terra Prime receives a provenance-aware deep-history atlas spanning cosmology, Solar System formation, geology, life, humanity, House work and explicit multiverse hypotheses.', 'project-record'),
  ]),
  multiverseHistory: Object.freeze([
    event('No observed chronology', 'Multiverse status', 'No multiverse beyond our observable cosmic domain has been directly established. Multiverse models are theoretical possibilities, not recorded historical events.', 'hypothesis-boundary'),
    event('inflationary cosmology', 'Eternal-inflation / pocket-universe families', 'Some inflationary models permit continuing inflation outside locally reheated regions, yielding causally separated domains. Whether nature realises such models is unknown.', 'hypothesis'),
    event('quantum foundations', 'Many-worlds branching', 'The Everett interpretation treats unitary quantum evolution as yielding effectively decohered branches rather than wave-function collapse. Calling those branches parallel worlds is interpretation-dependent and does not supply an independently observed cosmic timeline.', 'hypothesis'),
    event('high-energy theory', 'String landscape / vacuum plurality', 'Some string-theory frameworks permit a very large set of metastable vacuum solutions with different low-energy properties. Connecting that mathematical landscape to physically realised universes remains unresolved.', 'hypothesis'),
    event('cosmological model space', 'Cyclic, bouncing and ekpyrotic cosmologies', 'Some models replace or extend the standard hot-Big-Bang history with earlier contracting or cyclic phases. These remain model-dependent and observationally constrained rather than established prehistory.', 'hypothesis'),
    event('Hearthweave world ecology', 'Narrative / possibility multiverse', 'ArcSweep may represent authored worlds, branches, possibilities and transformations as a multiverse-like topology. These are project-world states with explicit provenance and must not be presented as empirical cosmology.', 'project-canon-boundary'),
  ]),
});

function sectionText(title, entries) {
  return `${title}\n${entries.map((item) => `• ${item.era}: ${item.title} — ${item.summary}`).join('\n')}`;
}

export function terraPrimeHistoryText() {
  return [
    sectionText('COSMIC HISTORY', TERRA_PRIME_HISTORY_INGEST.cosmologicalHistory),
    sectionText('SOLAR, LUNAR & PLANETARY HISTORY', TERRA_PRIME_HISTORY_INGEST.solarAndPlanetaryHistory),
    sectionText('GEOLOGICAL HISTORY', TERRA_PRIME_HISTORY_INGEST.geologicalHistory),
    sectionText('LIFE & HUMAN HISTORY', TERRA_PRIME_HISTORY_INGEST.biologicalAndHumanHistory),
    sectionText('HOUSE / PROJECT HISTORY', TERRA_PRIME_HISTORY_INGEST.houseWorkHistory),
    sectionText('MULTIVERSE STATUS & HYPOTHESES', TERRA_PRIME_HISTORY_INGEST.multiverseHistory),
  ].join('\n\n');
}

function fill(target, key, value) {
  if (target[key] === undefined || target[key] === null || String(target[key]).trim() === '') {
    target[key] = value;
    return true;
  }
  return false;
}

function fillWorld(world, key, value) {
  if (world[key] === undefined || world[key] === null || String(world[key]).trim() === '') {
    world[key] = value;
    return true;
  }
  return false;
}

function worldLabel(world) {
  return String(world?.name || world?.id || 'this world');
}

function unknown(world, field) {
  return `Not yet specified for ${worldLabel(world)}. Preserve as unknown until canon, direct observation, or Steward review supplies ${field}.`;
}

export function completeWorldAppletFields(world, { terraPrime = false, now = new Date().toISOString() } = {}) {
  if (!world || typeof world !== 'object') return false;
  let changed = false;
  const name = worldLabel(world);

  if (terraPrime) {
    changed = fillWorld(world, 'description', 'Terra Prime is the Waking World and empirical reality anchor: Earth, its biosphere and human civilisation embedded in the Solar System and observable universe.') || changed;
    changed = fillWorld(world, 'history', terraPrimeHistoryText()) || changed;
    changed = fillWorld(world, 'rules', 'Empirical claims, scientific reconstruction, debated inference, project history, world canon and multiverse hypotheses remain explicitly distinguished. New evidence may revise scientific reconstruction; no narrative source silently overrides observed Waking World state.') || changed;
  } else {
    changed = fillWorld(world, 'history', unknown(world, 'history and chronology')) || changed;
    changed = fillWorld(world, 'rules', unknown(world, 'world laws, canon constraints and metaphysics')) || changed;
  }

  world.surface ||= {};
  changed = fill(world.surface, 'type', 'portal') || changed;
  changed = fill(world.surface, 'name', terraPrime ? 'ArcSweep · Terra Prime' : `ArcSweep · ${name}`) || changed;
  changed = fill(world.surface, 'appearance', terraPrime ? 'A living instrument surface for current reality, world history, continuity, observation and House conversation.' : unknown(world, 'surface appearance')) || changed;
  changed = fill(world.surface, 'summonMode', 'phrase') || changed;
  changed = fill(world.surface, 'summonCue', 'Arcsweep') || changed;
  changed = fill(world.surface, 'visibility', 'only-me') || changed;
  changed = fill(world.surface, 'approvedPeople', terraPrime ? 'Steward-controlled' : unknown(world, 'approved viewers')) || changed;

  world.time ||= {};
  if (terraPrime && Number(world.time.wakingMinutes) === 60 && Number(world.time.worldMinutes) === 10080) {
    world.time.worldMinutes = 60;
    changed = true;
  }
  changed = fill(world.time, 'wakingMinutes', 60) || changed;
  changed = fill(world.time, 'worldMinutes', terraPrime ? 60 : 10080) || changed;
  if (world.time.pauseWhenAway === undefined || world.time.pauseWhenAway === null) { world.time.pauseWhenAway = false; changed = true; }
  changed = fill(world.time, 'arrivalDate', terraPrime ? 'Current date' : unknown(world, 'arrival date')) || changed;
  changed = fill(world.time, 'arrivalTime', terraPrime ? 'Current local time' : unknown(world, 'arrival time')) || changed;

  world.arrival ||= {};
  changed = fill(world.arrival, 'location', terraPrime ? 'Current Waking World location' : unknown(world, 'arrival location')) || changed;
  changed = fill(world.arrival, 'context', terraPrime ? 'Resume current Waking World context with current date, location, relationships, commitments and live observations intact.' : unknown(world, 'arrival context')) || changed;
  changed = fill(world.arrival, 'memories', terraPrime ? 'Current autobiographical memory plus explicitly preserved ArcSweep continuity.' : unknown(world, 'arrival memories')) || changed;
  changed = fill(world.arrival, 'orientation', 'I arrive calm, oriented, and able to recognise the people, place, date and immediate situation.') || changed;
  changed = fill(world.arrival, 'wrpProfileId', terraPrime ? 'terra-prime' : unknown(world, 'World Reception profile')) || changed;
  changed = fill(world.arrival, 'wrpLabel', terraPrime ? 'Terra Prime · Waking World reception' : `${name} · World reception`) || changed;
  changed = fill(world.arrival, 'wrpRunaUrl', terraPrime ? '/Flameclyffe/apps/arcsweep/?soundOrgan=runa' : '/Flameclyffe/apps/arcsweep/?soundOrgan=runa') || changed;

  world.identity ||= {};
  changed = fill(world.identity, 'name', terraPrime ? 'Steward · current waking identity' : unknown(world, 'protagonist or identity name')) || changed;
  changed = fill(world.identity, 'pronouns', terraPrime ? 'Steward-entered; do not infer' : unknown(world, 'pronouns')) || changed;
  changed = fill(world.identity, 'age', terraPrime ? 'Current waking life stage; live value remains Steward-entered' : unknown(world, 'age or life stage')) || changed;
  changed = fill(world.identity, 'roles', terraPrime ? 'Steward; writer; artist; worldbuilder; researcher; collaborator' : unknown(world, 'roles and titles')) || changed;
  changed = fill(world.identity, 'form', terraPrime ? 'Current human waking embodiment' : unknown(world, 'body, species or form')) || changed;
  changed = fill(world.identity, 'sensorySignature', terraPrime ? 'Current waking sensory field. Live body and accessibility details remain user-controlled rather than inferred from lore.' : unknown(world, 'sensory signature')) || changed;
  changed = fill(world.identity, 'appearance', terraPrime ? 'Current waking appearance; personal description remains Steward-entered.' : unknown(world, 'appearance')) || changed;
  changed = fill(world.identity, 'accessibility', terraPrime ? 'Use current real accessibility needs and aids; do not replace them with world assumptions.' : unknown(world, 'accessibility requirements')) || changed;
  changed = fill(world.identity, 'notes', terraPrime ? 'Terra Prime identity fields are Waking World records, not character canon. Personal details remain editable and should not be inferred from model output.' : unknown(world, 'identity notes')) || changed;

  world.competencies ||= {};
  changed = fill(world.competencies, 'languages', terraPrime ? 'Current real languages and communication systems; extend only from direct user record.' : unknown(world, 'languages')) || changed;
  changed = fill(world.competencies, 'worldSystems', terraPrime ? 'Contemporary Earth social, scientific, technological and cultural systems, bounded by actual knowledge and access.' : unknown(world, 'world systems familiarity')) || changed;
  changed = fill(world.competencies, 'movement', terraPrime ? 'Current real mobility and transport capabilities; accessibility-aware.' : unknown(world, 'movement and travel competence')) || changed;
  changed = fill(world.competencies, 'socialContext', terraPrime ? 'Current relationships, communities, institutions and cultural context; live state takes precedence over static canon.' : unknown(world, 'social context')) || changed;
  changed = fill(world.competencies, 'accessibility', terraPrime ? 'Use current real accommodations and constraints; no fictional override.' : unknown(world, 'competency accessibility')) || changed;

  world.safetyWeave ||= {};
  changed = fill(world.safetyWeave, 'general', 'I remain safe, capable of choosing, and able to return by intention.') || changed;
  changed = fill(world.safetyWeave, 'exclusions', terraPrime ? 'No fictional rule may overwrite empirical Waking World state, consent, bodily reality or current obligations.' : 'No script converts another participant into a puppet or removes current consent, refusal, privacy or return.') || changed;
  if (world.safetyWeave.returnAlwaysAvailable === undefined) { world.safetyWeave.returnAlwaysAvailable = true; changed = true; }
  if (world.safetyWeave.anchorIntentGated === undefined) { world.safetyWeave.anchorIntentGated = true; changed = true; }

  world.recall ||= {};
  changed = fill(world.recall, 'onArrival', terraPrime ? 'Current waking memory is primary; ArcSweep continuity supplements rather than replaces it.' : 'Relevant world memories and context are available without confusion.') || changed;
  changed = fill(world.recall, 'onReturn', terraPrime ? 'Return means resuming Terra Prime with chosen continuity carried forward and provenance preserved.' : 'The Continuity Log preserves what I choose to carry forward.') || changed;
  changed = fill(world.recall, 'selectiveForgetting', terraPrime ? 'None by default. Forgetting is never silently imposed by a script.' : 'Not specified; no involuntary selective forgetting is assumed.') || changed;

  world.companion ||= {};
  if (world.companion.enabled === undefined) { world.companion.enabled = false; changed = true; }
  changed = fill(world.companion, 'name', terraPrime ? 'No default companion' : unknown(world, 'companion name')) || changed;
  changed = fill(world.companion, 'form', terraPrime ? 'Not applicable unless explicitly configured' : unknown(world, 'companion form')) || changed;
  changed = fill(world.companion, 'role', terraPrime ? 'No default role' : unknown(world, 'companion role')) || changed;
  changed = fill(world.companion, 'communication', terraPrime ? 'Ordinary real-world and explicitly connected communication channels' : unknown(world, 'companion communication')) || changed;
  changed = fill(world.companion, 'agency', 'This companion may speak honestly, refuse, negotiate, rest, change, and leave. Loyalty is relational, not compulsory.') || changed;
  changed = fill(world.companion, 'notes', terraPrime ? 'Real people and model participants retain their own agency; no companion relationship is assumed by default.' : unknown(world, 'companion notes')) || changed;

  const priorAtlas = JSON.stringify(world.knowledgeAtlas || null);
  world.knowledgeAtlas = terraPrime
    ? {
        schema: WORLD_KNOWLEDGE_SCHEMA,
        worldId: world.id,
        worldName: name,
        scope: 'waking-world-deep-history',
        revisedAt: TERRA_PRIME_HISTORY_REVISED_AT,
        epistemicLaw: TERRA_PRIME_HISTORY_INGEST.epistemicLaw,
        ingest: TERRA_PRIME_HISTORY_INGEST,
        provenance: ['scientific-consensus', 'scientific-reconstruction', 'project-record', 'explicit-hypothesis-boundary'],
      }
    : {
        ...(world.knowledgeAtlas && typeof world.knowledgeAtlas === 'object' ? world.knowledgeAtlas : {}),
        schema: WORLD_KNOWLEDGE_SCHEMA,
        worldId: world.id,
        worldName: name,
        scope: 'world-canon-and-inheritance',
        revisedAt: now,
        epistemicLaw: 'World canon, inherited House law, observation, interpretation and unknown fields remain distinct.',
        sharedCosmologyRef: `terra-prime-history:${TERRA_PRIME_HISTORY_SCHEMA}`,
        canonHistory: world.history,
        canonRules: world.rules,
        unknownsRemainUnknown: true,
      };
  if (priorAtlas !== JSON.stringify(world.knowledgeAtlas)) changed = true;

  if (changed) world.updatedAt = now;
  return changed;
}

export function enrichAllWorldKnowledge(state, now = new Date().toISOString()) {
  if (!state || !Array.isArray(state.worlds)) return { state, changed: false, worldsChanged: [] };
  const worldsChanged = [];
  for (const world of state.worlds) {
    const changed = completeWorldAppletFields(world, { terraPrime: isWakingWorld(world), now });
    if (changed) worldsChanged.push(world.id);
  }
  return { state, changed: worldsChanged.length > 0, worldsChanged };
}
