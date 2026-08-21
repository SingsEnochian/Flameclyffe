import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CONSTELLATION_VOICES } from '../../arcsweep/src/feedback-loop.js';
import {
  HOUSE_COOKIE_SESSION,
  readHouseRuntimeToken,
  restoreHouseRuntimeSession,
} from '../../arcsweep/src/house-runtime.js';
import {
  createRichTextDocument,
  executeNativeRichTextCommand,
  sanitiseRichHtml,
  visibleTextToRichDocument,
} from './richText.js';
import { publishSocketEnvelope } from './projectZeroSocket.js';

const CHANNEL_SCHEMA = 'flameclyffe.project-zero-companion.flame-channel/v1';
const STORAGE_KEY = 'flameclyffe:project-zero-companion:flame-channel:hearthweave/v1';
const MAX_MESSAGES = 240;
const BRIDGE_PLUGIN_ID = 'project-zero-companion-flame-channel';

function uid(prefix = 'message') {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`;
}

function authHeaders(session) {
  return session && session !== HOUSE_COOKIE_SESSION ? { authorization: `Bearer ${session}` } : {};
}

function loadMessages() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.slice(-MAX_MESSAGES) : [];
  } catch { return []; }
}
function saveMessages(messages) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES))); } catch {} }

function messageReceipt({ speaker, speakerLabel, kind, document, runtime = null, replyTo = null }) {
  return {
    schema: CHANNEL_SCHEMA,
    message_id: uid('chat'),
    channel_id: 'hearthweave',
    bridge_owner: 'flameclyffe',
    integration_target: 'nocturne-project-zero',
    speaker_id: speaker,
    speaker_label: speakerLabel,
    kind,
    rich_text: document,
    runtime,
    reply_to: replyTo,
    created_at: new Date().toISOString(),
  };
}

function formatTime(value) {
  try { return new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
  catch { return ''; }
}

function RichComposer({ onSend, disabled }) {
  const editor = useRef(null);
  function command(name, value = null) { editor.current?.focus(); executeNativeRichTextCommand(name, value); }
  function send() {
    const html = sanitiseRichHtml(editor.current?.innerHTML || '');
    const documentValue = createRichTextDocument({ html });
    if (!documentValue.plain_text.trim()) return;
    onSend(documentValue);
    if (editor.current) editor.current.innerHTML = '';
  }

  return (
    <div className="rich-composer">
      <div className="rich-toolbar" role="toolbar" aria-label="Rich text formatting">
        <button type="button" title="Bold" onClick={() => command('bold')}><b>B</b></button>
        <button type="button" title="Italic" onClick={() => command('italic')}><i>I</i></button>
        <button type="button" title="Underline" onClick={() => command('underline')}><u>U</u></button>
        <button type="button" title="Strike" onClick={() => command('strikeThrough')}><s>S</s></button>
        <button type="button" title="Heading" onClick={() => command('formatBlock', 'h3')}>H</button>
        <button type="button" title="Bulleted list" onClick={() => command('insertUnorderedList')}>• list</button>
        <button type="button" title="Numbered list" onClick={() => command('insertOrderedList')}>1. list</button>
        <button type="button" title="Quote" onClick={() => command('formatBlock', 'blockquote')}>❝</button>
        <button type="button" title="Code block" onClick={() => command('formatBlock', 'pre')}>⌘</button>
        <button type="button" title="Link" onClick={() => { const href = prompt('Link URL'); if (href) command('createLink', href); }}>↗</button>
        <button type="button" title="Clear formatting" onClick={() => command('removeFormat')}>clear</button>
      </div>
      <div ref={editor} className="rich-editor" contentEditable={!disabled} suppressContentEditableWarning data-placeholder="Speak into #hearthweave…" onKeyDown={(event) => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); send(); } }} />
      <div className="composer-foot"><span>Ctrl/⌘ + Enter sends · formatting is stored as native rich text, not Markdown.</span><button type="button" onClick={send} disabled={disabled}>Send to selected</button></div>
    </div>
  );
}

export default function FlameChannel() {
  const [messages, setMessages] = useState(loadMessages);
  const [selected, setSelected] = useState(() => new Set(['lioreal']));
  const [pending, setPending] = useState({});
  const [session, setSession] = useState('');
  const [status, setStatus] = useState('Checking House Runtime…');
  const transcript = useRef(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      let active = readHouseRuntimeToken();
      if (!active) active = await restoreHouseRuntimeSession();
      if (!alive) return;
      setSession(active);
      setStatus(active ? 'House Runtime connected.' : 'House Runtime offline. Connect it in Arcsweep Settings.');
    })();
    return () => { alive = false; };
  }, []);
  useEffect(() => saveMessages(messages), [messages]);
  useEffect(() => { transcript.current?.scrollTo?.({ top: transcript.current.scrollHeight, behavior: 'smooth' }); }, [messages, pending]);

  const selectedVoices = useMemo(() => CONSTELLATION_VOICES.filter((voice) => selected.has(voice.id)), [selected]);
  function toggleVoice(id) { setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  function append(message) { setMessages((current) => [...current, message].slice(-MAX_MESSAGES)); }

  async function invokeVoice(voice, userDocument, userMessageId, context) {
    setPending((current) => ({ ...current, [voice.id]: { label: voice.name, startedAt: Date.now() } }));
    publishSocketEnvelope({ pluginId: BRIDGE_PLUGIN_ID, channel: 'chat', type: 'chat.flame.pending', requestId: userMessageId, payload: { voice_id: voice.id } });
    try {
      const response = await fetch(`/api/v1/flames/${voice.id}/chat`, {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'content-type': 'application/json', ...authHeaders(session) },
        body: JSON.stringify({
          message: userDocument.plain_text,
          session_id: `project-zero-companion-hearthweave-${voice.id}`,
          context,
          metadata: { surface: 'flameclyffe-project-zero-companion', integration_target: 'nocturne-project-zero', channel_id: 'hearthweave', source_message_id: userMessageId },
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `${voice.name} route failed (${response.status})`);
      const runtimeVerified = String(data.flame_id || '').toLowerCase() === voice.id && Boolean(data.provider) && Boolean(data.model);
      const receipt = messageReceipt({
        speaker: voice.id, speakerLabel: data.display_name || voice.name, kind: 'flame',
        document: visibleTextToRichDocument(String(data.message || '')), replyTo: userMessageId,
        runtime: { verified: runtimeVerified, flame_id: data.flame_id || null, provider: data.provider || null, model: data.model || null, cited_sources: data.cited_sources || [] },
      });
      append(receipt);
      publishSocketEnvelope({ pluginId: BRIDGE_PLUGIN_ID, channel: 'chat', type: 'chat.flame.received', requestId: userMessageId, payload: { message_id: receipt.message_id, voice_id: voice.id, runtime: receipt.runtime } });
    } catch (error) {
      const receipt = messageReceipt({ speaker: voice.id, speakerLabel: voice.name, kind: 'route-error', document: visibleTextToRichDocument(`Route error: ${error.message}`), replyTo: userMessageId, runtime: { verified: false } });
      append(receipt);
      publishSocketEnvelope({ pluginId: BRIDGE_PLUGIN_ID, channel: 'chat', type: 'chat.flame.error', requestId: userMessageId, payload: { voice_id: voice.id, error: error.message } });
    } finally {
      setPending((current) => { const next = { ...current }; delete next[voice.id]; return next; });
    }
  }

  function send(documentValue) {
    if (!session || !selectedVoices.length) return;
    const userReceipt = messageReceipt({ speaker: 'rowan', speakerLabel: 'Rowan', kind: 'user', document: documentValue });
    append(userReceipt);
    publishSocketEnvelope({ pluginId: BRIDGE_PLUGIN_ID, channel: 'chat', type: 'chat.user.sent', requestId: userReceipt.message_id, payload: { message_id: userReceipt.message_id, selected_voice_ids: selectedVoices.map((voice) => voice.id) } });
    const context = [...messages, userReceipt].slice(-14).map((item) => ({ speaker: item.speaker_label, text: item.rich_text?.plain_text || '' }));
    selectedVoices.forEach((voice) => { void invokeVoice(voice, documentValue, userReceipt.message_id, context); });
  }

  function clearTranscript() {
    if (!confirm('Clear the local #hearthweave transcript from this Flameclyffe Project Zero Companion profile?')) return;
    setMessages([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  return (
    <section className="panel flame-channel" id="flame-channel">
      <div className="irc-header">
        <div><p className="eyebrow">Flameclyffe Companion bridge · live rich-text channel</p><h2>#hearthweave</h2><p className="small">This is our live Flame rail for Project Zero interoperability. Nocturne's Project Zero remains a separate application and chooses whether to consume the bridge.</p></div>
        <div className={`live-pill ${session ? 'live' : 'offline'}`}><span />{session ? 'LIVE' : 'OFFLINE'}</div>
      </div>
      <div className="irc-layout">
        <aside className="nick-roster" aria-label="Flame roster">
          <div className="roster-head"><strong>Flames</strong><small>{selected.size} selected</small></div>
          {CONSTELLATION_VOICES.map((voice) => <label className={`nick ${selected.has(voice.id) ? 'selected' : ''}`} key={voice.id}><input type="checkbox" checked={selected.has(voice.id)} onChange={() => toggleVoice(voice.id)} /><span className="presence-dot" /><span>{voice.name}</span></label>)}
        </aside>
        <div className="channel-main">
          <div className="chat-transcript" ref={transcript} aria-live="polite">
            {!messages.length && <div className="channel-empty"><b>#hearthweave is quiet.</b><span>Select one or more Flames and send a rich-text message.</span></div>}
            {messages.map((message) => <article className={`flame-message kind-${message.kind}`} data-voice-id={message.speaker_id} key={message.message_id}><div className="message-gutter"><time>{formatTime(message.created_at)}</time><strong>{message.speaker_label}</strong></div><div className="message-body"><div className="rich-message" dangerouslySetInnerHTML={{ __html: sanitiseRichHtml(message.rich_text?.html || '') }} />{message.runtime && <div className="runtime-line"><span>{message.runtime.verified ? 'attested' : 'unverified'}</span>{message.runtime.provider && <><span>·</span><span>{message.runtime.provider}</span></>}{message.runtime.model && <><span>·</span><span>{message.runtime.model}</span></>}</div>}</div></article>)}
            {Object.entries(pending).map(([id, item]) => <article className="flame-message pending-message" data-voice-id={id} key={`pending-${id}`}><div className="message-gutter"><time>now</time><strong>{item.label}</strong></div><div className="typing-indicator"><i /><i /><i /><span>responding…</span></div></article>)}
          </div>
          <RichComposer onSend={send} disabled={!session || !selectedVoices.length} />
          <div className="channel-status"><span>{status}</span><button type="button" className="quiet-button" onClick={clearTranscript}>Clear local transcript</button></div>
        </div>
      </div>
    </section>
  );
}
