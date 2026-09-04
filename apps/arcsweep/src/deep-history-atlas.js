export const DEEP_HISTORY_ATLAS_SCHEMA = 'arcsweep.deep-history-atlas/v1';

const span = (id, label, startMa, endMa, summary, provenance = 'scientific-consensus') => Object.freeze({ id, label, startMa, endMa, summary, provenance });
const body = (id, label, family, formedGa, notes, provenance = 'scientific-consensus') => Object.freeze({ id, label, family, formedGa, notes, provenance });
const node = (id, label, startYear, endYear, regions, summary, provenance = 'scientific-reconstruction') => Object.freeze({ id, label, startYear, endYear, regions, summary, provenance });

export const GEOLOGICAL_ATLAS = Object.freeze({
  schema: 'arcsweep.geological-atlas/v1',
  eons: Object.freeze([
    span('hadean', 'Hadean', 4540, 4000, 'Accretion, differentiation, early crust, intense volcanism and impacts; liquid water existed very early in surviving mineral evidence.'),
    span('archean', 'Archean', 4000, 2500, 'Stable continental nuclei expanded, microbial ecosystems flourished, and early photosynthetic metabolisms altered ocean chemistry.'),
    span('proterozoic', 'Proterozoic', 2500, 538.8, 'Atmospheric oxygen rose, eukaryotes diversified, multicellularity evolved, and repeated glaciations transformed the planet.'),
    span('phanerozoic', 'Phanerozoic', 538.8, 0, 'Abundant macroscopic fossil record, repeated radiations and extinctions, continental rearrangement, and the rise of modern ecosystems.'),
  ]),
  supercontinents: Object.freeze([
    span('vaalbara', 'Vaalbara candidate', 3600, 2800, 'A proposed Archean supercontinent or large cratonic assembly; reconstruction remains uncertain.', 'debated-reconstruction'),
    span('kenorland', 'Kenorland', 2700, 2450, 'Large late-Archean continental assembly inferred from cratonic and palaeomagnetic evidence.', 'scientific-reconstruction'),
    span('columbia', 'Columbia / Nuna', 1800, 1300, 'Long-lived Proterozoic supercontinent assembled from many older continental blocks.', 'scientific-reconstruction'),
    span('rodinia', 'Rodinia', 1100, 750, 'Neoproterozoic supercontinent whose breakup influenced ocean basins, climate and later biological evolution.', 'scientific-reconstruction'),
    span('pannotia', 'Pannotia', 620, 540, 'Short-lived late-Neoproterozoic continental configuration preceding major Paleozoic dispersal.', 'debated-reconstruction'),
    span('pangaea', 'Pangaea', 335, 175, 'Late Paleozoic to early Mesozoic supercontinent whose breakup formed much of the modern continental arrangement.'),
  ]),
  massExtinctions: Object.freeze([
    span('end-ordovician', 'End-Ordovician', 444, 443, 'Severe marine losses associated with rapid glaciation, sea-level fall and subsequent climatic change.'),
    span('late-devonian', 'Late Devonian crises', 372, 359, 'Prolonged extinction pulses affected reefs and marine ecosystems; drivers likely included ocean anoxia, climate and ecological change.', 'scientific-reconstruction'),
    span('end-permian', 'Permian–Triassic', 252.1, 251.9, 'Largest known Phanerozoic mass extinction, strongly linked to Siberian Traps volcanism, greenhouse warming, acidification and ocean deoxygenation.'),
    span('end-triassic', 'Triassic–Jurassic', 201.4, 201.2, 'Major extinction coincident with Central Atlantic Magmatic Province volcanism and rapid greenhouse forcing.'),
    span('kpg', 'Cretaceous–Paleogene', 66.05, 65.95, 'Chicxulub impact triggered abrupt global disruption, ending non-avian dinosaurs and reshaping ecosystems.'),
  ]),
  climateAndAtmosphere: Object.freeze([
    span('great-oxidation', 'Great Oxidation Event', 2400, 2000, 'Sustained atmospheric oxygen increase transformed minerals, oceans, climate and biological opportunity.'),
    span('snowball-earth', 'Cryogenian global glaciations', 720, 635, 'Multiple severe glaciations may have brought ice to low latitudes; exact spatial extent remains actively reconstructed.', 'scientific-reconstruction'),
    span('carboniferous-oxygen', 'Carboniferous high oxygen interval', 330, 300, 'Large forests, extensive carbon burial and elevated oxygen shaped terrestrial ecosystems and wildfire regimes.', 'scientific-reconstruction'),
    span('petm', 'Paleocene–Eocene Thermal Maximum', 56, 55.8, 'Rapid carbon release caused strong global warming, ocean acidification and major biotic redistribution.'),
    span('pleistocene', 'Pleistocene glacial cycles', 2.58, 0.0117, 'Orbital forcing paced repeated ice-sheet advances and retreats that strongly influenced landscapes and human evolution.'),
  ]),
  magnetic: Object.freeze([
    span('brunhes-matuyama', 'Brunhes–Matuyama reversal', 0.781, 0.78, 'Most recent full geomagnetic polarity reversal, widely used as a geological time marker.'),
    span('laschamp', 'Laschamp excursion', 0.043, 0.041, 'Short-lived geomagnetic excursion with sharply reduced field intensity but not a sustained full reversal.', 'scientific-reconstruction'),
  ]),
  impacts: Object.freeze([
    span('chicxulub', 'Chicxulub', 66.05, 65.95, 'Large asteroid impact in present-day Yucatán with global ejecta, fire, darkness and climatic disruption.'),
    span('vredefort', 'Vredefort', 2023, 2022, 'Oldest confirmed very large impact structure preserved on Earth.', 'scientific-reconstruction'),
    span('sudbury', 'Sudbury', 1849, 1848, 'Large Paleoproterozoic impact structure in present-day Canada.', 'scientific-reconstruction'),
  ]),
});

export const SOLAR_SYSTEM_FAMILY = Object.freeze({
  schema: 'arcsweep.solar-family/v1',
  root: body('protosolar-nebula', 'Protosolar nebula', 'origin-cloud', 4.567, 'Collapsing molecular-cloud material formed the proto-Sun and circumstellar disk.'),
  star: body('sun', 'Sun', 'star', 4.567, 'G-type main-sequence star containing nearly all Solar System mass.'),
  terrestrial: Object.freeze([
    body('mercury', 'Mercury', 'terrestrial-planet', 4.56, 'Metal-rich innermost planet with ancient heavily cratered terrain and large core.'),
    body('venus', 'Venus', 'terrestrial-planet', 4.56, 'Earth-sized planet with dense CO₂ atmosphere, extreme greenhouse climate and widespread volcanism.'),
    body('earth', 'Earth', 'terrestrial-planet', 4.54, 'Differentiated ocean-bearing planet with long-lived plate tectonics and known biosphere.'),
    body('moon', 'Moon', 'earth-satellite', 4.51, 'Large satellite whose leading origin model involves a giant impact and debris-disk accretion.', 'strong-inference'),
    body('mars', 'Mars', 'terrestrial-planet', 4.56, 'Cold desert planet with ancient rivers, lakes, volcanoes and evidence of a wetter early climate.'),
  ]),
  giants: Object.freeze([
    body('jupiter', 'Jupiter', 'gas-giant', 4.56, 'Largest planet; rapid early growth strongly influenced disk dynamics and small-body scattering.'),
    body('saturn', 'Saturn', 'gas-giant', 4.56, 'Gas giant with extensive rings and diverse moon system including Titan and Enceladus.'),
    body('uranus', 'Uranus', 'ice-giant', 4.56, 'Ice giant with extreme axial tilt, likely reflecting major early dynamical events.', 'scientific-reconstruction'),
    body('neptune', 'Neptune', 'ice-giant', 4.56, 'Outer ice giant whose migration is central to many models of Kuiper Belt architecture.', 'scientific-reconstruction'),
  ]),
  dwarfPlanets: Object.freeze([
    body('ceres', 'Ceres', 'dwarf-planet', 4.56, 'Largest object in the asteroid belt; differentiated, volatile-rich body.'),
    body('pluto', 'Pluto', 'dwarf-planet', 4.56, 'Large Kuiper Belt world in resonant orbit with Neptune, accompanied by Charon and smaller moons.'),
    body('eris', 'Eris', 'dwarf-planet', 4.56, 'Scattered-disk dwarf planet whose discovery helped prompt formal dwarf-planet classification.'),
    body('haumea', 'Haumea', 'dwarf-planet', 4.56, 'Rapidly rotating elongated Kuiper Belt dwarf planet with collisional family.'),
    body('makemake', 'Makemake', 'dwarf-planet', 4.56, 'Bright methane-bearing Kuiper Belt dwarf planet.'),
  ]),
  reservoirs: Object.freeze([
    body('asteroid-belt', 'Asteroid belt', 'small-body-reservoir', 4.56, 'Dynamically excited remnant population between Mars and Jupiter rather than a failed intact planet.'),
    body('kuiper-belt', 'Kuiper Belt', 'small-body-reservoir', 4.56, 'Trans-Neptunian reservoir preserving evidence of giant-planet migration.', 'scientific-reconstruction'),
    body('oort-cloud', 'Oort Cloud', 'small-body-reservoir', 4.5, 'Distant inferred comet reservoir populated by early scattering; not directly imaged as a coherent cloud.', 'strong-inference'),
  ]),
});

export const LUNAR_HISTORY = Object.freeze({
  schema: 'arcsweep.lunar-history/v1',
  phases: Object.freeze([
    span('formation', 'Formation', 4510, 4450, 'Moon accretes from impact-generated material and differentiates into core, mantle and magma ocean.', 'strong-inference'),
    span('magma-ocean', 'Magma ocean crystallisation', 4500, 4300, 'Anorthositic crust forms as buoyant plagioclase floats above crystallising mantle.', 'scientific-reconstruction'),
    span('basin-era', 'Large basin-forming impacts', 4200, 3800, 'Major impact basins excavate the crust; exact bombardment chronology remains debated.', 'debated-reconstruction'),
    span('mare-volcanism', 'Mare volcanism', 3900, 1000, 'Basaltic lavas flood many nearside basins, with activity extending much later than once assumed.', 'scientific-reconstruction'),
    span('tidal-evolution', 'Long tidal evolution', 4500, 0, 'Earth–Moon tidal exchange slows Earth rotation while the Moon gradually recedes; orbital architecture evolves continuously.', 'scientific-reconstruction'),
    span('apollo', 'Apollo human exploration', 0.000057, 0.000051, 'Six crewed lunar landings between 1969 and 1972 returned samples and deployed instruments.', 'project-record'),
    span('robotic-modern', 'Modern robotic exploration', 0.00004, 0, 'International orbiters, landers and sample-return missions map composition, ice, gravity, geology and space environment.', 'project-record'),
  ]),
  openQuestions: Object.freeze([
    'Exact giant-impact geometry and degree of Earth–impactor mixing.',
    'Detailed duration and crystallisation sequence of the lunar magma ocean.',
    'Whether early impact flux included a narrow Late Heavy Bombardment spike or broader decline.',
    'Distribution, accessibility and renewal of polar volatiles.',
    'Extent and timing of very young lunar volcanism.',
  ]),
});

export const HUMAN_HISTORY_LATTICE = Object.freeze({
  schema: 'arcsweep.human-history-lattice/v1',
  nodes: Object.freeze([
    node('upper-paleolithic', 'Late Pleistocene human worlds', -50000, -12000, ['Africa','Europe','Asia','Sahul','Americas'], 'Mobile societies developed diverse toolkits, art, ritual, exchange and ecological adaptations while populations spread into most habitable regions.'),
    node('early-holocene', 'Independent domestication traditions', -12000, -5000, ['Southwest Asia','China','New Guinea','Sahel','Mesoamerica','Andes','North America'], 'Plants and animals were domesticated independently in multiple regions; agriculture was neither single-origin nor uniformly adopted.'),
    node('early-cities', 'Cities, states and writing systems', -3500, -1000, ['Mesopotamia','Nile Valley','Indus','Yellow River','Mesoamerica','Andes'], 'Urbanism, administration and writing emerged through distinct regional pathways rather than one civilisational ladder.'),
    node('classical-networks', 'Large interregional networks', -1000, 600, ['Mediterranean','West Africa','South Asia','Central Asia','East Asia','Mesoamerica','Andes'], 'Empires, republics, kingdoms, diasporas and trade routes linked distant societies while local political forms remained diverse.'),
    node('postclassical', 'Oceanic and continental exchange intensifies', 600, 1450, ['Indian Ocean','Silk Roads','Trans-Saharan routes','Pacific','Mesoamerica','Andes','Europe'], 'Commercial, scholarly, religious and migratory networks expanded across Afro-Eurasia and the Pacific; American civilisations developed independently.'),
    node('early-modern', 'Early modern global entanglement', 1450, 1800, ['Atlantic','Indian Ocean','Pacific','Africa','Americas','Europe','Asia'], 'Maritime empires, colonisation, forced migration, Indigenous resistance, disease exchange and global commodity systems reshaped societies unevenly.'),
    node('industrial', 'Industrial and imperial transformations', 1750, 1914, ['Europe','Americas','South Asia','East Asia','Africa','Pacific'], 'Industrialisation, fossil-energy systems, nationalism, abolition struggles, settler colonialism and high imperialism altered global power and ecology.'),
    node('world-wars', 'World wars and decolonisation', 1914, 1975, ['Global'], 'World wars, genocide, anti-colonial movements, independence struggles, nuclear weapons and international institutions radically reordered political life.'),
    node('network-age', 'Networked planetary civilisation', 1975, 2026, ['Global'], 'Digital networks, globalised supply chains, climate change, biotechnology, space infrastructure and AI systems increasingly couple local life to planetary-scale systems.'),
  ]),
});

export function geologicalSpanWidth(item, maxMa = 4540) {
  const start = Math.max(0, Number(item?.startMa) || 0);
  const end = Math.max(0, Number(item?.endMa) || 0);
  const hi = Math.max(start, end);
  const lo = Math.min(start, end);
  const log = (value) => Math.log10(value + 1) / Math.log10(maxMa + 1);
  return Object.freeze({ left: 1 - log(hi), right: 1 - log(lo), width: Math.max(0.002, log(hi) - log(lo)) });
}

export function humanHistoryConcurrency(year) {
  const y = Number(year);
  return HUMAN_HISTORY_LATTICE.nodes.filter((item) => y >= item.startYear && y <= item.endYear);
}
