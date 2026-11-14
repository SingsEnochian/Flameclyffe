import { createInteractionState } from '../interaction-state.js';
import {mountFaepunkManuscript} from '../faeberpunk-manuscript.js';
import { previewWyrdrune, draftWyrdruneDiscussion } from '../wyrdrune-client.js';
import { animateWyrdruneCypher } from '../wyrdrune-cypher.js';
import '../wyrdrune-cypher-material.css';
import { scoreWyrdruneStory } from '../route-client.js';
import {shipSoundscape} from '../ship-soundscape.js';
import { wayglassSomaticSound, WAYGLASS_FEATHER_EVENT } from '../somatic-sound.js';
import { authorizationSession } from '../authorization-session.js';
import { mountWayglassRoutePicker } from '../route-picker.js';
import { WAYGLASS_WORLD_SEATS, findWayglassWorldSeat, wayglassWorldStatus } from '../world-seats.js';
import { consumeObserverContextForWriting, recordWayglassRouteObservation } from '../living-observer-model.js';
import { emitInteractionCue } from '../interaction-cues.js';
import { emitMaterialSignal } from '../material-state.js';
import { invokeWayglassRoute, listWayglassRoutes, listWayglassCharacters, leaveWayglassWorld, recoverWayglassDeparture } from '../route-client.js';
import { EMERGENCE_QUESTIONS, bittyTwiQuestionPrompt } from '../emergence-questions.js';
import { createWayglassChatVault } from '../wayglass-chat-vault.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function sessionId() {
  return globalThis.crypto?.randomUUID?.() || 'wayglass-' + Date.now();
}

function renderThinking(message) {
  if (!message?.thinking) return '';
  return '<details class="turn-thinking">' +
    '<summary><span class="thinking-chevron" aria-hidden="true">&gt;</span> Thinking</summary>' +
    '<div class="thinking-trace">' + escapeHtml(message.thinking).replaceAll('\n', '<br>') + '</div>' +
    '</details>';
}

export async function mountArcSweepWritingSurface(root) {
  const interaction = createInteractionState({ channel: 'IC', turn_owner: 'Rowan', interaction_mode: 'ordinary' });
  // Owner-invited per-browser conversation storage. Model receipts remain
  // observations, not server custody or a verified Return.
  const storedSession = globalThis.sessionStorage?.getItem('wayglass:first-contact-session');
  let session = storedSession || sessionId();
  if (!storedSession) globalThis.sessionStorage?.setItem('wayglass:first-contact-session', session);
  const messages = [];
  let chatVault=null,chatVaultProblem='';
  try{
    chatVault=createWayglassChatVault();
    const recovered=chatVault.open(session);
    if(recovered)messages.push(...recovered.messages);
  }catch(error){chatVaultProblem=error.message||'Browser conversation storage is unavailable';}
  let routes = [];
  let selectedRoute = authorizationSession.route() || 'local:ollama';
  let selectedCharacter = '';
  let characters = [];
  let emergenceIndex = 0;
  let busy = false;
  let lastReceipt = null;
  let checkpoint = null;
  let revisionOf = null;
  let lastWTLPreview = null, lastWTLSource = null;

  root.innerHTML = [
    "<section class=\"wg-surface wg-writing-room\" data-surface=\"arcsweep-writing\">\n",
    "  <nav class=\"wg-deck-nav glass-panel\" aria-label=\"Wayglass rooms\">\n",
    "    <button type=\"button\" class=\"glass-chip active\" aria-current=\"page\">Writing Room</button>\n",
    "    <button type=\"button\" class=\"glass-chip\" data-wayglass-room=\"wayglass:systems\">Organs</button>\n",
    "    <button type=\"button\" class=\"glass-chip\" data-wayglass-room=\"wayglass:video-atelier\">Video Atelier</button>\n",
    "    <button type=\"button\" class=\"glass-chip\" data-wayglass-room=\"wayglass:living-observer\">Living Observer</button>\n",
    '<button type="button" class="glass-chip" data-wayglass-room="wayglass:library">Library</button>',
    '<button type="button" class="glass-chip" data-wayglass-room="wayglass:toybox">Toybox</button>',
    '<button type="button" class="glass-chip" data-wayglass-room="wayglass:acoustic-room">Acoustic Room</button><button type="button" class="glass-chip" data-wayglass-room="wayglass:spectral-field">Full Spectrum</button>',
    '<button type="button" class="glass-chip" data-wayglass-room="wayglass:commons">Commons</button>',
    '<button type="button" class="glass-chip" data-wayglass-room="wayglass:mythience-crossing">Mythience</button>',
    '<button type="button" class="glass-chip" data-wayglass-room="wayglass:universal-codex">Universal Codex</button>',
    "  </nav>\n",
    "  <header class=\"wg-surface-head glass-panel\">\n",
    "    <div class=\"wg-hero-copy\">\n",
    "      <p class=\"eyebrow\">WAYGLASS · WRITING DECK</p>\n",
    "      <h1>Writing Room</h1>\n",
    "      <p class=\"lede\">Round-robin co-writing through Wayglass.<br>The route may change; the room stays itself.</p>\n",
    "    </div>\n",
    "    <div class=\"wg-route-block\">\n",
    "      <div class=\"route-mineral\" aria-hidden=\"true\"><i></i><b></b><span></span></div>\n",
    "      <div class=\"wg-route-controls\">\n",
          '<label for="wg-character">Character voice</label>',
          '<select id="wg-character" aria-label="Wayglass character voice"><option value="">No character seat</option></select>',
          '<button type="button" id="wg-first-contact" class="glass-chip">Speak with Wayglass</button>',
    "        <label id=\"wg-route-label\">Route</label>\n",
    "        <div id=\"wg-route\"></div>\n",
    "        <label class=\"wg-thinking-toggle\"><input id=\"wg-think\" type=\"checkbox\" /> Deliberate thinking (local engine)</label>\n",
    "        <span id=\"wg-route-state\" class=\"tiny\" role=\"status\">Loading route catalogue…</span>\n",
    "        <span id=\"wg-embodiment-state\" class=\"tiny\"></span>\n",
    "      </div>\n",
    "    </div>\n",
    "  </header>\n",
    "  <section class=\"wg-constellation-strip glass-panel\" aria-label=\"Our Constellation\">\n",
    "    <div class=\"wg-constellation-symbol\" aria-hidden=\"true\">✦</div>\n",
    "    <div class=\"wg-constellation-place\">\n",
    "      <p class=\"eyebrow\">OUR CONSTELLATION</p>\n",
    "      <span class=\"tiny\">Speaking place</span>\n",
    "      <strong id=\"wg-place-name\">Writing Room</strong>\n",
    "      <span id=\"wg-place-hint\" class=\"tiny\">The place stays itself across route changes.</span>\n",
    "    </div>\n",
    "  </section>\n",
    "  <section class=\"wg-world-gate glass-panel\" aria-label=\"World setting\">\n",
    "    <label for=\"wg-world-seat\">World</label>\n",
    "    <select id=\"wg-world-seat\" aria-label=\"Wayglass story world\"></select>\n",
    "    <p class=\"tiny\" id=\"wg-world-status\" role=\"status\">World and provider routes are independent.</p>\n",
    '<button type="button" id="wg-griff-check" class="glass-chip" hidden>Check Griff connection</button>',
    "  </section>\n",
          '<div id="wg-stepfun-transfer" class="wg-stepfun-transfer" hidden>',
            '<label for="wg-stepfun-consent"><input type="checkbox" id="wg-stepfun-consent" /> <span id="wg-provider-consent-label">I approve this external provider transfer.</span></label>',
          '</div>',
      '<section id="wg-emergence-interview" class="glass-panel" aria-label="Bitty Twi emergence interview" hidden>',
        '<div class="wg-emergence-invitation">',
          '<strong>Bitty Twi · Emergence Questions</strong>',
          '<p class="tiny">Six sourced questions, one turn at a time. Every answer is an unreviewed conversation, not a canon declaration. She may decline or question the premise.</p>',
          '<span id="wg-emergence-progress" class="tiny">Question 1 of 6</span>',
          '<button id="wg-emergence-next" type="button" class="glass-chip">Ask next Emergence Question</button>',
        '</div>',
      '</section>',
    "  <div class=\"wg-writing-workspace\">\n",
    "    <main class=\"wg-writing-main glass-panel\" aria-label=\"Writing desk\">\n",
    "      <section class=\"wg-control-ribbon\" aria-label=\"Writing state\">\n",
    "        <div class=\"glass-segment\" role=\"group\" aria-label=\"IC or OOC\">\n",
    "          <button type=\"button\" class=\"glass-chip active\" data-channel=\"IC\" aria-pressed=\"true\" aria-keyshortcuts=\"Alt+I\">IC</button>\n",
    "          <button type=\"button\" class=\"glass-chip\" data-channel=\"OOC\" aria-pressed=\"false\" aria-keyshortcuts=\"Alt+O\">OOC</button>\n",
    "        </div>\n",
    '<div class="glass-segment" role="group" aria-label="Wonder mode">',
    '<button type="button" class="glass-chip active" data-wonder-mode="ordinary" aria-pressed="true">Ordinary</button>',
    '<button type="button" class="glass-chip" data-wonder-mode="counterfactual-wonder" aria-pressed="false">Wonder</button>',
    '<button type="button" class="glass-chip" data-wonder-mode="complexify" aria-pressed="false">Complexify</button>',
    '</div>',
    "        <div class=\"turn-jewel\"><span>Turn</span><strong id=\"wg-turn-owner\">Rowan</strong></div>\n",
    "        <details class=\"ownership-drawer\">\n",
    "          <summary>Character ownership</summary>\n",
    "          <form id=\"wg-ownership-form\" class=\"ownership-form\">\n",
    "            <input name=\"character\" placeholder=\"Character\" aria-label=\"Character name\" />\n",
    "            <input name=\"owner\" placeholder=\"Owner\" aria-label=\"Character owner\" />\n",
    "            <select name=\"permission\" aria-label=\"Ownership type\">\n",
    "              <option value=\"owned\">Owned</option>\n",
    "              <option value=\"shared\">Shared</option>\n",
    "              <option value=\"temporary-handoff\">Temporary handoff</option>\n",
    "            </select>\n",
    "            <button type=\"submit\" class=\"glass-chip\">Bind</button>\n",
    "          </form>\n",
    "          <div id=\"wg-ownership-list\" class=\"ownership-list\"></div>\n",
    "        </details>\n",
    "      </section>\n",
    '<section id="fae-manuscript-host" class="fae-writing-worktable" aria-label="Rich text manuscript worktable"></section>',
    "      <section class=\"wg-thread\" aria-label=\"Writing conversation\" aria-live=\"polite\">\n",
    "        <div id=\"wg-thread\" class=\"wg-thread-log\"><div class=\"empty-thread\"><span class=\"wg-empty-feather\" aria-hidden=\"true\">✧</span><strong>The room is quiet. Start anywhere.</strong><small>Your conversation will unfold here.</small></div></div>\n",
    "      </section>\n",
    "      <section class=\"wg-composer\" aria-label=\"Compose a turn\">\n",
    "        <textarea id=\"wg-input\" rows=\"4\" placeholder=\"Write the next turn…\" aria-label=\"Next writing turn\" aria-keyshortcuts=\"Alt+W Control+Enter Meta+Enter\"></textarea>\n",
    '<div id="wg-revision-note" class="wg-revision-note" hidden><span>Revising a previous turn. Sending adds a correction; the original and receipts stay unchanged.</span><button id="wg-revision-cancel" type="button" class="glass-chip">Cancel revision</button></div>',
    "        <div class=\"composer-foot\">\n",
    "          <span id=\"wg-status\" class=\"tiny\">IC · Rowan has the turn</span>\n",
    "          <button id=\"wg-send\" type=\"button\" class=\"send-jewel\"><span aria-hidden=\"true\">➤</span> Send to Writing Room</button>\n",
    "        </div>\n",
    "      </section>\n",
    '<section class="wg-wyrdrune-soundscape glass-panel" aria-label="Wyrdrune living story soundscape" style="border-radius:1.5rem;padding:1.1rem;margin-block:1rem;">',
      '<p class="eyebrow">Wyrdrune · Double Möbius score</p>',
      '<h2>Living Soundscape</h2>',
      '<p class="tiny">Your prose and the selected model’s actual returned turns change two interwoven voices. The harmonic relationship is your chosen value, never inferred from private thoughts. The score itself is executable Wyrdrune.</p>',
      '<label><input id="wg-score-live" type="checkbox"> Let Wyrdrune read this room as I write</label>',
      '<p class="tiny">When enabled, the current draft and recent in-character turns are sent to your authenticated Wayglass host. Nothing goes to the model until you explicitly send a turn.</p>',
      '<label for="wg-score-affinity">Participants · harmonic closeness <input id="wg-score-affinity" type="range" min="0" max="1" step="0.05" value="0.5"></label>',
      '<output id="wg-score-affinity-output">0.50</output>',
      '<div style="display:flex;gap:.65rem;flex-wrap:wrap;align-items:center;margin-block:.6rem;">',
        '<button type="button" class="glass-chip" id="wg-score-audio" aria-pressed="false">Enable sound</button>',
        '<label><input id="wg-score-mono" type="checkbox" checked> Mono-safe</label>',
        '<button type="button" class="glass-chip" id="wg-score-feather">🪽 Feather Stop</button>',
      '</div>',
      '<p id="wg-score-status" class="tiny" role="status">Quiet. Live scoring and audio are off.</p>',
      '<output id="wg-score-readout" class="tiny" aria-live="polite">No Wyrdrune harmonics yet.</output>',
      '<p class="tiny">A genuine routed reply can join the score after Send; route provenance remains visible in the Writing Room. Sound never starts automatically.</p>',
    '</section>',
    '<section class="wg-wtl-panel" aria-label="Wyrdrune ritual workbench">',
      '<button type="button" class="glass-chip fae-codex-door" data-wayglass-room="wayglass:universal-codex">◇ Open the Universal Codex</button>',
      '<details id="wg-wtl-details" class="glass-panel">',
        '<summary>Wyrdrune · Eightfold Ritual Workbench</summary>',
        '<p class="tiny">Preview the Eightfold locally. You decide whether to discuss it with your selected model or SpicyChat route; nothing sends automatically.</p>',
        '<textarea id="wg-wtl-source" data-wtl-code="true" spellcheck="false" rows="10" maxlength="16000" aria-label="Wyrdrune WTL source" placeholder="mobius { perceive { ... } ... }"></textarea>',
        '<div class="wg-wtl-actions"><button type="button" class="glass-chip" id="wg-wtl-example">Insert example</button><button type="button" class="glass-chip" id="wg-wtl-preview">Preview Eightfold</button><button type="button" class="glass-chip" id="wg-wtl-discuss" disabled>Stage for model discussion</button><button type="button" class="glass-chip" id="wg-wtl-cypher">Read in English</button><button type="button" class="glass-chip wg-cypher-skip" id="wg-wtl-cypher-skip" disabled>Reveal English now</button></div>',
        '<p id="wg-wtl-status" class="tiny" role="status">No Wyrdrune preview yet. Sign in as House Steward to use the compiler.</p>',
        '<pre id="wg-wtl-output" aria-label="Wyrdrune phase receipts" hidden></pre>',
        '<div id="wg-wtl-gloss" class="wg-wtl-gloss wg-cypher-veil" aria-label="Wyrdrune read in English" aria-live="off" hidden></div>',
      '</details>',
    '</section>',
    "    </main>\n",
    "    <aside class=\"wg-session-sidebar glass-panel\" aria-label=\"Session and continuity\">\n",
    "      <div class=\"wg-sidebar-tabs\" role=\"tablist\" aria-label=\"Session views\">\n",
    "        <button type=\"button\" role=\"tab\" id=\"wg-tab-session\" data-wg-side-tab=\"session\" aria-selected=\"true\" aria-controls=\"wg-panel-session\">Session</button>\n",
    "        <button type=\"button\" role=\"tab\" id=\"wg-tab-continuity\" data-wg-side-tab=\"continuity\" aria-selected=\"false\" aria-controls=\"wg-panel-continuity\" tabindex=\"-1\">Continuity</button>\n",
    "      </div>\n",
    "      <section id=\"wg-panel-session\" class=\"wg-sidebar-view\" role=\"tabpanel\" aria-labelledby=\"wg-tab-session\">\n",
    "        <button id=\"wg-copy-session\" type=\"button\" class=\"glass-chip wg-copy-session\">▤ Copy session log</button>\n",
        '<div class="wg-chat-vault glass-panel" aria-label="Saved conversations">',
        '<label for="wg-chat-saved">Saved chats on this browser</label>',
        '<select id="wg-chat-saved" aria-label="Saved Wayglass conversations"></select>',
        '<div class="wg-chat-vault-actions"><button id="wg-chat-open" type="button" class="glass-chip">Open chat</button><button id="wg-chat-new" type="button" class="glass-chip">New chat</button><button id="wg-chat-copy" type="button" class="glass-chip">Copy chat JSON</button></div>',
        '<p id="wg-chat-save-status" role="status" class="tiny">Chat saves here after each turn with attribution.</p>',
        '</div>',
    "        <div class=\"wg-session-empty\" aria-hidden=\"true\"><span>♧</span></div>\n",
    "        <p class=\"wg-session-explainer\"><strong>Session history</strong><span>Responses remain in the writing desk. Copy the session log whenever you wish.</span></p>\n",
    "        <p id=\"wg-receipt\" class=\"tiny\">No route receipt yet.</p>\n",
    "      </section>\n",
    "      <section id=\"wg-panel-continuity\" class=\"wg-sidebar-view wg-continuity-view\" role=\"tabpanel\" aria-labelledby=\"wg-tab-continuity\" hidden>\n",
    "        <h2>Continuity checkpoint</h2>\n",
    "        <label>World <input id=\"wg-cp-world\" value=\"wayglass:writing-room\"></label>\n",
    "        <label>Participant <input id=\"wg-cp-participant\" value=\"rowan\"></label>\n",
    "        <label>Checkpoint text <textarea id=\"wg-cp-text\" rows=\"3\"></textarea></label>\n",
    "        <label>Open questions (one per line) <textarea id=\"wg-cp-questions\" rows=\"2\"></textarea></label>\n",
    "        <label>Stop point <input id=\"wg-cp-stop\"></label>\n",
    "        <label>Next owner <input id=\"wg-cp-owner\" value=\"Rowan\"></label>\n",
    "        <button id=\"wg-cp-save\" type=\"button\" class=\"glass-chip\">Save checkpoint</button>\n",
    "        <label>Storage receipt ID <input id=\"wg-cp-id\"></label>\n",
    "        <button id=\"wg-cp-recover\" type=\"button\" class=\"glass-chip\">Recover checkpoint</button>\n",
    "        <p id=\"wg-cp-status\" role=\"status\" class=\"tiny\">No stored checkpoint attached.</p>\n",
    "      </section>\n",
    "    </aside>\n",
    "  </div>\n",
    "  <footer class=\"wg-receipt tiny\"><span class=\"keyboard-hint\">Keyboard: Alt+I/O channel · Alt+R route · Alt+W write · Ctrl/Cmd+Enter send</span></footer>\n",
    "</section>\n",
  ].join('');

  root.querySelectorAll('[data-wayglass-room]').forEach(button => button.addEventListener('click', () => globalThis.__wayglassOS?.mount(button.dataset.wayglassRoom)));

  const routePicker = mountWayglassRoutePicker(root.querySelector('#wg-route'), { onChange(value) {
    selectedRoute = value;
    if (selectedCharacter === 'wayglass' && value !== 'wayglass:ship') {
      selectedCharacter = '';
      characterSelect.value = '';
    }
    externalConsent.checked = false;
    refreshExternalTransfer();
    wakeMaterial(0.88, 'route');
    routeState.textContent = 'Active · ' + selectedRouteLabel();
  } });
  const characterSelect = root.querySelector('#wg-character');
  const firstContact = root.querySelector('#wg-first-contact');
  const routeSelect = root.querySelector('#wg-route');
  const routeState = root.querySelector('#wg-route-state');
  const emergencePanel = root.querySelector('#wg-emergence-interview');
  const emergenceProgress = root.querySelector('#wg-emergence-progress');
  const emergenceNext = root.querySelector('#wg-emergence-next');
  const embodimentState = root.querySelector('#wg-embodiment-state');
  const externalTransfer = root.querySelector('#wg-stepfun-transfer');
  const externalConsent = root.querySelector('#wg-stepfun-consent');
  const externalConsentLabel = root.querySelector('#wg-provider-consent-label');
  const channelButtons = [...root.querySelectorAll('[data-channel]')];
  const wonderButtons = [...root.querySelectorAll('[data-wonder-mode]')];
  const turnOwner = root.querySelector('#wg-turn-owner');
  const ownershipForm = root.querySelector('#wg-ownership-form');
  const ownershipList = root.querySelector('#wg-ownership-list');
  const thread = root.querySelector('#wg-thread');
  const input = root.querySelector('#wg-input');
  const manuscript=mountFaepunkManuscript(root.querySelector('#fae-manuscript-host'),{
    feather:()=>wayglassSomaticSound.snapshot().feather_stopped,
    onStage:text=>{if(!input.value.trim())input.value=text;
      else input.value+='\n\n'+text;
      input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();},
  });
  const wtlSource=root.querySelector('#wg-wtl-source'),wtlStatus=root.querySelector('#wg-wtl-status');
  const wtlOutput=root.querySelector('#wg-wtl-output'),wtlDiscuss=root.querySelector('#wg-wtl-discuss');
  const WTL_EXAMPLE="mobius {\n perceive { let light = votive(\"Lantern\",\"An offered guiding light\"); }\n compress { let shape = star(8); }\n release { let letter = angelicLetter(1); }\n verify { emit light; }\n integrate { emit shape; }\n choose { emit letter; }\n return { emit \"held\"; }\n transcend { emit 1; }\n}";
  // Wyrdrune's compiled programme is translated without a model call.
  const wtlGloss=root.querySelector('#wg-wtl-gloss'),cypherSkip=root.querySelector('#wg-wtl-cypher-skip');let cypher=null;
  root.querySelector('#wg-wtl-cypher').addEventListener('click',()=>{
    if(wayglassSomaticSound.snapshot().feather_stopped)return;
    cypher?.stop();
    try {
      const reduce=Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
      wtlGloss.hidden=false;
      cypher=animateWyrdruneCypher(wtlGloss,{
        source:wtlSource.value,reducedMotion:reduce,
        onComplete:()=>{
          cypherSkip.disabled=true;
          wtlStatus.textContent='English reading complete; original Wyrdrune preserved. No model contacted.';
        },
      });
      cypherSkip.disabled=wtlGloss.getAttribute('data-cypher-state')!=='reading';
      if(!cypherSkip.disabled)wtlStatus.textContent='Wyrdrune glyphs unfolding into English. You can reveal the reading immediately.';
    } catch(error){
      cypherSkip.disabled=true;wtlGloss.hidden=true;
      wtlStatus.textContent='Not yet readable in English: '+String(error?.message||error);
    }
  });
  cypherSkip.addEventListener('click',()=>cypher?.stop());
  root.querySelector('#wg-wtl-example').addEventListener('click',()=>{
    wtlSource.value=WTL_EXAMPLE;lastWTLSource=null;lastWTLPreview=null;wtlDiscuss.disabled=true;
    cypher?.stop();cypherSkip.disabled=true;wtlGloss.hidden=true;wtlGloss.replaceChildren();
    wtlStatus.textContent='Example loaded. Preview to obtain phase receipts.';
  });
  wtlSource.addEventListener('input',()=>{
    lastWTLSource=null;lastWTLPreview=null;wtlDiscuss.disabled=true;wtlOutput.hidden=true;
    cypher?.stop();cypherSkip.disabled=true;wtlGloss.hidden=true;wtlGloss.replaceChildren();
    wtlStatus.textContent='WTL source changed. Preview again before discussing.';
  });
  root.querySelector('#wg-wtl-preview').addEventListener('click',async(event)=>{
    const button=event.currentTarget,source=wtlSource.value;
    if(button.disabled)return;button.disabled=true;wtlDiscuss.disabled=true;
    try {
      const preview=await previewWyrdrune(source);
      if(wtlSource.value!==source){wtlStatus.textContent='Source changed during preview. Run it again.';return;}
      lastWTLPreview=preview;lastWTLSource=source;
      wtlOutput.textContent=JSON.stringify({receiptHash:preview.receiptHash,integrity:preview.verification,returnLedger:preview.ritualLedger,phases:preview.phaseReceipts,values:preview.values,withness:preview.withness},null,2);
      wtlOutput.hidden=false;wtlDiscuss.disabled=false;
      wtlStatus.textContent='Eightfold receipt independently verified in browser. No model contacted; ritual meaning stays with you.';
    } catch(error) {
      lastWTLPreview=null;lastWTLSource=null;wtlOutput.hidden=true;
      wtlStatus.textContent='Preview unavailable: '+error.message;
    } finally {button.disabled=false;}
  });
  wtlDiscuss.addEventListener('click',()=>{
    if(!lastWTLPreview||lastWTLSource!==wtlSource.value)return;
    const draft=draftWyrdruneDiscussion(lastWTLSource,lastWTLPreview);
    const staged=input.value.trim()?input.value.trim()+'\n\n'+draft:draft;
    if(staged.length>11000){wtlStatus.textContent='Draft exceeds 11000 characters. Shorten the composer first.';return;}
    input.value=staged;input.focus();
    wtlStatus.textContent='WTL staged. Review, choose your route and press Send when you wish.';
  });

  const sharedObserverReading = consumeObserverContextForWriting();
  if (sharedObserverReading) input.value = sharedObserverReading + '\n\n[My question about this observation:]\n';
  // Universal Codex stages only an explicitly reviewed text, never sends it.
  try{
    const staged=globalThis.sessionStorage?.getItem('wayglass:universal-codex:writing-handoff/v1');
    if(staged&&staged.length<=11000){
      const joined=[input.value.trim(),staged].filter(Boolean).join('\n\n');
      if(joined.length<=11000){input.value=joined;
        globalThis.sessionStorage?.removeItem('wayglass:universal-codex:writing-handoff/v1');}
    }
  }catch{/* Browser session unavailable; do not overwrite a live draft. */}

  // This UI transports text and renders the Wyrdrune score. It does not
  // implement the musical decisions, which live only in the .wtl program.
  const scoreLive = root.querySelector('#wg-score-live');
  const scoreAudioButton = root.querySelector('#wg-score-audio');
  const scoreMono = root.querySelector('#wg-score-mono');
  const scoreAffinity = root.querySelector('#wg-score-affinity');
  const scoreAffinityOutput = root.querySelector('#wg-score-affinity-output');
  const scoreStatus = root.querySelector('#wg-score-status');
  const scoreReadout = root.querySelector('#wg-score-readout');
  const scoreAudio = shipSoundscape;
  let soundscapeDisposed = false;
  let soundscapeTimer = null;
  let soundscapeAbort = null;
  let soundscapeRevision = 0;
  let soundscapeAudioOn = false;
  let lastSoundscape = null;
  const offShipSound=scoreAudio.subscribe(state=>{
    soundscapeAudioOn=state.source==='extended'&&state.playing;
    scoreAudioButton.textContent=soundscapeAudioOn?'Stop sound':'Enable sound';
    scoreAudioButton.setAttribute('aria-pressed',String(soundscapeAudioOn));
  });

  function scoreParticipants() {
    // A route identifier is an attributed transport endpoint, not an
    // unverified claim to the personality or identity of Wayglass.
    return [
      {id:'participant:rowan',kind:'participant-declared'},
      {id:'route:' + (selectedRoute || 'none'),kind:'model-route'},
    ];
  }
  function recentStoryText() {
    const previous = messages.filter(item => item.channel === 'IC'
      && item.world_id === cp('world').value.trim()
      && !item.content.startsWith('[Route error]')).slice(-4)
      .map(item => item.content);
    return [...previous, input.value].join('\n').slice(-4900);
  }
  function applyScore(frame) {
    lastSoundscape = frame;
    scoreAudio.setExtended(frame);
    const score = frame.score;
    // A Wyrdrune-authored story score joins the larger ship field by metadata.
    // No story text or participant identity is copied into spectral capture.
    globalThis.__wayglassOS?.fullSpectrum?.capture({
      kind:'writing',strength:score.pulse,motion:score.pulse,
      continuity:.85,intent:.8,relationship:score.relationshipAffinity,
      source_ref:'wayglass:story-soundscape',
    });
    scoreReadout.textContent = 'Wyrdrune · '+score.rootHz.toFixed(1)+' Hz ⇄ '
      +score.counterpartHz.toFixed(1)+' Hz · affinity '+score.relationshipAffinity.toFixed(2)
      +' · below '+score.infrasonic.hz.toFixed(2)+' Hz · above '+(score.ultrasonic.hz/1000).toFixed(2)+' kHz (virtual)'
      +' · '+frame.eightfold.length+' phase receipts · '+frame.story_sha256.slice(0,12);
    if (soundscapeAudioOn) {
      scoreAudio.setMono(scoreMono.checked);
    }
  }
  function stopScoreAudio() {
    soundscapeAudioOn = false;
    if(scoreAudio.snapshot().source==='extended')scoreAudio.stop();
    scoreAudioButton.textContent = 'Enable sound';
    scoreAudioButton.setAttribute('aria-pressed','false');
  }
  async function updateStoryScore() {
    const revision = ++soundscapeRevision;
    soundscapeAbort?.abort();
    soundscapeAbort = typeof AbortController === 'function' ? new AbortController() : null;
    if (soundscapeDisposed || !scoreLive.checked) return;
    if (interaction.snapshot().channel !== 'IC') {
      scoreStatus.textContent = 'The score follows in-character writing only.';
      return;
    }
    const text = recentStoryText();
    try {
      const scored = await scoreWyrdruneStory({
        text,participants:scoreParticipants(),affinity:Number(scoreAffinity.value),
        turns:messages.filter(m => m.channel === 'IC' && m.world_id === cp('world').value.trim()
          && !m.content.startsWith('[Route error]')).length,
        signal:soundscapeAbort?.signal,
      });
      if (soundscapeDisposed || revision !== soundscapeRevision || !scoreLive.checked) return;
      if (scored.schema !== 'wayglass.wyrdrune-story-soundscape/v0.1'
        || scored.withness?.completedCycles !== 2 || scored.eightfold?.length !== 16) {
        throw new Error('The double Möbius score returned an invalid receipt.');
      }
      applyScore(scored);
      scoreStatus.textContent = 'Two Möbius turns complete. Wyrdrune is scoring '
        + (soundscapeAudioOn ? 'audibly.' : 'silently.') + ' No model was invoked by scoring.';
    } catch (error) {
      if (soundscapeDisposed || revision !== soundscapeRevision
        || error?.name === 'AbortError') return;
      scoreStatus.textContent = 'Wyrdrune score unavailable: ' + error.message;
    }
  }
  function queueStoryScore() {
    if (soundscapeTimer != null) globalThis.clearTimeout(soundscapeTimer);
    if (!scoreLive.checked || soundscapeDisposed) {
      soundscapeRevision++;
      soundscapeAbort?.abort();
      return;
    }
    soundscapeTimer = globalThis.setTimeout(() => {
      soundscapeTimer = null;
      void updateStoryScore();
    }, 450);
  }
  function onSharedFeather(event) {
    if (event?.detail?.stopped === true) {
      cypher?.stop();cypherSkip.disabled=true;
      scoreLive.checked = false;
      queueStoryScore();
      stopScoreAudio();
      scoreStatus.textContent = 'Feather Stop · quiet and held. Restart requires a new choice.';
    }
  }
  globalThis.addEventListener?.(WAYGLASS_FEATHER_EVENT,onSharedFeather);
  scoreLive.addEventListener('change', () => {
    if (!scoreLive.checked) {
      queueStoryScore();
      stopScoreAudio();
      scoreStatus.textContent = 'Live story scoring disabled.';
    } else {
      if (wayglassSomaticSound.snapshot().feather_stopped) {
        scoreLive.checked = false;
        scoreStatus.textContent = 'Feather Stop is active. Release it explicitly before scoring again.';
        return;
      }
      scoreStatus.textContent = 'Wyrdrune is reading the in-character draft through the House host.';
      queueStoryScore();
    }
  });
  scoreAffinity.addEventListener('input', () => {
    scoreAffinityOutput.textContent = Number(scoreAffinity.value).toFixed(2);
    queueStoryScore();
  });
  scoreMono.addEventListener('change', () => {
    if(soundscapeAudioOn) scoreAudio.setMono(scoreMono.checked);
  });
  scoreAudioButton.addEventListener('click', async () => {
    if (soundscapeAudioOn) { stopScoreAudio();scoreStatus.textContent='Sound stopped. Wyrdrune may continue scoring silently.';return; }
    if (wayglassSomaticSound.snapshot().feather_stopped) {
      scoreStatus.textContent = 'Feather Stop active. Confirm release from the existing sound controls.';
      return;
    }
    if (!scoreLive.checked || !lastSoundscape) {
      scoreStatus.textContent = 'Enable live Wyrdrune scoring and obtain a valid score before sound.';
      return;
    }
    try{await scoreAudio.playExtended({mono:scoreMono.checked});}
    catch(error){scoreStatus.textContent='Sound unavailable: '+error.message;return;}
    soundscapeAudioOn = true;
    scoreAudioButton.textContent = 'Stop sound';
    scoreAudioButton.setAttribute('aria-pressed','true');
    scoreStatus.textContent = 'Playing two score-derived voices through the existing Wayglass acoustic mixer.';
  });
  root.querySelector('#wg-score-feather').addEventListener('click', () => {
    wayglassSomaticSound.feather();
    scoreLive.checked = false;
    queueStoryScore();
    stopScoreAudio();
    scoreStatus.textContent = 'Feather Stop · all local score voices stopped.';
  });
  input.addEventListener('input',queueStoryScore);

  const status = root.querySelector('#wg-status');
  const send = root.querySelector('#wg-send');
  const cp = name => root.querySelector('#wg-cp-' + name);
  const worldSelect = root.querySelector('#wg-world-seat');
  const worldStatus = root.querySelector('#wg-world-status');
  const griffCheck = root.querySelector('#wg-griff-check');
  for (const world of WAYGLASS_WORLD_SEATS) {
    const option = root.ownerDocument.createElement('option');
    option.value = world.world_id;
    option.textContent = world.character ? world.name + ' · ' + world.character.name : world.name;
    worldSelect.append(option);
  }
  function selectWorldSeat(worldId, { resetCheckpoint = true } = {}) {
    const world = findWayglassWorldSeat(worldId);
    if (!world) return;
    const changed = cp('world').value !== world.world_id;
    worldSelect.value = world.world_id;
    cp('world').value = world.world_id;
    // Local atlas lineage changes with the actual selected narrative world.
    globalThis.__wayglassOS?.fullSpectrum?.setScope({
      room:'arcsweep:writing-room',world:world.world_id,
    });
    root.querySelector('#wg-place-name').textContent = world.name;
    root.querySelector('#wg-place-hint').textContent = world.character
      ? world.character.name + ' · world anchor; transport status shown separately'
      : 'The place stays itself across route changes.';
    worldStatus.textContent = wayglassWorldStatus(world);
    griffCheck.hidden = world.world_id !== 'evil-gene:film-2015';
    if (changed && resetCheckpoint) {
      checkpoint = null;
      cp('id').value = '';
      cp('status').textContent = 'World changed. Attach a verified checkpoint for this world before returning.';
    }
  }
  worldSelect.addEventListener('change', () => {
    selectWorldSeat(worldSelect.value);
    const world = findWayglassWorldSeat(worldSelect.value);
    // Explicit world selection prepares only that world's own route.
    selectedRoute = world?.character?.desired_route_id || (authorizationSession.route() || 'local:ollama');
    selectedCharacter = '';
    characterSelect.value = '';
    externalConsent.checked = false;
    // A world crossing never drags its predecessor's continuous audio along.
    stopScoreAudio();
    globalThis.__wayglassOS?.fullSpectrum?.capture({kind:'world',strength:.8,motion:.6,
      continuity:.95,intent:.8,source_ref:'wayglass:story-world-crossing'});
    lastSoundscape = null;
    scoreReadout.textContent = 'A new world needs its own Wyrdrune score.';
    queueStoryScore();
    void loadRoutes();
  });
  selectWorldSeat(cp('world').value, { resetCheckpoint: false });
  griffCheck.addEventListener('click', async () => {
    griffCheck.disabled = true;
    worldStatus.textContent = 'Checking Griff’s exact SpicyChat conversation with the House Steward session…';
    try {
      const response = await fetch('/api/v1/wayglass/griff/status', { cache: 'no-store', credentials: 'same-origin' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || (result.missing?.length
        ? 'Private Hearthgate configuration missing: ' + result.missing.join(', ') : 'Provider preflight unavailable.'));
      worldStatus.textContent = result.preflight_verified
        ? 'Griff’s private character and conversation pair confirmed by SpicyChat. No live reply yet; tick consent and send a turn.'
        : 'Griff preflight could not confirm the exact conversation. No message sent.';
    } catch (error) {
      worldStatus.textContent = 'Griff connection check: ' + error.message;
    } finally { griffCheck.disabled = false; }
  });
  cp('save').addEventListener('click', async () => {
    try {
      const worldId = cp('world').value.trim(), participantId = cp('participant').value.trim();
      const result = await leaveWayglassWorld({worldId, participantId, routeId: selectedRoute,
        identityDeclarations: [{entity_id: participantId, declaration: 'Caller-declared checkpoint participant'}],
        activeWork: [{description: cp('text').value}], unresolvedWonderQuestions: cp('questions').value.split('\n').filter(Boolean),
        provenanceRefs: ['wayglass-writing-session:' + session], stopPoint: cp('stop').value, nextOwner: cp('owner').value});
      checkpoint = {storageId: result.storage_receipt.storage_id, worldId, participantId};
      cp('id').value = checkpoint.storageId;
      cp('status').textContent = 'Stored locally; receipt ' + checkpoint.storageId + '. Copy this ID for return.';
    } catch(error) { cp('status').textContent = 'Checkpoint save failed: ' + error.message; }
  });
  cp('recover').addEventListener('click', async () => {
    try {
      const candidate = {storageId: cp('id').value.trim(), worldId: cp('world').value.trim(), participantId: cp('participant').value.trim()};
      const result = await recoverWayglassDeparture(candidate);
      const packet = result.continuation_packet;
      cp('text').value = packet.active_work.map(item => item.description || '').join('\n');
      cp('questions').value = packet.unresolved_wonder_questions.join('\n');
      cp('stop').value = packet.stop_point; cp('owner').value = packet.next_owner;
      if (findWayglassWorldSeat(candidate.worldId)) selectWorldSeat(candidate.worldId, { resetCheckpoint: false });
      checkpoint = candidate;
      cp('status').textContent = 'Verified stored checkpoint attached to subsequent turns. No canon promotion.';
    } catch(error) { checkpoint = null; cp('status').textContent = 'Checkpoint recovery failed: ' + error.message; }
  });

  const sidebarTabs = [...root.querySelectorAll('[data-wg-side-tab]')];
  function selectSidebar(name, focus = false) {
    sidebarTabs.forEach(tab => {
      const active = tab.dataset.wgSideTab === name;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      root.querySelector('#wg-panel-' + tab.dataset.wgSideTab).hidden = !active;
      if (active && focus) tab.focus();
    });
  }
  sidebarTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectSidebar(tab.dataset.wgSideTab));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? sidebarTabs.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + sidebarTabs.length) % sidebarTabs.length;
      selectSidebar(sidebarTabs[next].dataset.wgSideTab, true);
    });
  });
  const receipt = root.querySelector('#wg-receipt');
  const chatPicker=root.querySelector('#wg-chat-saved'),chatSaveStatus=root.querySelector('#wg-chat-save-status');
  const chatOpen=root.querySelector('#wg-chat-open'),chatNew=root.querySelector('#wg-chat-new');
  function refreshSavedChats(preferred=session){
    if(!chatVault){chatPicker.innerHTML='<option value="">Archive unavailable</option>';chatOpen.disabled=true;return;}
    try{
      const saved=chatVault.list();
      chatPicker.innerHTML=saved.length?saved.map(record=>
        '<option value="'+escapeHtml(record.session_id)+'">'+escapeHtml(record.title)+' · '+record.message_count+' messages</option>').join('')
        :'<option value="">No saved chats</option>';
      if(saved.some(record=>record.session_id===preferred))chatPicker.value=preferred;
      chatOpen.disabled=!saved.length;
    }catch(error){chatSaveStatus.textContent='Saved chats unavailable: '+error.message;chatOpen.disabled=true;}
  }
  function persistChat(){
    if(!messages.length)return true;
    if(!chatVault){chatSaveStatus.textContent='Not saved: '+(chatVaultProblem||'Browser storage unavailable');return false;}
    try{
      const saved=chatVault.save({sessionId:session,messages});
      chatSaveStatus.textContent='Saved '+saved.message_count+' messages in this browser · '+saved.saved_at+' · not cloud synced';
      refreshSavedChats();return true;
    }catch(error){chatSaveStatus.textContent='Chat not saved: '+error.message;return false;}
  }
  chatNew.addEventListener('click',()=>{
    if(busy){chatSaveStatus.textContent='Finish the active turn before starting another chat.';return;}
    if(!persistChat())return;
    messages.splice(0,messages.length);
    session=sessionId();
    globalThis.sessionStorage?.setItem('wayglass:first-contact-session',session);
    lastReceipt=null;checkpoint=null;revisionOf=null;input.value='';
    refreshThread();refreshSavedChats();receipt.textContent='No route receipt yet.';
    chatSaveStatus.textContent='New chat. Previous turns remain saved in this browser.';
    input.focus();
  });
  chatOpen.addEventListener('click',()=>{
    if(busy){chatSaveStatus.textContent='Finish the active turn before opening a saved chat.';return;}
    const requestedSession=chatPicker.value;
    if(!chatVault||!persistChat())return;
    try{
      const saved=chatVault.open(requestedSession);
      if(!saved)throw new Error('Select a saved conversation');
      session=saved.session_id;
      globalThis.sessionStorage?.setItem('wayglass:first-contact-session',session);
      messages.splice(0,messages.length,...saved.messages);
      lastReceipt=[...messages].reverse().find(m=>m.role==='assistant'&&m.receipt)?.receipt||null;
      checkpoint=null;revisionOf=null;
      const last=[...messages].reverse().find(m=>m.role==='assistant'&&m.route_id);
      const world=[...messages].reverse().find(m=>m.world_id)?.world_id;
      if(world&&findWayglassWorldSeat(world))selectWorldSeat(world,{resetCheckpoint:false});
      if(last?.route_id==='wayglass:ship'){
        selectedRoute='wayglass:ship';selectedCharacter='wayglass';interaction.setChannel('OOC');
      }else if(last?.route_id){selectedRoute=last.route_id;selectedCharacter='';}
      characterSelect.value=selectedCharacter;input.value='';
      void loadRoutes();
      refreshState();refreshThread();refreshSavedChats(session);
      receipt.textContent=lastReceipt?'Restored response · '+(lastReceipt.observation_id||lastReceipt.response_id||'unverified receipt'):'No model reply receipt in saved chat';
      chatSaveStatus.textContent='Opened '+saved.messages.length+' saved messages · local-browser custody';
    }catch(error){chatSaveStatus.textContent='Could not open chat: '+error.message;}
  });
  root.querySelector('#wg-chat-copy').addEventListener('click',event=>{
    if(!chatVault){chatSaveStatus.textContent='Cannot export: browser archive unavailable';return;}
    try{
      const saved=chatVault.open(chatPicker.value||session);
      if(!saved)throw new Error('Save this chat before exporting');
      void copyText(JSON.stringify(saved,null,2),event.currentTarget);
    }catch(error){chatSaveStatus.textContent='Could not copy chat: '+error.message;}
  });


  const arState = document.documentElement.dataset.wayglassAr || 'unknown';
  embodimentState.textContent = 'Keyboard ready · AR ' + (arState === 'ready' ? 'ready' : arState.replaceAll('-', ' '));

  function selectedRouteLabel() {
    return selectedRoute === 'auto:character' ? 'Auto / ' + (characters.find(c => c.id === selectedCharacter)?.label || 'character') : (routes.find((item) => item.route_id === selectedRoute)?.label || selectedRoute);
  }

  function refreshState() {
    const state = interaction.snapshot();
    channelButtons.forEach((button) => {
      const active = button.dataset.channel === state.channel;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    wonderButtons.forEach((button) => {
      const active = button.dataset.wonderMode === state.interaction_mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    turnOwner.textContent = state.turn_owner;
    const modeLabel = state.interaction_mode === 'counterfactual-wonder' ? 'Wonder'
      : state.interaction_mode === 'complexify' ? 'Complexify'
      : 'Ordinary';
    status.textContent = state.channel + ' · ' + modeLabel + ' · ' + state.turn_owner + ' has the turn';

    ownershipList.innerHTML = state.character_ownership.length
      ? state.character_ownership.map((entry) =>
          '<button type="button" class="ownership-chip" data-remove-owner="' + escapeHtml(entry.character) + '">' +
          '<strong>' + escapeHtml(entry.character) + '</strong>' +
          '<span>' + escapeHtml(entry.owner) + ' · ' + escapeHtml(entry.permission) + '</span>' +
          '</button>'
        ).join('')
      : '<span class="tiny">No character ownership declared.</span>';
  }

  function refreshThread() {
    if (!messages.length) {
      thread.innerHTML = '<div class="empty-thread"><span class="wg-empty-feather" aria-hidden="true">✧</span><strong>The room is quiet. Start anywhere.</strong><small>Your conversation will unfold here.</small></div>';
      return;
    }
    thread.innerHTML = messages.map((message, index) => {
      const who = message.role === 'user' ? 'Rowan' : message.route_label;
      return '<article class="turn-card ' + message.role + '">' +
        '<header><strong>' + escapeHtml(who) + '</strong><span>' + escapeHtml(message.channel || 'IC') + '</span></header>' +
        renderThinking(message) +
        '<div class="turn-text">' + escapeHtml(message.content).replaceAll('\n', '<br>') + '</div>' +
        '<footer><button type="button" class="glass-chip" data-copy-reply="' + index + '">Copy reply</button> ' +
        '<button type="button" class="glass-chip" data-copy-through="' + index + '">Copy log through here</button> ' +
        (message.role==='user'?'<button type="button" class="glass-chip" data-wg-revise="'+index+'">Revise my turn</button>':'')+'</footer>' +
        '</article>';
    }).join('');
    thread.scrollTop = thread.scrollHeight;
  }

  function sessionLog(end = messages.length - 1) {
    return 'Wayglass session: ' + session + '\nCopied at: ' + new Date().toISOString() +
      '\n\n' + messages.slice(0, end + 1).map(message => {
        const who = message.role === 'user' ? 'Rowan' : (message.route_label || 'Wayglass');
        return who + ' · ' + (message.channel || 'IC') + ' · world: ' + (message.world_id || 'wayglass:writing-room') + ' · ' + (message.content.startsWith('[Route error]') ? 'transport error' : message.role)  + (message.emergence_question_id ? ' · emergence:' + message.emergence_question_id : '') +
          '\n' + message.content;
      }).join('\n\n');
  }

  async function copyText(text, button) {
    const original = button.textContent;
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = 'Copied';
    } catch {
      button.textContent = 'Copy unavailable';
      status.textContent = 'Clipboard unavailable. Select the conversation text to copy manually.';
    }
    globalThis.setTimeout(() => { button.textContent = original; }, 1800);
  }

  root.querySelector('#wg-copy-session').addEventListener('click', event => copyText(sessionLog(), event.currentTarget));
  thread.addEventListener('click', event => {
    const button = event.target.closest('[data-copy-reply], [data-copy-through], [data-wg-revise]');
    if (!button) return;
    if (button.dataset.wgRevise !== undefined) {
      const index=Number(button.dataset.wgRevise);
      if(!Number.isInteger(index)||messages[index]?.role!=='user')return;
      revisionOf=index;
      input.value=messages[index].content;
      root.querySelector('#wg-revision-note').hidden=false;
      status.textContent='Correcting turn '+(index+1)+'; original will remain in the transcript.';
      input.focus();
      return;
    }
    if (button.dataset.copyReply !== undefined) {
      copyText(messages[Number(button.dataset.copyReply)].content, button);
    } else {
      copyText(sessionLog(Number(button.dataset.copyThrough)), button);
    }
  });

  root.querySelector('#wg-revision-cancel').addEventListener('click',()=>{
    revisionOf=null;root.querySelector('#wg-revision-note').hidden=true;
    status.textContent='Revision cancelled. Current draft retained.';
  });

  function refreshExternalTransfer() {
    const isStepFun = selectedRoute.startsWith('stepfun:');
    const isGriff = selectedRoute === 'flame:griff:spicychat';
    externalTransfer.hidden = !(isStepFun || isGriff);
    externalConsentLabel.textContent = isGriff
      ? 'I approve sending this turn and its same-world context to Griff on SpicyChat.'
      : 'I approve sending this turn, permitted history, and any included continuity context to StepFun.';
    if (!isStepFun && !isGriff) externalConsent.checked = false;
  }

  async function loadRoutes() {
    try {
      const catalogue = await listWayglassRoutes();
      routes = catalogue.routes || [];
      // A visible placeholder is not a registered/usable provider route.
      // Never exchange Griff with Bluebird, DeepSeek, or the selected model.
      const griff = findWayglassWorldSeat('evil-gene:film-2015')?.character;
      if (griff && !routes.some(route => route.route_id === griff.desired_route_id)) {
        routes = [...routes, {
          route_id: griff.desired_route_id,
          label: griff.name + ' · SpicyChat (not connected)',
          provider: 'spicychat',
          configured: false,
          unavailable_reason: 'Character/chat transport unverified',
        }];
      }
      const isGriffWorld = cp('world').value === 'evil-gene:film-2015';
      if (selectedCharacter === 'bitty-twi' && !isGriffWorld) routes.unshift({route_id: 'auto:character', label: 'Auto · character voice', configured: true});
      const visibleRoutes = isGriffWorld ? routes.filter(route => route.route_id === 'flame:griff:spicychat') : routes.filter(route => route.route_id !== 'flame:griff:spicychat');
      if (isGriffWorld) selectedRoute = 'flame:griff:spicychat';
      if (!visibleRoutes.some(route => route.route_id === selectedRoute && route.configured !== false)) selectedRoute = visibleRoutes.find(route => route.configured !== false)?.route_id || '';
      selectedRoute = routePicker.setRoutes(visibleRoutes, selectedRoute);
      refreshExternalTransfer();
      routeState.textContent = isGriffWorld
        ? selectedRoute ? 'Griff SpicyChat configured · sign in as Steward; live connection not yet proven' : 'Griff unavailable · configure his exact private character/chat binding'
        : visibleRoutes.length + ' registered route' + (visibleRoutes.length === 1 ? '' : 's');
    } catch (error) {
      routes = [];
      selectedRoute = '';
      routePicker.setRoutes([]);
      refreshExternalTransfer();
      routeState.textContent = 'Catalogue unavailable · reload to reconnect';
    }
  }

  function refreshEmergenceInterview() {
    const active = selectedCharacter === 'bitty-twi';
    emergencePanel.hidden = !active;
    emergenceNext.disabled = busy || !active || emergenceIndex >= EMERGENCE_QUESTIONS.length;
    emergenceProgress.textContent = emergenceIndex < EMERGENCE_QUESTIONS.length
      ? 'Question ' + (emergenceIndex + 1) + ' of ' + EMERGENCE_QUESTIONS.length
      : 'All six questions asked. Review responses before adding anything to Echo Index.';
  }

  function wakeMaterial(strength = 0.7, mode = 'wake', semantic = {}) {
    const state = interaction.snapshot();
    emitMaterialSignal({
      strength,
      mode,
      channel: state.channel,
      ownership: state.character_ownership.length ? 1 : 0,
      intent: semantic.intent ?? (mode === 'route' ? 0.9 : mode === 'handoff' ? 1 : 0.45),
      handoff_progress: semantic.handoff_progress ?? (mode === 'handoff' ? 0.82 : 0),
      canon_state: semantic.canon_state || 'candidate',
    });
    root.dataset.materialState = mode;
    globalThis.setTimeout?.(() => { if (root.dataset.materialState === mode) root.dataset.materialState = 'rest'; }, 760);
  }

  async function passTurn({ emergenceQuestionId = null } = {}) {
    const text = input.value.trim();
    const correctionOf=revisionOf;
    const outgoing=correctionOf===null?text:'Correction to my earlier turn #'+(correctionOf+1)+':\n'+text;
    if (!text || busy) return;
    if (!selectedRoute) { status.textContent = 'No configured route available. Reload the route catalogue.'; return; }
    if (selectedCharacter === 'wayglass' && selectedRoute !== 'wayglass:ship') {
      status.textContent = 'Wayglass needs her dedicated ship route. Select Speak with Wayglass.';
      return;
    }
    if ((selectedRoute.startsWith('stepfun:') || selectedRoute === 'flame:griff:spicychat') && !externalConsent.checked) {
      status.textContent = 'Confirm this external provider transfer before passing the turn.';
      externalConsent.focus();
      return;
    }
    busy = true;
    send.disabled = true;
    input.disabled = true;
    worldSelect.disabled = true;

    const current = interaction.snapshot();
    const activeWorldId = cp('world').value.trim();
    const history = messages.filter(message => message.world_id === activeWorldId && ['user', 'assistant'].includes(message.role) && !message.content.startsWith('[Route error]'))
      .slice(-12).map(message => ({ role: message.role, content: message.content }));
    messages.push({ role: 'user', content: outgoing, channel: current.channel, world_id: activeWorldId, emergence_question_id: emergenceQuestionId, revision_of: correctionOf, delivery_status:'pending' });
    persistChat();
    queueStoryScore();
    revisionOf=null;root.querySelector('#wg-revision-note').hidden=true;
    input.value = '';
    refreshThread();
    refreshEmergenceInterview();

    const routeLabel = selectedCharacter ? (characters.find(c => c.id === selectedCharacter)?.label || selectedCharacter) : selectedRouteLabel();
    interaction.setTurnOwner(routeLabel);
    wakeMaterial(0.96, 'handoff');
    await emitInteractionCue('handoff');
    refreshState();

    let succeeded = false;
    try {
      recordWayglassRouteObservation({status:'started',routeId:selectedRoute});
      const result = await invokeWayglassRoute({
        routeId: selectedRoute,
        externalProviderConsent: (selectedRoute.startsWith('stepfun:') || selectedRoute === 'flame:griff:spicychat') && externalConsent.checked,
        worldId: activeWorldId,
        participantId: selectedRoute === 'flame:griff:spicychat' ? 'griff-krenshaw' : selectedRoute === 'wayglass:ship' ? 'wayglass' : null,
        characterId: selectedCharacter || null,
        emergenceQuestionId,
        think: root.querySelector('#wg-think').checked,
        input: outgoing,
        history,
        interaction: current,
        sessionId: session,
        checkpoint,
      });
       if(typeof result.output!=='string'||!result.output.trim()) throw new Error('The model route returned no answer text');
       messages[messages.length-1].delivery_status='responded';
       messages.push({
         role: 'assistant',
         world_id: activeWorldId,
         content: result.output,
         thinking: result.thinking || '',
         channel: current.channel,
         route_label: selectedCharacter ? routeLabel + ' · ' + (result.model || result.route_id || 'model') : routeLabel,
         route_id: result.route_id,
         provider: result.provider,
         model: result.model,
         character_id: selectedCharacter || null,
         receipt: result.receipt || null,
         emergence_question_id: emergenceQuestionId,
       });
       persistChat();
      succeeded = true;
      queueStoryScore();
      lastReceipt = result.receipt || null;
      recordWayglassRouteObservation({status:'completed',routeId:selectedRoute,provider:result.provider,model:result.model,receipt:lastReceipt});
      receipt.textContent = lastReceipt
        ? 'Observation · not canon · ' + (result.provider || 'route') + ' / ' + (result.model || 'model') + ' · ' + (lastReceipt.epistemic_register || 'external-observation') + ' · ' + (lastReceipt.completed_at || '')
        : 'Turn completed without a receipt payload.';
    } catch (error) {
      recordWayglassRouteObservation({status:'failed',routeId:selectedRoute});
       messages[messages.length-1].delivery_status='failed';
       messages.push({
         role: 'assistant',
         world_id: activeWorldId,
         content: '[Route error] ' + error.message,
         channel: 'OOC',
         route_label: 'Route diagnostic',
       });
       persistChat();
      receipt.textContent = 'Route failed · ' + error.message;
    } finally {
      interaction.setTurnOwner('Rowan');
      busy = false;
      send.disabled = false;
      input.disabled = false;
      worldSelect.disabled = false;
      refreshThread();
      refreshState();
      refreshEmergenceInterview();
      input.focus();
    }
    return succeeded;
  }

  wonderButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const mode = button.dataset.wonderMode;
      const intent = mode === 'counterfactual-wonder'
        ? 'Explore this possibility as if it were true while preserving that it could be false.'
        : mode === 'complexify'
          ? 'If the current frame makes the idea impossible, look for a missing dimension, rotate the representation, preserve invariants, and translate consequences back.'
          : '';
      interaction.setInteractionContext({ intent, interaction_mode: mode });
      wakeMaterial(mode === 'complexify' ? 0.92 : mode === 'counterfactual-wonder' ? 0.78 : 0.5, 'wonder', { intent: mode === 'ordinary' ? 0.35 : 0.94 });
      await emitInteractionCue('switch');
      refreshState();
    });
  });
  emergenceNext.addEventListener('click', async () => {
    if (busy || selectedCharacter !== 'bitty-twi' || emergenceIndex >= EMERGENCE_QUESTIONS.length) return;
    if (input.value.trim()) {
      status.textContent = 'Your draft is still in the composer. Send or clear it before asking the next question.';
      input.focus();
      return;
    }
    const question = EMERGENCE_QUESTIONS[emergenceIndex];
    input.value = bittyTwiQuestionPrompt(emergenceIndex);
    const completed = await passTurn({ emergenceQuestionId: question.id });
    if (completed) emergenceIndex += 1;
    refreshEmergenceInterview();
  });

  channelButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      interaction.setChannel(button.dataset.channel);
      wakeMaterial(0.58, 'channel', { intent: 0.52 });
      await emitInteractionCue(button.dataset.channel === 'OOC' ? 'ooc' : 'switch');
      refreshState();
    });
  });

  firstContact.addEventListener('click', () => {
    if (busy) return;
    selectedCharacter = 'wayglass';
    selectedRoute = 'wayglass:ship';
    characterSelect.value = 'wayglass';
    interaction.setChannel('OOC');
    interaction.setInteractionContext({intent:'Talk with Wayglass as the ship voice; distinguish the cognitive route from Wayglass system identity.',interaction_mode:'counterfactual-wonder'});
    void loadRoutes();
    refreshState();
    status.textContent = 'Wayglass ship voice selected. Send to establish an attributable model turn.';
    input.focus();
  });

  characterSelect.addEventListener('change', () => {
    selectedCharacter = characterSelect.value;
    if (selectedCharacter) selectedRoute = selectedCharacter === 'wayglass' ? 'wayglass:ship' : 'auto:character';
    if (selectedCharacter === 'wayglass') interaction.setChannel('OOC');
    else if (selectedRoute === 'auto:character') selectedRoute = routes.find(r => r.configured !== false)?.route_id || '';
    void loadRoutes();
    refreshState();
    refreshEmergenceInterview();
  });

  ownershipForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(ownershipForm);
    interaction.setOwnership({
      character: data.get('character'),
      owner: data.get('owner'),
      permission: data.get('permission'),
    });
    ownershipForm.reset();
    wakeMaterial(0.68, 'bind', { intent: 0.62 });
    await emitInteractionCue('switch');
    refreshState();
  });

  ownershipList.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-remove-owner]');
    if (!chip) return;
    interaction.removeOwnership(chip.dataset.removeOwner);
    refreshState();
  });


  function handleWayglassCommand(event) {
    const command = event?.detail?.command;
    if (command === 'channel:ic' || command === 'channel:ooc') {
      const channel = command.endsWith(':ooc') ? 'OOC' : 'IC';
      interaction.setChannel(channel);
      wakeMaterial(0.58, 'channel', { intent: 0.52 });
      void emitInteractionCue(channel === 'OOC' ? 'ooc' : 'switch');
      refreshState();
      return;
    }
    if (command === 'focus:route') {
      routePicker.focus();
      wakeMaterial(0.52, 'route', { intent: 0.5 });
      return;
    }
    if (command === 'focus:composer') {
      input.focus();
      wakeMaterial(0.42, 'focus', { intent: 0.35 });
      return;
    }
    if (command === 'help:keyboard') {
      status.textContent = 'Keyboard · Alt+I IC · Alt+O OOC · Alt+R route · Alt+W composer · Ctrl/Cmd+Enter pass turn';
      globalThis.setTimeout?.(refreshState, 3600);
    }
  }

  globalThis.addEventListener?.('wayglass:command', handleWayglassCommand);

  send.addEventListener('click', passTurn);
  input.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      void passTurn();
    }
  });

  try {
    const catalogue = await listWayglassCharacters();
    characters = catalogue.characters || [];
    characterSelect.innerHTML = '<option value="">No character seat</option>' + characters.map(c => '<option value="' + escapeHtml(c.id) + '">' + escapeHtml(c.label) + '</option>').join('');

  } catch { /* Character seats unavailable on older hosts; ordinary Writing Room still works. */ }
  await loadRoutes();
  if(messages.length){
    const last=[...messages].reverse().find(m=>m.role==='assistant'&&m.route_id);
    const world=[...messages].reverse().find(m=>m.world_id)?.world_id;
    if(world&&findWayglassWorldSeat(world))selectWorldSeat(world,{resetCheckpoint:false});
    if(last?.route_id==='wayglass:ship'){
      selectedRoute='wayglass:ship';selectedCharacter='wayglass';
      characterSelect.value='wayglass';interaction.setChannel('OOC');void loadRoutes();
    }
    lastReceipt=last?.receipt||null;
  }
  refreshSavedChats();
  if(chatVaultProblem)chatSaveStatus.textContent='Browser archive unavailable: '+chatVaultProblem;
  refreshState();
  refreshThread();
  refreshEmergenceInterview();

  return Object.freeze({
    surface_id: 'arcsweep:writing-room',
    interaction,
    get session_id(){return session;},
    messages,
    lastReceipt: () => lastReceipt,
    destroy() {
      globalThis.removeEventListener?.('wayglass:command', handleWayglassCommand);
      soundscapeDisposed = true;
      if (soundscapeTimer != null) globalThis.clearTimeout(soundscapeTimer);
      soundscapeAbort?.abort();
      cypher?.stop();
      offShipSound(); // Ship owns the acoustic engine across room changes.
      globalThis.removeEventListener?.(WAYGLASS_FEATHER_EVENT,onSharedFeather);
      routePicker.destroy();
      manuscript();
    },
  });
}
