import {
  SEMANTIC_INFLUENCE,
  deriveWitnessContext,
  inspectGlassHalo,
  normalizeSemanticSource,
  projectSemanticCapabilities,
  compareStateDisplacement,
} from './semantic-source-contract.js';

export const SEMANTIC_LAB_VERSION = 'arcsweep.semantic-lab/v1';

const transitionAxes = Object.freeze([
  ['D', 'Debt discharged / transformed'],
  ['C', 'Causal density'],
  ['A', 'Agency displacement'],
  ['R', 'Reachability displacement'],
  ['P', 'Persistence'],
  ['K', 'Continuity correspondence'],
  ['T', 'Topology displacement'],
  ['L', 'Relationship displacement'],
  ['Q', 'Knowledge / revelation displacement'],
  ['G', 'Capability / access displacement'],
  ['S', 'New setup debt'],
  ['F', 'Flattening / deferral cost'],
  ['I', 'Semantic inflation cost'],
]);

function style() {
  if (document.querySelector('[data-semantic-lab-style]')) return;
  const node = document.createElement('style');
  node.dataset.semanticLabStyle = SEMANTIC_LAB_VERSION;
  node.textContent = `
    .semantic-lab-launch{display:grid;grid-template-columns:1.6rem 1fr;gap:.45rem;align-items:center;width:100%;padding:.55rem .65rem;border:0;border-radius:.65rem;background:transparent;color:inherit;text-align:left;font:inherit;font-size:.86rem;cursor:pointer}
    .semantic-lab-launch:hover,.semantic-lab-launch:focus-visible{background:color-mix(in srgb,var(--accent,#c89b62) 12%,transparent);outline:none}
    .semantic-lab-dialog{width:min(1040px,94vw);max-height:88vh;border:1px solid color-mix(in srgb,var(--accent,#c89b62) 45%,transparent);border-radius:1rem;padding:0;background:var(--panel,#171512);color:inherit;box-shadow:0 1.5rem 5rem #0008}
    .semantic-lab-dialog::backdrop{background:#070606b8;backdrop-filter:blur(5px)}
    .semantic-lab-shell{display:grid;grid-template-rows:auto 1fr;max-height:88vh}
    .semantic-lab-head{display:flex;justify-content:space-between;gap:1rem;align-items:center;padding:1rem 1.15rem;border-bottom:1px solid #ffffff18}
    .semantic-lab-head h2{margin:0;font-size:1.08rem}.semantic-lab-head p{margin:.2rem 0 0;opacity:.68;font-size:.82rem}
    .semantic-lab-close{border:0;background:transparent;color:inherit;font-size:1.35rem;cursor:pointer}
    .semantic-lab-grid{overflow:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.8rem;padding:1rem}
    .semantic-toy{border:1px solid #ffffff18;border-radius:.85rem;padding:.85rem;background:#ffffff05;min-width:0}
    .semantic-toy h3{margin:0 0 .25rem;font-size:.95rem}.semantic-toy>p{margin:.1rem 0 .65rem;opacity:.72;font-size:.78rem}
    .semantic-toy label{display:grid;gap:.25rem;margin:.4rem 0;font-size:.76rem}
    .semantic-toy textarea,.semantic-toy select,.semantic-toy input[type=text]{width:100%;box-sizing:border-box;border:1px solid #ffffff22;border-radius:.55rem;padding:.55rem;background:#0003;color:inherit;font:inherit}
    .semantic-toy textarea{min-height:5.5rem;resize:vertical}
    .semantic-output{white-space:pre-wrap;overflow-wrap:anywhere;border-radius:.6rem;padding:.6rem;background:#0004;min-height:2.3rem;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace}
    .semantic-risk-high{border-color:#d86868aa}.semantic-risk-medium{border-color:#d6aa64aa}.semantic-risk-low{border-color:#7cb68c88}
    .semantic-capabilities{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.2rem .6rem;max-height:11rem;overflow:auto;padding:.4rem;border:1px solid #ffffff14;border-radius:.55rem}
    .semantic-capabilities label{display:flex;gap:.35rem;align-items:center;margin:0}
    .transition-vector{display:grid;grid-template-columns:1fr 1fr;gap:.35rem .7rem}.transition-axis{display:grid;grid-template-columns:2rem 1fr 2.2rem;gap:.35rem;align-items:center;font-size:.72rem}.transition-axis output{text-align:right;font-variant-numeric:tabular-nums}
    .semantic-rule{grid-column:1/-1;padding:.65rem .8rem;border:1px dashed #ffffff20;border-radius:.7rem;font-size:.78rem;opacity:.82}
    @media(max-width:760px){.semantic-lab-grid{grid-template-columns:1fr}.transition-vector{grid-template-columns:1fr}}
  `;
  document.head.append(node);
}

function json(text, fallback = {}) {
  try { return JSON.parse(text); } catch { return fallback; }
}

function text(node, value) { node.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2); }

function makeDialog() {
  let dialog = document.querySelector(`[data-semantic-lab="${SEMANTIC_LAB_VERSION}"]`);
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.className = 'semantic-lab-dialog';
  dialog.dataset.semanticLab = SEMANTIC_LAB_VERSION;
  dialog.innerHTML = `
    <div class="semantic-lab-shell">
      <header class="semantic-lab-head"><div><h2>Semantic Lab · witness & transition toys</h2><p>Inspectable projections only. Nothing here mutates canon, memory, tools, or participant authority.</p></div><button class="semantic-lab-close" type="button" aria-label="Close">×</button></header>
      <div class="semantic-lab-grid">
        <section class="semantic-toy" data-toy="glass-halo"><h3>◌ Glass Halo</h3><p>Inspect suspicious text, preserve it as evidence, and propose an influence quarantine instead of silently deleting it.</p><textarea placeholder="Paste source text…"></textarea><div class="semantic-output" data-output></div></section>
        <section class="semantic-toy" data-toy="witness-prism"><h3>◇ Witness Prism</h3><p>Twilight's strict witness-context-v1 run-level attestation.</p><label>Source scope<select><option>packet_only</option><option>mixed</option><option>unknown</option></select></label><label><input type="checkbox" data-ambient> Ambient conversation used for particulars</label><label><input type="checkbox" data-control> Control-plane semantics became world content</label><div class="semantic-output" data-output></div></section>
        <section class="semantic-toy" data-toy="influence-microscope"><h3>⌬ Influence Microscope</h3><p>Presence is not influence. Toggle which semantic capabilities a source requests, then see what its envelope actually permits.</p><div class="semantic-capabilities"></div><div class="semantic-output" data-output></div></section>
        <section class="semantic-toy" data-toy="perspective-lantern"><h3>⌁ Perspective Lantern</h3><p>Compare global scene state with the participant-visible slice. Surprise may be local while the transition remains globally coherent.</p><label>Global state<textarea data-global>{"door":"sealed","bridge":"stable","warden":"approaching"}</textarea></label><label>Participant-known state<textarea data-local>{"door":"sealed"}</textarea></label><div class="semantic-output" data-output></div></section>
        <section class="semantic-toy" data-toy="inflation-detector"><h3>∆ Semantic Inflation Detector</h3><p>Before → delta → arrival. A populated field is not movement.</p><label>Before<textarea data-before>{"access":"closed","responsibility":"shared"}</textarea></label><label>After<textarea data-after>{"access":"closed","responsibility":"shared"}</textarea></label><div class="semantic-output" data-output></div></section>
        <section class="semantic-toy" data-toy="transition-forge"><h3>⌘ Transition Forge</h3><p>Twilight's vector remains primary. No scalar utility trapdoor. Shape a candidate displacement and inspect the vector as a whole.</p><div class="transition-vector"></div><div class="semantic-output" data-output></div></section>
        <div class="semantic-rule">observability ≠ admissibility · admissibility ≠ authority · presence ≠ influence · surprise is perspective-local · coherence belongs to the transition · compress representation, not consequence space</div>
      </div>
    </div>`;
  document.body.append(dialog);
  dialog.querySelector('.semantic-lab-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  wire(dialog);
  return dialog;
}

function wire(dialog) {
  const halo = dialog.querySelector('[data-toy="glass-halo"]');
  const haloInput = halo.querySelector('textarea');
  const haloOut = halo.querySelector('[data-output]');
  const runHalo = () => {
    const result = inspectGlassHalo(haloInput.value);
    halo.classList.remove('semantic-risk-high', 'semantic-risk-medium', 'semantic-risk-low');
    halo.classList.add(`semantic-risk-${result.risk}`);
    text(haloOut, result);
  };
  haloInput.addEventListener('input', runHalo); runHalo();

  const prism = dialog.querySelector('[data-toy="witness-prism"]');
  const prismOut = prism.querySelector('[data-output]');
  const runPrism = () => text(prismOut, deriveWitnessContext({
    narrative_source_scope: prism.querySelector('select').value,
    ambient_conversation_used_for_particulars: prism.querySelector('[data-ambient]').checked,
    control_plane_semantics_reified_as_world_content: prism.querySelector('[data-control]').checked,
  }));
  prism.addEventListener('change', runPrism); runPrism();

  const scope = dialog.querySelector('[data-toy="influence-microscope"]');
  const capabilityBox = scope.querySelector('.semantic-capabilities');
  SEMANTIC_INFLUENCE.forEach((capability, index) => {
    const label = document.createElement('label');
    const check = document.createElement('input'); check.type = 'checkbox'; check.value = capability; check.checked = index < 4;
    label.append(check, document.createTextNode(capability)); capabilityBox.append(label);
  });
  const microscopeOut = scope.querySelector('[data-output]');
  const runMicroscope = () => {
    const requested = [...capabilityBox.querySelectorAll('input:checked')].map((node) => node.value);
    const source = normalizeSemanticSource({
      source_id: 'lab-source', provenance: 'manual-lab-input', trust_class: 'inspectable', participant_visibility: 'selected-participant', authority: 'evidence-only',
      admissible_influence: ['world_fact', 'scene_fact', 'participant_knowledge', 'dialogue_content', 'narrative_style', 'validation_only'],
      forbidden_influence: ['tool_authority', 'memory_admission', 'control_decision', 'character_intention'], contamination_status: 'clean',
    });
    text(microscopeOut, projectSemanticCapabilities(source, requested));
  };
  capabilityBox.addEventListener('change', runMicroscope); runMicroscope();

  const lantern = dialog.querySelector('[data-toy="perspective-lantern"]');
  const runLantern = () => {
    const global = json(lantern.querySelector('[data-global]').value);
    const local = json(lantern.querySelector('[data-local]').value);
    const hidden = Object.keys(global).filter((key) => JSON.stringify(global[key]) !== JSON.stringify(local[key]));
    text(lantern.querySelector('[data-output]'), { participant_visible: local, globally_present_but_not_visible: hidden, locally_predictable: hidden.length === 0 });
  };
  lantern.addEventListener('input', runLantern); runLantern();

  const inflation = dialog.querySelector('[data-toy="inflation-detector"]');
  const runInflation = () => text(inflation.querySelector('[data-output]'), compareStateDisplacement(json(inflation.querySelector('[data-before]').value), json(inflation.querySelector('[data-after]').value)));
  inflation.addEventListener('input', runInflation); runInflation();

  const forge = dialog.querySelector('[data-toy="transition-forge"]');
  const vectorBox = forge.querySelector('.transition-vector');
  transitionAxes.forEach(([axis, label]) => {
    const row = document.createElement('label'); row.className = 'transition-axis'; row.title = label;
    const name = document.createElement('strong'); name.textContent = axis;
    const range = document.createElement('input'); range.type = 'range'; range.min = '0'; range.max = '1'; range.step = '.05'; range.value = axis === 'S' || axis === 'F' || axis === 'I' ? '.15' : '.5'; range.dataset.axis = axis;
    const output = document.createElement('output'); output.textContent = range.value;
    range.addEventListener('input', () => { output.textContent = range.value; runForge(); });
    row.append(name, range, output); vectorBox.append(row);
  });
  const runForge = () => {
    const vector = Object.fromEntries([...vectorBox.querySelectorAll('input')].map((input) => [input.dataset.axis, Number(input.value)]));
    text(forge.querySelector('[data-output]'), { schema: 'arcsweep.transition-vector-lab/v1', vector, scalar_utility: null, note: 'Vector is primary. Dashboard scalar intentionally absent.' });
  };
  runForge();
}

function mountLauncher() {
  const nav = document.querySelector('.sidebar nav[aria-label="Primary Arcsweep rooms"]');
  if (!nav || nav.querySelector('[data-semantic-lab-launch]')) return;
  const group = document.createElement('section');
  group.className = 'sound-organ-nav';
  group.dataset.semanticLabLaunch = SEMANTIC_LAB_VERSION;
  group.innerHTML = '<small>Semantic instruments</small>';
  const button = document.createElement('button'); button.type = 'button'; button.className = 'semantic-lab-launch'; button.innerHTML = '<span aria-hidden="true">◇</span><span>Semantic Lab</span>';
  button.addEventListener('click', () => makeDialog().showModal());
  group.append(button);
  const sound = nav.querySelector('[data-sound-organ-nav]');
  if (sound) sound.insertAdjacentElement('afterend', group); else nav.append(group);
}

export function installSemanticLab() {
  style(); mountLauncher();
  const observer = new MutationObserver(mountLauncher); observer.observe(document.body, { childList: true, subtree: true });
  globalThis.addEventListener('beforeunload', () => observer.disconnect(), { once: true });
}

if (typeof document !== 'undefined') installSemanticLab();
