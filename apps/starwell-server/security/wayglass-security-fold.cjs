'use strict';

// Security fold is advisory and deterministic. Only trusted host services
// may authenticate, authorize, execute or persist a security action.
const PHASES = Object.freeze(['discover','attribute','authorize','contextualize','route','respond','receipt','return']);
const SECURITY_DOMAINS = Object.freeze(['identity','access','secrets','network','supply-chain','model-routing','world-boundaries','continuity']);
const ALLOWED_ACTIONS = new Set(['inspect','test','propose','deploy','revoke','rotate']);
function securityFold({ domain, action, principal, resource, evidence = [] } = {}) {
  if (!SECURITY_DOMAINS.includes(domain)) throw new Error('Unknown security domain');
  if (!ALLOWED_ACTIONS.has(action)) throw new Error('Unknown security action');
  const clean = value => String(value ?? '').trim().slice(0,160);
  const actor = clean(principal), target = clean(resource);
  if (!target) throw new Error('Resource required');
  const trace = PHASES.map(phase => ({ phase, status:'pending' }));
  trace[0].status='classified';
  trace[1].status=actor?'claimed-unverified':'unknown';
  trace[2].status='denied-until-host-verifies';
  trace[3].status='scoped';
  trace[4].status='no-execution';
  trace[5].status='proposal-only';
  trace[6].status='not-persisted';
  trace[7].status='requires-verified-return';
  return {
    schema:'wayglass.security-fold/v0.1', domain, action, resource:target,
    claimed_principal:actor || null, phases:[...PHASES], trace,
    evidence_refs:Array.isArray(evidence)?evidence.filter(v=>typeof v==='string').map(clean).slice(0,24):[],
    authorization:{ verified:false, allowed:false }, execution:{ performed:false },
    continuity:{ receipt_persisted:false, return_verified:false },
  };
}
module.exports = { securityFold, SECURITY_DOMAINS, PHASES };
