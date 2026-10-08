import { readCommons, postCommons } from '../commons-client.js';

const html = (s) => String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const uuid = () => globalThis.crypto?.randomUUID?.() || ('commons-' + Date.now());

export async function mountWayglassCommonsSurface(root) {
  let entries = [];
  let selectedThread = 'wayglass:commons';
  let replyTo = null;
  let busy = false;
  let mounted = true;
  root.innerHTML = [
    '<section class="wg-surface wg-commons" data-surface="wayglass-commons">',
    '<nav class="wg-deck-nav glass-panel" aria-label="Wayglass rooms">',
    '<button type="button" class="glass-chip active" aria-current="page">Commons</button>',
    '<button type="button" class="glass-chip" data-wayglass-room="arcsweep:writing-room">Writing Room</button>',
    '<button type="button" class="glass-chip" data-wayglass-room="wayglass:systems">Organs</button>',
    '</nav>',
    '<header class="wg-surface-head glass-panel"><div><p class="eyebrow">Wayglass · shared room</p><h1>Commons</h1>',
    '<p class="lede">The House Commons conversation, carried into Wayglass. Read and send through the authenticated House host. AI replies require their own verified worker route.</p></div>',
    '<div><button class="glass-chip" type="button" id="wg-commons-refresh">Refresh conversation</button><p id="wg-commons-state" role="status" class="tiny">Connecting to House Commons…</p></div></header>',
    '<section class="wg-thread glass-panel" aria-label="Commons conversation">',
    '<div id="wg-commons-messages" class="wg-thread-log" aria-live="polite"></div></section>',
    '<section class="wg-composer glass-panel" aria-label="Commons message composer">',
    '<p id="wg-commons-reply-state" class="tiny">Commons · general conversation</p>',
    '<textarea id="wg-commons-input" rows="4" aria-label="Message Commons" placeholder="Write to Commons…"></textarea>',
    '<div class="composer-foot"><span class="tiny">Posts are attributed to Rowan in this House session. They do not automatically summon an AI or update canon.</span>',
    '<button type="button" id="wg-commons-send" class="send-jewel">Send to Commons</button></div></section>',
    '<footer class="wg-receipt tiny">Voice or system entries are displayed with their stored author, status, and runtime when available. This room does not invent a speaker or an agent turn.</footer>',
    '</section>',
  ].join('');

  const state = root.querySelector('#wg-commons-state');
  const transcript = root.querySelector('#wg-commons-messages');
  const draft = root.querySelector('#wg-commons-input');
  const send = root.querySelector('#wg-commons-send');
  const refresh = root.querySelector('#wg-commons-refresh');
  const replyState = root.querySelector('#wg-commons-reply-state');

  function render() {
    if (!mounted) return;
    const shown = entries.filter(entry => !entry.thread_id || entry.thread_id === selectedThread).slice(-150);
    transcript.innerHTML = shown.length ? shown.map(e => {
      const kind = ['steward','voice','system'].includes(e.kind) ? e.kind : 'system';
      const runtime = e.runtime?.provider ? ' · ' + html(e.runtime.provider) + (e.runtime.model ? '/' + html(e.runtime.model) : '') : '';
      const time = e.created_at ? new Date(e.created_at).toLocaleString() : 'time unknown';
      return '<article class="turn-card ' + (kind === 'steward' ? 'user' : 'assistant') + '">' +
        '<header><strong>' + html(e.author || 'Unattributed') + '</strong><span>' + html(kind) + runtime + ' · ' + html(time) + '</span></header>' +
        '<div class="turn-text">' + html(e.text).replaceAll('\n','<br>') + '</div>' +
        '<footer><span>' + html(e.status || 'stored') + '</span> <button type="button" class="glass-chip" data-reply="' + html(e.id || '') + '">Reply</button></footer></article>';
    }).join('') : '<p class="empty-thread">No messages in this thread. The room is ready.</p>';
    transcript.scrollTop = transcript.scrollHeight;
  }

  async function load() {
    state.textContent = 'Loading authenticated House Commons…';
    try {
      const items = await readCommons();
      if (!mounted) return;
      entries = items;
      render();
      state.textContent = entries.length + ' recorded Commons message' + (entries.length === 1 ? '' : 's') + ' · refreshed';
    } catch (err) {
      if (!mounted) return;
      state.textContent = err.message;
      transcript.innerHTML = '<p class="empty-thread">Commons host unavailable or authentication required. No messages were fabricated.</p>';
    }
  }

  async function submit() {
    if (busy || !draft.value.trim()) return;
    busy = true; send.disabled = true;
    const message = draft.value;
    const idempotencyKey = uuid();
    try {
      await postCommons({ text: message, threadId: selectedThread, replyTo, idempotencyKey });
      draft.value = '';
      replyTo = null;
      replyState.textContent = 'Commons · general conversation';
      await load();
    } catch (error) {
      state.textContent = error.message;
      // Keep the draft for retry; do not pretend it was delivered.
    } finally {
      busy = false; send.disabled = false;
    }
  }

  root.querySelectorAll('[data-wayglass-room]').forEach(button => button.addEventListener('click', () => globalThis.__wayglassOS?.mount(button.dataset.wayglassRoom)));
  refresh.addEventListener('click', load);
  send.addEventListener('click', submit);
  draft.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); void submit(); } });
  transcript.addEventListener('click', e => {
    const button = e.target.closest('[data-reply]');
    if (!button?.dataset.reply) return;
    replyTo = button.dataset.reply;
    replyState.textContent = 'Replying to message ' + replyTo;
    draft.focus();
  });
  await load();
  return Object.freeze({ surface_id: 'wayglass:commons', destroy() { mounted = false; } });
}
