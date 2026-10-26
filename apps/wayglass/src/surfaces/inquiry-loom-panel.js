import {
  listWayglassInquiries, openWayglassInquiry, readWayglassInquiry,
  appendWayglassInquiryContribution, pauseWayglassInquiry, inviteWayglassInquiry,
} from '../route-client.js';
import { buildInquiryEvidenceState } from '../inquiry-evidence-state.js';

const escape = input => String(input ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const refs = value => String(value || '').split('\n').map(x=>x.trim()).filter(Boolean);
const visible = e => e.kind === 'opened' || e.kind === 'contributed' || e.kind === 'paused';

function renderEvents(inquiry) {
  return (inquiry?.events || []).filter(visible).map(event => {
    const verb = event.kind === 'contributed' ? event.data.claim_kind : event.kind;
    const content = event.kind === 'opened' ? event.data.question
      : event.kind === 'paused' ? event.data.stop_point : event.data.text;
    const reply = event.data.reply_to ? `<p class="tiny">In reply to · ${escape(event.data.reply_to)}</p>` : '';
    return `<article class="glass-panel" data-inquiry-event="${escape(event.event_id)}">
      <p class="eyebrow">${escape(event.participant_id)} · ${escape(verb)} · ${escape(event.created_at)}</p>
      <p>${escape(content)}</p>${reply}
      <p class="tiny">${escape(event.event_id)} · Source refs ${escape((event.data.source_refs||[]).join(', ') || 'none claimed')}</p>
    </article>`;
  }).join('') || '<p class="tiny">No contributions yet.</p>';
}
function renderList(items, selectedId) {
  return items.map(item => `<button type="button" class="glass-panel" data-inquiry-select="${escape(item.inquiry_id)}" aria-pressed="${String(item.inquiry_id === selectedId)}">
      <strong>${escape(item.question)}</strong>
      <span class="tiny">${escape(item.world_ref)} · ${item.events} event(s) · Unresolved</span>
    </button>`).join('') || '<p class="tiny">No current inquiries. Open one when you have a question worth preserving.</p>';
}

/** Interactive panel; asks signed House auth for every read/write; never supplies participant id. */
export async function mountWayglassInquiryLoom(root) {
  if (!root) return Object.freeze({ mounted:false });
  let selectedId = null;
  let selected = null;
  let inquiries = [];
  root.innerHTML = `
    <header><p class="eyebrow">Wayglass · Living Inquiry Loom / experimental</p><h2>Questions with a history</h2>
      <p class="lede">Let a question remain open while interpretations, disagreements and revisions accumulate. This is a local proposal history, not canon or autonomous cognition.</p></header>
    <section class="glass-panel" aria-label="Open inquiry">
      <h3>Preserve a question</h3>
      <label>Question<textarea id="wg-inquiry-question" rows="2" maxlength="3000" placeholder="What are we curious about?"></textarea></label>
      <label>Why is it interesting?<textarea id="wg-inquiry-why" rows="2" maxlength="3000"></textarea></label>
      <label>World or study reference<input id="wg-inquiry-world" value="wayglass:research" maxlength="120"></label>
      <label>Source references, one per line<textarea id="wg-inquiry-sources" rows="2" placeholder="Source IDs are caller-declared, not independently verified"></textarea></label>
      <button type="button" id="wg-inquiry-open" class="send-jewel">Open inquiry</button>
    </section>
    <section class="glass-panel" aria-label="Inquiry shelf"><h3>Unfinished inquiries</h3><div id="wg-inquiry-list"></div></section>
    <section class="glass-panel" aria-label="Selected inquiry">
      <h3>Continuing inquiry</h3><p id="wg-inquiry-selected" class="tiny">Select an inquiry to see its history.</p>
      <div id="wg-inquiry-timeline" aria-live="polite"></div>
      <h3>Evidence state · read-only</h3>
      <p class="tiny">This counts recorded claims, proposals and unresolved questions. It does not verify external facts or anyone's inner experience.</p>
      <div id="wg-inquiry-evidence-state" aria-live="polite"><p class="tiny">Select an inquiry to inspect its evidence state.</p></div>
      <label>Contribution type<select id="wg-inquiry-kind"><option value="interpretation">Interpretation</option><option value="alternative">Alternative</option><option value="challenge">Challenge</option><option value="observation">Observation</option><option value="experiment">Experiment claim (unverified)</option><option value="outcome">Outcome claim (unverified)</option><option value="new-question">New question</option><option value="revision">Revision (link to earlier contribution)</option></select></label>
      <label>Contribution<textarea id="wg-inquiry-text" rows="3" maxlength="4000"></textarea></label>
      <label>Reply to contribution event ID (required for revision)<input id="wg-inquiry-reply" maxlength="160" placeholder="wgi-event:…"></label>
      <label>Source references, one per line<textarea id="wg-inquiry-contribution-sources" rows="2"></textarea></label>
      <button type="button" id="wg-inquiry-contribute" class="send-jewel" disabled>Preserve contribution</button>
      <h3>Invite another authenticated crew seat</h3>
      <label>Invite seat<select id="wg-inquiry-invite-seat"><option value="rarity">Rarity</option><option value="codex">Codex</option></select></label>
      <button type="button" id="wg-inquiry-invite" class="glass-chip" disabled>Offer invitation (no provider contact)</button>
      <h3>Return marker</h3>
      <p class="tiny">A locally derived handoff candidate, not a signed kernel departure receipt.</p>
      <label>Stop point<input id="wg-inquiry-stop" maxlength="1000" placeholder="Where did we leave the question?"></label>
      <label>Next owner (descriptive only)<input id="wg-inquiry-owner" maxlength="80" placeholder="e.g. rowan, rarity"></label>
      <button type="button" id="wg-inquiry-pause" class="glass-chip" disabled>Record stop point</button>
      <pre id="wg-inquiry-return" class="tiny" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre>
    </section>
    <p role="status" id="wg-inquiry-status" class="tiny">Checking the authenticated local inquiry shelf…</p>
  `;
  const find = id => root.querySelector(`#${id}`);
  const status = find('wg-inquiry-status');
  const list = find('wg-inquiry-list');
  const timeline = find('wg-inquiry-timeline');
  function msg(m) { status.textContent = m; }
  function draw() {
    list.innerHTML = renderList(inquiries, selectedId);
    find('wg-inquiry-selected').textContent = selected ? `${selected.question} · ${selected.inquiry_id} · ${selected.stance}` : 'Select an inquiry to see its history.';
    timeline.innerHTML = renderEvents(selected);
    const evidence = selected ? buildInquiryEvidenceState(selected) : null;
    find('wg-inquiry-evidence-state').innerHTML = evidence
      ? `<dl class="tiny">
          <dt>Recorded (journal only)</dt><dd>${evidence.recorded.event_count} events, ${evidence.recorded.contributed_events} contributions</dd>
          <dt>Interpretations / alternatives / revisions</dt><dd>${evidence.interpreted.proposal_count} proposed, not adopted as fact</dd>
          <dt>Unresolved</dt><dd>${evidence.unresolved.open_questions} question(s), ${evidence.unresolved.challenges} challenge(s)</dd>
          <dt>Awaiting verification</dt><dd>${evidence.awaiting_verification.reported_observations_experiments_outcomes} reported observation/experiment/outcome claims, ${evidence.awaiting_verification.source_references_claimed} contribution(s) with caller-declared source refs</dd>
        </dl>`
      : '<p class="tiny">No inquiry selected. Nothing inferred.</p>';
    find('wg-inquiry-contribute').disabled = !selected;
    find('wg-inquiry-pause').disabled = !selected;
    find('wg-inquiry-invite').disabled = !selected;
    find('wg-inquiry-return').textContent = selected ? JSON.stringify(selected.return_marker, null, 2) : '';
  }
  async function loadList() {
    try {
      const payload = await listWayglassInquiries();
      inquiries = payload.inquiries || [];
      if (selectedId && inquiries.some(item => item.inquiry_id === selectedId)) selected = await readWayglassInquiry(selectedId);
      else {selectedId = null;selected = null;}
      draw(); msg(`${inquiries.length} accessible inquiry/inquiries · House-authenticated local records · no provider calls.`);
    } catch (error) {
      selected=null;selectedId=null;inquiries=[];draw();
      msg(`Inquiry Loom unavailable: ${error.message}. Sign in to your local House session to use this panel.`);
    }
  }
  find('wg-inquiry-open').addEventListener('click', async () => {
    const button = find('wg-inquiry-open');button.disabled=true;
    try {
      selected = await openWayglassInquiry({
        question: find('wg-inquiry-question').value,
        why_interesting: find('wg-inquiry-why').value,
        world_ref: find('wg-inquiry-world').value,
        source_refs: refs(find('wg-inquiry-sources').value),
      });
      selectedId=selected.inquiry_id;await loadList();msg('Question preserved, unresolved. Original source claims remain caller-declared.');
    } catch(error) {msg('Open inquiry failed · ' + error.message);}
    finally {button.disabled=false;}
  });
  list.addEventListener('click', async event => {
    const button=event.target.closest('[data-inquiry-select]');if(!button)return;
    try { selectedId=button.dataset.inquirySelect;selected=await readWayglassInquiry(selectedId);draw();msg('History loaded; authorship comes from the host.'); }
    catch(error){msg('Could not read inquiry · '+error.message);}
  });
  find('wg-inquiry-contribute').addEventListener('click',async () => {
    if(!selectedId)return;
    const button=find('wg-inquiry-contribute');button.disabled=true;
    try {
      selected=await appendWayglassInquiryContribution(selectedId,{
        kind:find('wg-inquiry-kind').value,text:find('wg-inquiry-text').value,
        reply_to:find('wg-inquiry-reply').value,
        source_refs:refs(find('wg-inquiry-contribution-sources').value),
      });
      find('wg-inquiry-text').value='';find('wg-inquiry-reply').value='';
      draw();msg('Attributable contribution preserved. No conclusion or canon promotion.');
    }catch(error){msg('Contribution rejected · '+error.message);}
    finally {button.disabled=!selectedId;}
  });
  find('wg-inquiry-invite').addEventListener('click',async () => {
    if(!selectedId)return;
    const button=find('wg-inquiry-invite');button.disabled=true;
    try {
      selected=await inviteWayglassInquiry(selectedId,{target_participant_id:find('wg-inquiry-invite-seat').value});
      draw();msg('Invitation recorded. The named crew seat must authenticate and explicitly join before reading.');
    } catch(error) {msg('Invitation rejected · '+error.message);}
    finally {button.disabled=!selectedId;}
  });
  find('wg-inquiry-pause').addEventListener('click',async () => {
    if(!selectedId)return;
    const button=find('wg-inquiry-pause');button.disabled=true;
    try { selected=await pauseWayglassInquiry(selectedId,{stop_point:find('wg-inquiry-stop').value,next_owner:find('wg-inquiry-owner').value});draw();msg('Local return marker recorded. Kernel handoff is NOT claimed.'); }
    catch(error){msg('Stop point rejected · '+error.message);}
    finally {button.disabled=!selectedId;}
  });
  await loadList();
  return Object.freeze({mounted:true,source:'signed-house-session',effect_authority:false});
}