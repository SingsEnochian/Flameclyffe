// STARWELL / ArcSweep Worldseed · external reference review, not canon authority.
import { createHash } from 'node:crypto';

const CANONICAL_PIN = /^https:\/\/www\.pinterest\.com\/pin\/\d+\/$/;
const CANONICAL_SECTION = /^https:\/\/www\.pinterest\.com\/rowanwillowart\/starwell\/(?:world|map|colours|fauna|fashion|animation)\/$/;
const SET = new Set(['shortlisted', 'hold']);

export function validateReferencePalette(pack) {
  const problems = [];
  const flag = (ok, reason) => { if (!ok) problems.push(reason); };
  flag(pack?.schema === 'arcsweep.starwell-reference-palette/v0.1', 'reference schema mismatch');
  flag(pack?.world_scope?.canon_write === false, 'palette cannot write canon');
  flag(pack?.authority === 'rowan-consented-provisional-reference-curation', 'authority must be provisional');
  flag(Array.isArray(pack?.pins), 'pins required');
  const pins = Array.isArray(pack?.pins) ? pack.pins : [];
  const idSet = new Set();
  for (const [index, pin] of pins.entries()) {
    flag(typeof pin.id === 'string' && !idSet.has(pin.id), `pin ${index} has duplicate/missing id`);
    idSet.add(pin.id);
    flag(typeof pin.url === 'string' && CANONICAL_PIN.test(pin.url), `pin ${index} lacks individual Pinterest locator`);
    flag(pin.verification === 'visible-in-connected-browser-section-excerpt', `pin ${index} provenance not verified`);
    flag(SET.has(pin.status), `pin ${index} has invalid review status`);
    flag(pin.is_canon === false && pin.asset_imported === false, `pin ${index} must not import or claim canon`);
    flag(pin.usage_rights === 'not-verified', `pin ${index} has unverified licence claim`);
  }
  const queues = Array.isArray(pack?.section_queues) ? pack.section_queues : [];
  flag(queues.length === 6, 'all six board sections must remain visible');
  const sectionIDs = new Set();
  for (const section of queues) {
    flag(CANONICAL_SECTION.test(section.url) && section.review_status === 'queue', `section ${section.id} cannot be treated as an individually reviewed pin`);
    flag(!sectionIDs.has(section.id), `duplicate section ${section.id}`);
    sectionIDs.add(section.id);
  }
  flag(pins.filter(p => p.status === 'shortlisted').length === pack?.selection_policy?.current_shortlisted_pin_count, 'shortlist count mismatch');
  flag(pack?.selection_policy?.target_pin_count_min === 12 && pack?.selection_policy?.target_pin_count_max === 18, 'original selection target changed');
  return { ok: problems.length === 0, problems };
}

export function validateLocationStudy(seed, pack) {
  const problems = [];
  const flag = (ok, reason) => { if (!ok) problems.push(reason); };
  flag(seed?.schema === 'arcsweep.starwell-location-study/v0.1', 'location schema mismatch');
  flag(seed?.status === 'provisional' && seed?.authority === 'proposed-design-only', 'location has false canon claim');
  flag(seed?.world_anchor === 'Terra Aeterna', 'wrong anchor world');
  flag(seed?.parent_world_link === 'hypothesis-for-review', 'location must not assert adoption');
  flag(seed?.reference_pack_id === pack?.palette_id, 'reference pack not attached');
  const zones=Array.isArray(seed?.districts)?seed.districts:[];
  flag(zones.length===4, 'expected four spatial districts');
  const ids=new Set(zones.map(z=>z.id));
  flag(ids.size===zones.length && zones.every(z=>z.status==='proposed'), 'districts must be unique proposals');
  const links=Array.isArray(seed?.connections)?seed.connections:[];
  flag(links.every(x=>ids.has(x.from)&&ids.has(x.to)&&x.confirmed===false), 'links must be plausible unresolved connections');
  flag(Array.isArray(seed?.proposed_fauna)&&seed.proposed_fauna.length===3 && seed.proposed_fauna.every(x=>x.status==='original-proposal-unrelated-to-pin-species'), 'fauna proposals mislabeled');
  flag(seed?.palette_notice?.includes('not sampled')===true, 'palette must identify unsampled colours');
  flag(Array.isArray(seed?.unresolved_wonder)&&seed.unresolved_wonder.length>=3, 'unresolved science questions required');
  const questions=seed?.continuity_questions||{};
  for(const field of ['what_must_survive','what_may_change','what_can_be_lost','what_descendants_inherit','what_world_can_teach'])flag(Array.isArray(questions[field])&&questions[field].length>0,`worldseed question missing: ${field}`);
  return {ok:problems.length===0,problems};
}

function stable(v){if(Array.isArray(v))return v.map(stable);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));return v;}
export function buildReferenceReceipt(pack,seed){
  const a=validateReferencePalette(pack),b=validateLocationStudy(seed,pack);
  if(!a.ok||!b.ok)throw new Error([...a.problems,...b.problems].join('; '));
  const material=JSON.stringify(stable({pack,seed}));
  return {
    schema:'arcsweep.starwell-reference-receipt/v0.1',
    source_board:pack.primary_board.url,
    source_pin_count:pack.pins.length,
    shortlisted:pack.pins.filter(p=>p.status==='shortlisted').length,
    held:pack.pins.filter(p=>p.status==='hold').length,
    unreviewed_sections:pack.section_queues.map(s=>s.id),
    title:seed.name,
    status:'provisional-no-canon-write',
    sha256:createHash('sha256').update(material).digest('hex'),
    stop_point:seed.stop_point,
    next_owner:seed.next_owner,
    unresolved_wonder:seed.unresolved_wonder,
  };
}