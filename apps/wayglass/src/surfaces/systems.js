import { listWayglassOrgans } from '../organ-registry.js';
import { inspectWayglassDoubleMobius } from '../route-client.js';
import { syntheticWayglassVoyage, runWayglassIntegratedVoyage } from '../integrated-voyage-client.js';
import { wayglassSomaticSound } from '../somatic-sound.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function organKind(id) {
  if (id.includes('presence')) return 'presence';
  if (id.includes('memory')) return 'memory';
  if (id.includes('sensorium')) return 'sensorium';
  return 'system';
}

function shortName(id) {
  return String(id).replace('wayglass.organ.', '').split('-').map(word => word[0]?.toUpperCase() + word.slice(1)).join(' ');
}

export async function mountWayglassSystemsSurface(root) {
  const organs = listWayglassOrgans();
  root.innerHTML = [
    '<section class="wg-surface wg-systems" data-surface="wayglass-systems">',
      '<header class="wg-surface-head glass-panel">',
        '<div><p class="eyebrow">Wayglass · ship systems</p><h1>Organs</h1>',
        '<p class="lede">Installed machinery serving the voyage. An organ may observe, carry, render or replay within its declared ceiling. It does not become the traveller.</p></div>',
        '<div class="systems-vitals" aria-label="Ship organ status">',
          '<span><strong>' + organs.length + '</strong> mounted</span>',
          '<span><strong>0</strong> authority escalations</span>',
          '<span><strong>1</strong> registry contract</span>',
        '</div>',
      '</header>',
      '<nav class="wg-deck-nav glass-panel" aria-label="Wayglass rooms">',
        '<button type="button" class="glass-chip" data-wayglass-room="arcsweep:writing-room">Writing Room</button>',
        '<button type="button" class="glass-chip" data-wayglass-room="wayglass:native-voice">Wyrdrune Voice</button><button type="button" class="glass-chip active" aria-current="page">Organs</button><button type="button" class="glass-chip" data-wayglass-room="wayglass:spectral-field">Full Spectrum</button>',
        '<button type="button" class="glass-chip" data-wayglass-room="wayglass:video-atelier">Video Atelier</button><button type="button" class="glass-chip" data-wayglass-room="wayglass:living-observer">Living Observer</button><button type="button" class="glass-chip" data-wayglass-room="wayglass:toybox">Toybox</button>',
      '</nav>',
      '<section class="glass-panel" data-double-mobius-panel aria-label="Gateway double Möbius engine" style="border-radius:1.5rem;padding:1.25rem;margin-block:1rem;">',
        '<p class="eyebrow">Gateway × Wayglass · coupled engine</p>',
        '<h2>Double Möbius</h2>',
        '<p>Two rounded, reciprocal crossings: Gateway state transformation and Wayglass information-and-continuity return. One Withness centre, distinct provenance, and no automatic playback.</p>',
        '<div style="display:flex;gap:.75rem;flex-wrap:wrap;">',
          '<button type="button" class="glass-chip" data-double-mobius-inspect>Inspect installed engine</button>',
          '<button type="button" class="glass-chip" data-double-mobius-writing>Open Writing Room to speak with Wayglass</button>',
        '</div>',
        '<p role="status" data-double-mobius-status>Engine route not inspected. Live model availability is separate.</p>',
      '</section>',
      '<section class="fae-timeline-portal glass-panel" data-integrated-voyage-panel data-voyage-state="idle" aria-labelledby="fae-timeline-title">',
        '<div class="fae-timeline-topline"><span class="fae-glyph" aria-hidden="true">✧</span><span>WAYGLASS · FAEpunk systems helm</span><span class="fae-local-tag">Owner-invoked · WTL native</span></div>',
        '<div class="fae-voyage-grid">',
          '<div class="fae-voyage-orbit" aria-hidden="true">',
            '<svg viewBox="0 0 520 300" class="fae-braid" focusable="false">',
              '<defs><linearGradient id="fae-passage" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#68b8a5"/><stop offset="52%" stop-color="#b9f2da"/><stop offset="100%" stop-color="#dfb789"/></linearGradient></defs>',
              '<circle cx="260" cy="150" r="114" class="fae-orbit-guide"/>',
              '<circle cx="260" cy="150" r="81" class="fae-orbit-inner"/>',
              '<path class="fae-braid-path" d="M63 150 C122 42 200 42 260 150 S398 258 457 150 C398 42 320 42 260 150 S122 258 63 150" fill="none" stroke="url(#fae-passage)" stroke-width="5"/>',
              '<path class="fae-braid-glimmer" d="M63 150 C122 42 200 42 260 150 S398 258 457 150 C398 42 320 42 260 150 S122 258 63 150" fill="none" stroke="#d7f6e4" stroke-width="1.1"/>',
              '<circle class="fae-orbit-point fae-infrastructure-point" cx="114" cy="91" r="7"/>',
              '<circle class="fae-orbit-point fae-intelligence-point" cx="406" cy="209" r="7"/>',
              '<circle class="fae-core-halo" cx="260" cy="150" r="35"/>',
              '<text x="260" y="155" text-anchor="middle" class="fae-center-word">WITH</text>',
              '<text x="121" y="45" class="fae-orbit-label" text-anchor="middle">BODY</text>',
              '<text x="401" y="279" class="fae-orbit-label" text-anchor="middle">MIND</text>',
            '</svg>',
            '<div class="fae-orbit-note">Two distinct systems. One reciprocal passage. Wyrdrune decides the proposal.</div>',
          '</div>',
          '<div class="fae-voyage-console">',
            '<p class="eyebrow">THE THIRD TIMELINE · RECIPROCAL BECOMING</p>',
            '<h2 id="fae-timeline-title">Touch the living engine.</h2>',
            '<p class="fae-console-intro">Choose a direction and actually send the paired infrastructure × intelligence proposal through native Wyrdrune, Tensor, Eightfold Observer, Return and Watercolour. Starts with explicitly synthetic evidence.</p>',
            '<div class="fae-voyage-mode" role="group" aria-label="Wyrdrune evolutionary direction">',
              '<button type="button" data-voyage-mode="repair" aria-pressed="true">◌ Repair <small>stressed systems</small></button>',
              '<button type="button" data-voyage-mode="expand" aria-pressed="false">✧ Expand <small>verified headroom</small></button>',
            '</div>',
            '<div class="fae-reciprocity-readouts" aria-live="polite">',
              '<div><span>Infrastructure</span><strong data-voyage-infra>Queue 24 → 20 · 1,200 → 1,450 ms</strong></div>',
              '<div><span>Intelligence</span><strong data-voyage-mind>Concurrent 4 → 3 · Context 2,048 → 1,792</strong></div>',
              '<div><span>Source</span><strong>SIMULATION · No live FAA or provider feed</strong></div>',
            '</div>',
            '<details class="fae-permission-chamber"><summary>Open the fictional Mythience membrane</summary>',
              '<p>These toggles are for a simulated crossing, not consent on behalf of a real participant.</p>',
              '<div class="fae-myth-consents"><label><input type="checkbox" data-voyage-consent="traveller"> Fictional traveller</label>',
              '<label><input type="checkbox" data-voyage-consent="origin"> Fictional origin</label>',
              '<label><input type="checkbox" data-voyage-consent="destination"> Fictional destination</label></div>',
            '</details>',
            '<div class="fae-voyage-actions">',
              '<button type="button" class="fae-primary-action" data-voyage-action="defer"><span aria-hidden="true">✦</span> Run Eightfold</button>',
              '<button type="button" class="glass-chip" data-voyage-action="accept">Accept sandbox carry</button>',
              '<button type="button" class="glass-chip" data-voyage-action="decline">Decline</button>',
              '<button type="button" class="glass-chip fae-feather-action" data-voyage-feather>🪽 Feather</button>',
            '</div>',
            '<div class="fae-portal-links"><button type="button" class="glass-chip" data-voyage-watercolor>Enter Watercolour</button>',
              '<button type="button" class="glass-chip" data-voyage-voice>Speak in Wyrdrune</button>',
              '<button type="button" class="glass-chip" data-voyage-mythience>Open Mythience</button></div>',
            '<p role="status" aria-live="polite" data-voyage-status class="fae-voyage-status">Waiting for your touch. Nothing runs on entry. House Steward sign-in required.</p>',
            '<details class="fae-receipt-drawer"><summary>Inspect the Return receipt</summary><pre data-voyage-evidence>No Return receipt yet.</pre></details>',
          '</div>',
        '</div>',
      '</section>',
      '<section class="organ-bay" aria-label="Mounted Wayglass organs">',
        organs.map((organ, index) => [
          '<article class="organ-vessel glass-panel" tabindex="0" data-organ="' + escapeHtml(organ.organ_id) + '" data-organ-kind="' + organKind(organ.organ_id) + '" aria-expanded="false" style="--organ-index:' + index + '">',
            '<div class="organ-core" aria-hidden="true"><i></i><b></b><span></span></div>',
            '<div class="organ-copy">',
              '<div class="organ-title"><p class="eyebrow">' + escapeHtml(organ.maturity) + '</p><h2>' + escapeHtml(shortName(organ.organ_id)) + '</h2></div>',
              '<p class="organ-role">' + escapeHtml(organ.authority_ceiling.slice(0,2).join(' · ')) + '</p>',
              '<p class="organ-lineage">Lineage · ' + organ.lineage.map(escapeHtml).join(' · ') + '</p>',
              '<div class="organ-tags">' + organ.capabilities.map(cap => '<span>' + escapeHtml(cap) + '</span>').join('') + '</div>',
              '<details><summary>Authority ceiling & evidence</summary>',
                '<p><strong>Ceiling:</strong> ' + organ.authority_ceiling.map(escapeHtml).join(' · ') + '</p>',
                '<p><strong>Receipts:</strong> ' + organ.receipt_schemas.map(escapeHtml).join(' · ') + '</p>',
                '<p><strong>Evidence:</strong> ' + organ.evidence.map(escapeHtml).join(' · ') + '</p>',
              '</details>',
            '</div>',
          '</article>'
        ].join('')).join(''),
      '</section>',
      '<footer class="wg-receipt tiny">Wayglass is the ship. These are mounted organs, not identities, worlds, or canon authorities.</footer>',
    '</section>'
  ].join('');

  const inspectButton = root.querySelector('[data-double-mobius-inspect]');
  const engineStatus = root.querySelector('[data-double-mobius-status]');
  inspectButton?.addEventListener('click', async () => {
    inspectButton.disabled = true;
    engineStatus.textContent = 'Checking the authenticated Gateway ↔ Wayglass host route…';
    try {
      const status = await inspectWayglassDoubleMobius();
      engineStatus.textContent = status.status === 'available-in-host'
        ? 'Double Möbius engine reachable · Eightfold '+ status.phases.length
          +' · Focus profiles '+ status.focus_profiles.length
          +' · host inspection only; no live model response or audio started.'
        : 'Engine returned: ' + String(status.status || 'unrecognised');
    } catch (error) {
      engineStatus.textContent = 'Engine not reachable through this session: ' + error.message;
    } finally {
      inspectButton.disabled = false;
    }
  });
  // The FAEpunk cockpit performs real authenticated host calls. It never
  // starts a run through a visual hover, drag, navigation or animation.
  let activeVoyage=null,selectedMode='repair';
  const portal=root.querySelector('[data-integrated-voyage-panel]');
  const status=root.querySelector('[data-voyage-status]');
  const evidence=root.querySelector('[data-voyage-evidence]');
  const directionButtons=[...root.querySelectorAll('[data-voyage-mode]')];
  const actionButtons=[...root.querySelectorAll('[data-voyage-action]')];
  function updateDirection(mode) {
    if(activeVoyage)return;
    selectedMode=mode;
    for(const control of directionButtons)
      control.setAttribute('aria-pressed',String(control.dataset.voyageMode===mode));
    const repair=mode==='repair';
    root.querySelector('[data-voyage-infra]').textContent=repair?
      'Queue 24 → 20 · Timeout 1,200 → 1,450 ms':
      'Queue 24 → 28 · Timeout 1,200 → 1,150 ms';
    root.querySelector('[data-voyage-mind]').textContent=repair?
      'Concurrency 4 → 3 · Context 2,048 → 1,792':
      'Concurrency 4 → 5 · Context 2,048 → 2,176';
    portal.dataset.voyageState='idle';
    status.textContent='Direction '+mode+' selected. This example uses simulation data only.';
  }
  for(const control of directionButtons)
    control.addEventListener('click',()=>updateDirection(control.dataset.voyageMode));
  async function runFlight(decision) {
    if(activeVoyage)return;
    const consents=[...root.querySelectorAll('[data-voyage-consent]')];
    const opted=consents.filter(x=>x.checked);
    if(opted.length!==0&&opted.length!==3){
      status.textContent='Mythience requires all three explicit fictional consents, or none.';
      return;
    }
    const controller=new AbortController();
    activeVoyage=controller;portal.dataset.voyageState='running';
    actionButtons.forEach(button=>button.disabled=true);
    directionButtons.forEach(button=>button.disabled=true);
    status.textContent='Native Wyrdrune is crossing the Eightfold · evidence → trial → Return…';
    evidence.textContent='Flight in progress; no verified Return yet.';
    try{
      const body=syntheticWayglassVoyage({
        includeFictionalMythience:opted.length===3,mode:selectedMode,decision,
      });
      const data=await runWayglassIntegratedVoyage(body,{signal:controller.signal});
      if(controller.signal.aborted||activeVoyage!==controller)return;
      const verified=data.status==='sandbox-return-verified';
      portal.dataset.voyageState=verified?'returned':'refused';
      const carried=data.evolution?.changed===true;
      status.textContent=verified?
        '✧ Return verified · Wyrdrune '+data.evolution.status+
        ' · Tensor '+data.tensor.backend+' · Octo '+data.autopoietic.outcome+
        ' · Observer '+data.observer.phase_records+' phases'+
        ' · Mythience '+(data.mythience?.status||'not invited')+
        ' · Watercolour now witnesses this receipt.'+
        (carried?' Sandbox carry changed for this request only; not yet persisted.':''):
        'Flight declined: '+String(data.reason||data.status).slice(0,220);
      evidence.textContent=verified?JSON.stringify({
        receipt_id:data.receipt_id,evidence_kind:data.evidence_kind,
        wtl_source_hash:data.evolution.wtl_source_hash,
        return_verdict:data.return_verification.verdict,
        status:data.evolution.status,
        inherited_configuration:data.evolution.carry,
        provenance:data.source_refs,
        actual_model_invoked:data.model_invoked,
        production_mutation:data.production_mutation,
        persisted:data.persisted,
      },null,2):'No accepted Return receipt.';
    }catch(error){
      if(activeVoyage===controller){
        portal.dataset.voyageState='refused';
        status.textContent=controller.signal.aborted?'Feather: flight stopped.':
          'Host unavailable or Wyrdrune refused: '+String(error.message||error).slice(0,220);
        evidence.textContent='No verified Return receipt.';
      }
    }finally{
      if(activeVoyage===controller)activeVoyage=null;
      if(!activeVoyage){actionButtons.forEach(b=>b.disabled=false);
        directionButtons.forEach(b=>b.disabled=false);}
    }
  }
  for(const control of actionButtons)
    control.addEventListener('click',()=>void runFlight(control.dataset.voyageAction));
  root.querySelector('[data-voyage-feather]')?.addEventListener('click',()=>{
    activeVoyage?.abort();activeVoyage=null;
    portal.dataset.voyageState='held';
    actionButtons.forEach(b=>b.disabled=false);
    directionButtons.forEach(b=>b.disabled=false);
    wayglassSomaticSound.feather();
    status.textContent='🪽 Feather held. This invocation stopped, sound and haptics paused.';
    evidence.textContent='Feather stopped the active flight. No new Return receipt.';
  });
  root.querySelector('[data-voyage-watercolor]')?.addEventListener('click',()=>{
    globalThis.__wayglassOS?.mount('wayglass:living-watercolor');
  });
  root.querySelector('[data-voyage-voice]')?.addEventListener('click',()=>{
    globalThis.__wayglassOS?.mount('wayglass:native-voice');
  });
  root.querySelector('[data-voyage-mythience]')?.addEventListener('click',()=>{
    globalThis.__wayglassOS?.mount('wayglass:mythience-crossing');
  });
  root.querySelector('[data-double-mobius-writing]')?.addEventListener('click', () => {
    globalThis.__wayglassOS?.mount('arcsweep:writing-room');
  });
  root.querySelectorAll('[data-wayglass-room]').forEach(button => {
    button.addEventListener('click', () => globalThis.__wayglassOS?.mount(button.dataset.wayglassRoom));
  });
  root.querySelectorAll('.organ-vessel').forEach(card => {
    const wake = () => globalThis.dispatchEvent?.(new CustomEvent('wayglass:material-wake', { detail: { strength: .62, intent: .45 } }));
    const setInspection = (open) => {
      card.dataset.inspecting = open ? 'true' : 'false';
      card.setAttribute('aria-expanded', String(open));
      if (open) wake();
    };
    card.addEventListener('pointerenter', () => setInspection(true));
    card.addEventListener('pointerleave', () => setInspection(false));
    card.addEventListener('focus', () => setInspection(true));
    card.addEventListener('blur', () => setInspection(false));
    card.addEventListener('click', (event) => {
      if (event.target.closest('details, summary')) return;
      setInspection(card.dataset.inspecting !== 'true');
    });
  });
}
