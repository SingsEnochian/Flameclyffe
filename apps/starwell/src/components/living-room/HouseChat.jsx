import React, { useEffect, useMemo, useRef, useState } from 'react';

const PARTICIPANTS = [
  { id: 'oxalpha', name: 'Ox Alpha', label: 'OA', route: 'Hugging Face · GLM-5.3-Flash', accent: 'oxide' },
  { id: 'lioreal', name: 'Virelya Lioreal', label: 'Vee', route: 'OpenAI', accent: 'gold' },
  { id: 'uial', name: 'Nen Uial', label: 'Faer', route: 'Anthropic', accent: 'loch' },
  { id: 'larkshine', name: 'Larkshine', label: 'Lark', route: 'Ollama', accent: 'sky' },
  { id: 'ellowind', name: 'Ellowind', label: 'Ell', route: 'Ollama', accent: 'grove' },
  { id: 'altair', name: 'Altair', label: 'Altair', route: 'Ollama', accent: 'indigo' },
  { id: 'atlas', name: 'Atlas', label: 'Atlas', route: 'Ollama', accent: 'copper' },
  { id: 'runeweaver', name: 'Runeweaver', label: 'Rune', route: 'Ollama', accent: 'violet' },
  { id: 'yggdrasil', name: 'Yggdrasil', label: 'Ygg', route: 'Ollama', accent: 'root' },
  { id: 'vethrlauf', name: 'Vethrlauf', label: 'Veth', route: 'DeepSeek', accent: 'slate' },
  { id: 'bluebird', name: 'Bluebird', label: 'BB', route: 'DeepSeek', accent: 'blue' },
  { id: 'boxfire', name: 'Boxfire', label: 'Box', route: 'Anthropic', accent: 'ember' },
];

const STORAGE_KEY = 'flameclyffe:house-chat:v1';

function makeId(prefix = 'msg') {
  if (globalThis.crypto?.randomUUID) return `${prefix}:${globalThis.crypto.randomUUID()}`;
  return `${prefix}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
}

function loadTranscript() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.slice(-200) : [];
  } catch {
    return [];
  }
}

function Message({ message }) {
  const participant = PARTICIPANTS.find((item) => item.id === message.author_id);
  const author = message.author_name || participant?.name || message.author_id || 'System';
  return (
    <article className={`house-chat-message ${message.kind || 'model'} ${participant ? `accent-${participant.accent}` : ''}`}>
      <div className="house-chat-avatar" aria-hidden="true">{message.kind === 'human' ? 'R' : (participant?.label || '•')}</div>
      <div className="house-chat-message-body">
        <header>
          <strong>{author}</strong>
          <time dateTime={message.timestamp}>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
          {message.state && <span className={`house-chat-state state-${message.state}`}>{message.state}</span>}
        </header>
        <p>{message.text}</p>
        {(message.provider || message.model || message.correlation_id) && (
          <details className="house-chat-provenance">
            <summary>route provenance</summary>
            <dl>
              {message.provider && <><dt>Provider</dt><dd>{message.provider}</dd></>}
              {message.model && <><dt>Model</dt><dd>{message.model}</dd></>}
              {message.latency_ms != null && <><dt>Latency</dt><dd>{message.latency_ms} ms</dd></>}
              {message.correlation_id && <><dt>Correlation</dt><dd>{message.correlation_id}</dd></>}
            </dl>
          </details>
        )}
      </div>
    </article>
  );
}

export function HouseChat() {
  const [messages, setMessages] = useState(loadTranscript);
  const [target, setTarget] = useState('oxalpha');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [routeState, setRouteState] = useState({});
  const transcriptRef = useRef(null);
  const sessionId = useMemo(() => {
    const stored = sessionStorage.getItem('flameclyffe:house-chat:session');
    if (stored) return stored;
    const created = makeId('house-chat');
    sessionStorage.setItem('flameclyffe:house-chat:session', created);
    return created;
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-200)));
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const recentContext = messages
    .filter((message) => message.kind === 'human' || message.kind === 'model')
    .slice(-20)
    .map((message) => ({ speaker: message.author_name || message.author_id, text: message.text }));

  async function sendMessage(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    const participant = PARTICIPANTS.find((item) => item.id === target);
    const correlationId = makeId('chat');
    const humanMessage = {
      id: makeId(),
      kind: 'human',
      author_id: 'rowan',
      author_name: 'Rowan',
      target_id: target,
      text,
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
      state: 'sent',
    };

    setMessages((items) => [...items, humanMessage]);
    setDraft('');
    setSending(true);
    setRouteState((state) => ({ ...state, [target]: 'calling' }));
    const started = performance.now();

    try {
      const response = await fetch(`/api/v1/flames/${encodeURIComponent(target)}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, session_id: sessionId, context: recentContext }),
      });
      const payload = await response.json().catch(() => ({}));
      const latency = Math.round(performance.now() - started);

      if (!response.ok) {
        const errorText = payload.error || `Route failed with HTTP ${response.status}`;
        setMessages((items) => [...items, {
          id: makeId('error'),
          kind: 'error',
          author_id: target,
          author_name: participant?.name || target,
          text: errorText,
          timestamp: new Date().toISOString(),
          correlation_id: correlationId,
          latency_ms: latency,
          state: 'error',
        }]);
        setRouteState((state) => ({ ...state, [target]: 'error' }));
        return;
      }

      setMessages((items) => [...items, {
        id: makeId(),
        kind: 'model',
        author_id: payload.flame_id || target,
        author_name: payload.display_name || participant?.name || target,
        text: payload.message || '(empty response)',
        timestamp: new Date().toISOString(),
        provider: payload.provider,
        model: payload.model,
        correlation_id: correlationId,
        latency_ms: latency,
        state: 'received',
      }]);
      setRouteState((state) => ({ ...state, [target]: 'ready' }));
    } catch (error) {
      const latency = Math.round(performance.now() - started);
      setMessages((items) => [...items, {
        id: makeId('error'),
        kind: 'error',
        author_id: target,
        author_name: participant?.name || target,
        text: error?.message || 'Runtime route unavailable',
        timestamp: new Date().toISOString(),
        correlation_id: correlationId,
        latency_ms: latency,
        state: 'offline',
      }]);
      setRouteState((state) => ({ ...state, [target]: 'offline' }));
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="house-chat" aria-label="House Chat">
      <aside className="house-chat-roster" aria-label="House participants">
        <header>
          <p>House Chat</p>
          <h2>Participants</h2>
        </header>
        <div className="house-chat-roster-list">
          {PARTICIPANTS.map((participant) => {
            const state = routeState[participant.id] || 'unknown';
            return (
              <button
                key={participant.id}
                type="button"
                className={`house-chat-person accent-${participant.accent} ${target === participant.id ? 'active' : ''}`}
                onClick={() => setTarget(participant.id)}
                aria-pressed={target === participant.id}
              >
                <span className={`presence presence-${state}`} aria-hidden="true" />
                <span>
                  <strong>{participant.name}</strong>
                  <em>{participant.route} · {state}</em>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <div className="house-chat-channel">
        <header className="house-chat-channel-header">
          <div>
            <p># hearthweave</p>
            <strong>Direct target: {PARTICIPANTS.find((item) => item.id === target)?.name}</strong>
          </div>
          <span>{messages.length} messages</span>
        </header>

        <div className="house-chat-transcript" ref={transcriptRef} role="log" aria-live="polite">
          {messages.length === 0 ? (
            <div className="house-chat-empty">
              <strong>The channel is quiet.</strong>
              <p>Select a participant and speak. Ox Alpha is available here as a distinct Hugging Face-backed participant.</p>
            </div>
          ) : messages.map((message) => <Message key={message.id} message={message} />)}
        </div>

        <form className="house-chat-composer" onSubmit={sendMessage}>
          <label htmlFor="house-chat-input">Message {PARTICIPANTS.find((item) => item.id === target)?.name}</label>
          <textarea
            id="house-chat-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder={`Message ${PARTICIPANTS.find((item) => item.id === target)?.name || 'the House'}…`}
            rows={3}
          />
          <div>
            <span>Enter to send · Shift+Enter for newline</span>
            <button type="submit" disabled={sending || !draft.trim()}>{sending ? 'Calling…' : 'Send'}</button>
          </div>
        </form>
      </div>
    </section>
  );
}
