import { invokeConstellationRuntimeVoice } from './constellation-runtime-adapter.js';

let installed = false;
let running = false;

const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

function scriptForm() { return document.querySelector('#script-form'); }
function scriptText(form = scriptForm()) { return String(form?.elements?.namedItem?.('content')?.value || ''); }
function scriptName(form = scriptForm()) { return String(form?.elements?.namedItem?.('name')?.value || 'Untitled script'); }
function activeWorldName() { return document.querySelector('.sidebar-world strong')?.textContent?.trim() || 'Active World'; }

function promptFor(mode, values, currentScript) {
  const world = activeWorldName();
  const base = `You are assisting inside Arcsweep Scripts. Work with the Steward's editable source; return useful draft material, not a final authority.\nWorld: ${world}\nScript: ${scriptName()}\n`;
  if (mode === 'suggest') return `${base}\nReview the current script and suggest concrete improvements for structure, continuity, world logic, character motivation, missing connective tissue, and opportunities worth exploring. Preserve the author's voice. Organise suggestions by priority and point to the relevant section when possible.\n\nCURRENT SCRIPT:\n${currentScript}`;
  if (mode === 'world') return `${base}\nBuild a world-development draft from these seeds. Return clear sections for: core premise, sensory identity, cosmology/rules, geography/locations, societies/factions, technology or magic, characters/roles, history/timeline, conflicts, ordinary daily life, canon anchors, open questions, and scenario hooks.\nPremise: ${values.premise}\nTone: ${values.tone}\nRules/constraints: ${values.constraints}\nMust include: ${values.anchors}\nExisting script context:\n${currentScript}`;
  return `${base}\nBuild a scenario draft that can be inserted into the script. Return sections for: starting state, participants, location, objective, stakes, constraints, pressure/escalation, decision points, likely branches, sensory beats, continuity/canon anchors, exit conditions, aftermath, and unresolved hooks.\nScenario seed: ${values.premise}\nParticipants: ${values.participants}\nDesired tone: ${values.tone}\nConstraints: ${values.constraints}\nCanon anchors: ${values.anchors}\nExisting script context:\n${currentScript}`;
}

function collect(panel) {
  return {
    premise: String(panel.querySelector('[name="wizardPremise"]')?.value || '').trim(),
    participants: String(panel.querySelector('[name="wizardParticipants"]')?.value || '').trim(),
    tone: String(panel.querySelector('[name="wizardTone"]')?.value || '').trim(),
    constraints: String(panel.querySelector('[name="wizardConstraints"]')?.value || '').trim(),
    anchors: String(panel.querySelector('[name="wizardAnchors"]')?.value || '').trim(),
  };
}

async function run(panel, mode) {
  if (running) return;
  const form = scriptForm();
  if (!form) return;
  const output = panel.querySelector('[data-script-wizard-output]');
  const voiceId = panel.querySelector('[name="wizardVoice"]')?.value || 'boxfire';
  const current = scriptText(form);
  const values = collect(panel);
  const prompt = promptFor(mode, values, current);
  running = true;
  panel.dataset.running = 'true';
  if (output) output.value = 'Working…';
  try {
    const reply = await invokeConstellationRuntimeVoice({
      voiceId,
      message: prompt,
      sessionId: `arcsweep-script-wizard-${activeWorldName()}-${scriptName(form)}-${mode}`,
      metadata: { surface: 'scripts', instrument: 'world-scenario-wizard', mode, world_name: activeWorldName(), script_name: scriptName(form) },
    });
    if (output) output.value = reply.status === 'replied' ? reply.message : `[${reply.status}] ${reply.reason || 'No suggestion returned.'}`;
  } catch (error) {
    if (output) output.value = `Script assistant route error: ${error?.message || error}`;
  } finally {
    running = false;
    panel.dataset.running = 'false';
  }
}

function applyOutput(panel, mode) {
  const form = scriptForm();
  const textarea = form?.elements?.namedItem?.('content');
  const output = String(panel.querySelector('[data-script-wizard-output]')?.value || '').trim();
  if (!(textarea instanceof HTMLTextAreaElement) || !output) return;
  if (mode === 'replace') textarea.value = output;
  else textarea.value = `${textarea.value.trim()}${textarea.value.trim() ? '\n\n' : ''}${output}`;
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.focus();
}

function panelMarkup() {
  return `<section class="panel script-wizard" data-script-wizard>
    <div class="section-heading compact-heading"><div><p class="eyebrow">Script intelligence</p><h2>World & Scenario Wizard</h2><p class="muted">Ask for suggestions, build a world scaffold, or draft a scenario. Nothing enters the script until you choose Append or Replace.</p></div></div>
    <div class="script-wizard-actions">
      <label>Voice<select name="wizardVoice"><option value="boxfire">Boxfire</option><option value="virelya">Virelya</option><option value="faer">Faer</option><option value="larkshine">Larkshine</option></select></label>
      <button type="button" data-script-assist="suggest">Suggest improvements</button>
      <button type="button" data-script-assist="world">Build world</button>
      <button type="button" data-script-assist="scenario">Build scenario</button>
    </div>
    <div class="script-wizard-grid">
      <label>Premise / seed<textarea name="wizardPremise" rows="3" placeholder="What are we building or exploring?"></textarea></label>
      <label>Participants<input name="wizardParticipants" placeholder="Characters, factions, observers…" /></label>
      <label>Tone / atmosphere<input name="wizardTone" placeholder="Mythic, intimate, eerie, joyful…" /></label>
      <label>Rules / constraints<textarea name="wizardConstraints" rows="3" placeholder="Physics, magic, canon, social laws, hard constraints…"></textarea></label>
      <label>Canon anchors / must-include<textarea name="wizardAnchors" rows="3" placeholder="Events, places, people, motifs, timeline anchors…"></textarea></label>
    </div>
    <label>Assistant draft<textarea data-script-wizard-output rows="16" placeholder="Suggestions and generated scaffolding appear here."></textarea></label>
    <div class="button-row"><button type="button" class="quiet" data-script-apply="append">Append to script</button><button type="button" class="quiet" data-script-apply="replace">Replace script</button></div>
  </section>`;
}

function mount() {
  const form = scriptForm();
  if (!form || document.querySelector('[data-script-wizard]')) return;
  const article = form.closest('article');
  if (!article) return;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = panelMarkup();
  const panel = wrapper.firstElementChild;
  article.parentElement?.insertBefore(panel, article.nextSibling);
  panel.querySelectorAll('[data-script-assist]').forEach((button) => button.addEventListener('click', () => void run(panel, button.dataset.scriptAssist)));
  panel.querySelectorAll('[data-script-apply]').forEach((button) => button.addEventListener('click', () => applyOutput(panel, button.dataset.scriptApply)));
}

function injectStyles() {
  if (document.getElementById('script-world-scenario-wizard-styles')) return;
  const style = document.createElement('style');
  style.id = 'script-world-scenario-wizard-styles';
  style.textContent = `
    .script-wizard{margin-top:1rem}.script-wizard-actions{display:grid;grid-template-columns:minmax(10rem,.7fr) repeat(3,minmax(9rem,1fr));gap:.55rem;align-items:end}.script-wizard-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.65rem;margin:.8rem 0}.script-wizard-grid label:first-child,.script-wizard-grid label:nth-child(4),.script-wizard-grid label:nth-child(5){grid-column:1/-1}.script-wizard[data-running="true"] button[data-script-assist]{opacity:.6;pointer-events:none}@media(max-width:900px){.script-wizard-actions,.script-wizard-grid{grid-template-columns:1fr}.script-wizard-grid>*{grid-column:auto!important}}
  `;
  document.head.append(style);
}

export function installScriptWorldScenarioWizard() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  injectStyles();
  mount();
  const app = document.querySelector('#app');
  if (app) new MutationObserver(() => mount()).observe(app, { childList: true, subtree: true });
}

if (typeof document !== 'undefined') installScriptWorldScenarioWizard();
