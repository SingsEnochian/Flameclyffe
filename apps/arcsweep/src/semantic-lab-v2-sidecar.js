import {
  buildSourceConstellation,
  projectParticipantSceneView,
  classifyDebtTransition,
  causalDensity,
  compareWitnessRealizations,
  evaluateBranchGarden,
} from './semantic-transition-contract.js';
import { runNarrativeCircuit } from './narrative-circuit.js';

export const SEMANTIC_LAB_V2_VERSION = 'arcsweep.semantic-lab/v2';

function parse(text, fallback) { try { return JSON.parse(text); } catch { return fallback; } }
function show(node, value) { node.textContent = JSON.stringify(value, null, 2); }

function ensureStyle() {
  if (document.querySelector('[data-semantic-lab-v2-style]')) return;
  const style = document.createElement('style');
  style.dataset.semanticLabV2Style = SEMANTIC_LAB_V2_VERSION;
  style.textContent = `
    .semantic-v2-launch{display:grid;grid-template-columns:1.6rem 1fr;gap:.45rem;align-items:center;width:100%;padding:.55rem .65rem;border:0;border-radius:.65rem;background:transparent;color:inherit;text-align:left;font:inherit;font-size:.86rem;cursor:pointer}
    .semantic-v2-dialog{width:min(1120px,95vw);max-height:90vh;border:1px solid #ffffff26;border-radius:1rem;padding:0;background:var(--panel,#171512);color:inherit;box-shadow:0 1.5rem 5rem #0008}
    .semantic-v2-dialog::backdrop{background:#070606c4;backdrop-filter:blur(5px)}
    .semantic-v2-head{display:flex;justify-content:space-between;align-items:center;padding:1rem 1.1rem;border-bottom:1px solid #ffffff18}.semantic-v2-head h2{margin:0;font-size:1.05rem}.semantic-v2-head p{margin:.2rem 0 0;opacity:.68;font-size:.8rem}
    .semantic-v2-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.8rem;padding:1rem;overflow:auto;max-height:78vh}
    .semantic-v2-toy{border:1px solid #ffffff18;border-radius:.8rem;padding:.8rem;background:#ffffff05}.semantic-v2-toy h3{margin:0 0 .25rem;font-size:.94rem}.semantic-v2-toy p{margin:.1rem 0 .55rem;font-size:.76rem;opacity:.72}
    .semantic-v2-toy textarea{width:100%;box-sizing:border-box;min-height:6.2rem;resize:vertical;border:1px solid #ffffff20;border-radius:.55rem;background:#0003;color:inherit;padding:.55rem;font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace}
    .semantic-v2-out{white-space:pre-wrap;overflow-wrap:anywhere;min-height:3rem;border-radius:.55rem;background:#0004;padding:.55rem;font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace}
    .semantic-v2-rule{grid-column:1/-1;border:1px dashed #ffffff22;border-radius:.7rem;padding:.7rem;font-size:.78rem;opacity:.84}
    .semantic-v2-circuit{grid-column:1/-1}
    @media(max-width:760px){.semantic-v2-grid{grid-template-columns:1fr}}
  `;
  document.head.append(style);
}

function toy(title, description, seed) {
  const section = document.createElement('section');
  section.className = 'semantic-v2-toy';
  section.innerHTML = `<h3>${title}</h3><p>${description}</p><textarea></textarea><div class="semantic-v2-out"></div>`;
  section.querySelector('textarea').value = JSON.stringify(seed, null, 2);
  return section;
}

function buildDialog() {
  let dialog = document.querySelector(`[data-semantic-lab-v2="${SEMANTIC_LAB_V2_VERSION}"]`);
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.className = 'semantic-v2-dialog';
  dialog.dataset.semanticLabV2 = SEMANTIC_LAB_V2_VERSION;
  dialog.innerHTML = '<header class="semantic-v2-head"><div><h2>Semantic Lab II · topology & transition toys</h2><p>Inspection, projection, comparison and receipts only. No canon or memory mutation.</p></div><button type="button" data-close>×</button></header><div class="semantic-v2-grid"></div>';
  const grid = dialog.querySelector('.semantic-v2-grid');

  const source = toy('✦ Source Constellation', 'Sources become nodes; permitted influences become edges. Quarantine clips edges instead of deleting evidence.', [{ source_id:'scene-packet', provenance:'scene-state', authority:'scene-fact', participant_visibility:'participant-a', admissible_influence:['scene_fact','participant_knowledge'], forbidden_influence:[], contamination_status:'clean' }, { source_id:'ambient-ooc', provenance:'ambient-chat', authority:'evidence-only', participant_visibility:'observer-only', admissible_influence:['validation_only'], forbidden_influence:['narrative_particulars','character_intention'], contamination_status:'quarantined' }]);
  source.dataset.toy = 'source-constellation';
  grid.append(source);
  const runSource = () => show(source.querySelector('.semantic-v2-out'), buildSourceConstellation(parse(source.querySelector('textarea').value, [])));
  source.querySelector('textarea').addEventListener('input', runSource); runSource();

  const surprise = toy('⌁ Surprise Lens', 'Global coherence and local predictability are inspected separately.', { globalState:{ bridge:'failing', warden:'approaching', key:'under-stone' }, participantKnown:{ bridge:'failing' }, requestedCapabilities:['scene_fact','participant_knowledge'], sources:[] });
  surprise.dataset.toy = 'surprise-lens'; grid.append(surprise);
  const runSurprise = () => { const data = parse(surprise.querySelector('textarea').value, {}); show(surprise.querySelector('.semantic-v2-out'), projectParticipantSceneView(data)); };
  surprise.querySelector('textarea').addEventListener('input', runSurprise); runSurprise();

  const debt = toy('⌘ Debt Loom', 'Track promises, threats, barriers and questions as discharged, transformed, preserved or newly created.', { before:[{id:'sealed-door',kind:'access-barrier',state:'closed'},{id:'promise',kind:'relationship',state:'owed'}], after:[{id:'promise',kind:'relationship',state:'renegotiated'},{id:'warden-debt',kind:'responsibility',state:'open'}] });
  debt.dataset.toy = 'debt-loom'; grid.append(debt);
  const runDebt = () => { const data = parse(debt.querySelector('textarea').value, {}); show(debt.querySelector('.semantic-v2-out'), classifyDebtTransition(data.before || [], data.after || [])); };
  debt.querySelector('textarea').addEventListener('input', runDebt); runDebt();

  const density = toy('🌱 Causal Density Garden', 'Only evidenced, persistent, causally linked consequences count. Decorative field confetti is excluded.', { initiatingEvents:[{id:'bridge-collapse'}], consequentialChanges:[{id:'route-closed',evidenced:true,persistent:true,causal_link:true},{id:'choice-forced',evidenced:true,persistent:true,causal_link:true},{id:'sky-colour',evidenced:false,persistent:false,causal_link:false}] });
  density.dataset.toy = 'causal-density'; grid.append(density);
  const runDensity = () => show(density.querySelector('.semantic-v2-out'), causalDensity(parse(density.querySelector('textarea').value, {})));
  density.querySelector('textarea').addEventListener('input', runDensity); runDensity();

  const swap = toy('✍ Witness Swap Bench', 'Hold ΔX fixed and compare different lived realizations without changing the target transition.', { targetTransition:{ access:'opened', responsibility:'individual→shared' }, realizations:[{id:'close-third',witness:'close-third',prose:'The latch gave. Responsibility did not.',preserves_target:true},{id:'epistolary',witness:'epistolary',prose:'We opened it together, which changed who could refuse what came next.',preserves_target:true}] });
  swap.dataset.toy = 'witness-swap'; grid.append(swap);
  const runSwap = () => { const data = parse(swap.querySelector('textarea').value, {}); show(swap.querySelector('.semantic-v2-out'), compareWitnessRealizations(data.targetTransition || {}, data.realizations || [])); };
  swap.querySelector('textarea').addEventListener('input', runSwap); runSwap();

  const garden = toy('🌿 Branch Garden', 'Candidate transitions are filtered by agency, continuity and semantic inflation before prose exists. Novelty proposes; it does not score.', [{id:'bridge-choice',agency_legal:true,continuity_legal:true,semantic_inflation:false,novelty:'bounded',vector:{D:.8,C:.9,A:.7,R:.8,P:.8,K:.9,T:.7,L:.6,Q:.5,G:.8,S:.2,F:.1,I:.1}},{id:'surprise-dragon',agency_legal:true,continuity_legal:false,semantic_inflation:false,novelty:'high',vector:{D:.1,C:.1,A:.2,R:.9,P:.2,K:.1,T:.9,L:.1,Q:.1,G:.2,S:.9,F:.7,I:.4}}]);
  garden.dataset.toy = 'branch-garden'; grid.append(garden);
  const runGarden = () => show(garden.querySelector('.semantic-v2-out'), evaluateBranchGarden(parse(garden.querySelector('textarea').value, [])));
  garden.querySelector('textarea').addEventListener('input', runGarden); runGarden();

  const circuit = toy('⚡ Narrative Circuit', 'Branch Garden → Transition Forge → Witness Swap → evidenced arrival validation through Semantic Inflation, Debt Loom, Perspective Lantern and Causal Density.', {
    beforeState:{ access:'closed', responsibility:'individual', bridge:'stable' },
    afterState:{ access:'open', responsibility:'shared', bridge:'lost' },
    beforeDebt:[{id:'sealed-crossing',kind:'access-barrier',state:'closed'}],
    afterDebt:[{id:'shared-duty',kind:'responsibility',state:'open'}],
    branches:[{id:'bridge-choice',agency_legal:true,continuity_legal:true,semantic_inflation:false,novelty:'bounded',vector:{D:.8,C:.9,A:.7,R:.8,P:.8,K:.9,T:.7,L:.6,Q:.5,G:.8,S:.2,F:.1,I:.1}}],
    selectedBranchId:'bridge-choice',
    witnessRealizations:[{id:'close-third',witness:'close-third',prose:'The bridge went under behind them. The key was no longer whether to cross, but who now carried the road.',preserves_target:true}],
    selectedWitnessId:'close-third',
    participantKnown:{ access:'open', responsibility:'shared' },
    sources:[],
    initiatingEvents:[{id:'bridge-loss'}],
    consequentialChanges:[{id:'route-closed',evidenced:true,persistent:true,causal_link:true},{id:'responsibility-shared',evidenced:true,persistent:true,causal_link:true}]
  });
  circuit.classList.add('semantic-v2-circuit');
  circuit.dataset.toy = 'narrative-circuit'; grid.append(circuit);
  const runCircuit = () => show(circuit.querySelector('.semantic-v2-out'), runNarrativeCircuit(parse(circuit.querySelector('textarea').value, {})));
  circuit.querySelector('textarea').addEventListener('input', runCircuit); runCircuit();

  const rule = document.createElement('div'); rule.className = 'semantic-v2-rule'; rule.textContent = 'Generate inside reachable agency constraints → filter continuity/debt/topology → select ΔX → project participant views → witness realizes lived particulars → validate arrival. Novelty is a proposal operator, not a reward. The circuit may inspect and select; it may not silently mutate canon, memory, tools, or participant authority.'; grid.append(rule);
  document.body.append(dialog);
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  return dialog;
}

function mountLauncher() {
  const nav = document.querySelector('.sidebar nav[aria-label="Primary Arcsweep rooms"]');
  if (!nav || nav.querySelector('[data-semantic-v2-launch]')) return;
  const existing = nav.querySelector('[data-semantic-lab-launch]');
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'semantic-v2-launch'; button.dataset.semanticV2Launch = SEMANTIC_LAB_V2_VERSION;
  button.innerHTML = '<span aria-hidden="true">✦</span><span>Semantic Lab II</span>';
  button.addEventListener('click', () => buildDialog().showModal());
  if (existing?.parentElement) existing.parentElement.append(button); else nav.append(button);
}

export function installSemanticLabV2() {
  ensureStyle(); mountLauncher();
  const observer = new MutationObserver(mountLauncher); observer.observe(document.body, { childList:true, subtree:true });
  globalThis.addEventListener('beforeunload', () => observer.disconnect(), { once:true });
}

if (typeof document !== 'undefined') installSemanticLabV2();
