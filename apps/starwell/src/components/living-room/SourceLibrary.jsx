import React, { useEffect, useMemo, useState } from 'react';

const api = async (action, body = null) => {
  const response = await fetch(`/api/v1/library/${action}`, {
    method: body ? 'POST' : 'GET',
    credentials: 'include',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Source Library ${action} failed (${response.status})`);
  return payload;
};

const authorLabel = (doc) => doc?.author_display_name || doc?.author_name || 'Author not yet attributed';

function Provenance({ receipt }) {
  if (!receipt) return null;
  return (
    <small className="source-library-provenance">
      {receipt.flame_id ? `${receipt.flame_id} · ` : ''}
      {receipt.model || receipt.mode || receipt.action}
      {Number.isFinite(receipt.latency_ms) ? ` · ${receipt.latency_ms} ms` : ''}
    </small>
  );
}

function SearchPane({ documents }) {
  const [query, setQuery] = useState('');
  const [itemId, setItemId] = useState('');
  const [results, setResults] = useState([]);
  const [receipt, setReceipt] = useState(null);
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (query.trim().length < 2) return;
    setState('loading'); setError('');
    try {
      const payload = await api('search', {
        query: query.trim(),
        item_ids: itemId ? [itemId] : [],
        limit: 30,
      });
      setResults(payload.results || []);
      setReceipt(payload.receipt || null);
      setState('ready');
    } catch (err) {
      setError(err.message); setState('error');
    }
  };

  return (
    <section className="source-library-pane" aria-label="Search archive books">
      <form className="source-library-searchbar" onSubmit={submit}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search every extracted page…" aria-label="Search text" />
        <select value={itemId} onChange={(e) => setItemId(e.target.value)} aria-label="Limit search to one book">
          <option value="">All indexed books</option>
          {documents.map((doc) => <option value={doc.item_id} key={doc.item_id}>{doc.title}</option>)}
        </select>
        <button type="submit" disabled={state === 'loading'}>{state === 'loading' ? 'Searching…' : 'Search'}</button>
      </form>
      {error && <p className="source-library-error">{error}</p>}
      <div className="source-library-results">
        {results.map((result) => (
          <article key={result.segment_id} className="source-library-hit">
            <header>
              <strong>{result.document?.title || 'Untitled source'}</strong>
              <span>{authorLabel(result.document)}</span>
            </header>
            <p>{result.snippet}</p>
            <footer>
              <span>segment {result.segment_index}</span>
              {result.source_locator && Object.keys(result.source_locator).length > 0 && <code>{JSON.stringify(result.source_locator)}</code>}
            </footer>
          </article>
        ))}
        {state === 'ready' && results.length === 0 && <p>No indexed passages matched that search.</p>}
      </div>
      <Provenance receipt={receipt} />
    </section>
  );
}

function ComparePane({ documents }) {
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState('');
  const [synthesize, setSynthesize] = useState(true);
  const [result, setResult] = useState(null);
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');

  const toggle = (id) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id].slice(-6));
  const submit = async () => {
    if (selected.length < 2) return;
    setState('loading'); setError('');
    try {
      const payload = await api('compare', { item_ids: selected, query: query.trim(), synthesize });
      setResult(payload); setState('ready');
    } catch (err) {
      setError(err.message); setState('error');
    }
  };

  return (
    <section className="source-library-pane" aria-label="Compare archive books">
      <div className="source-library-compare-controls">
        <div className="source-library-book-picker">
          {documents.map((doc) => (
            <label key={doc.item_id} className={selected.includes(doc.item_id) ? 'selected' : ''}>
              <input type="checkbox" checked={selected.includes(doc.item_id)} onChange={() => toggle(doc.item_id)} />
              <span><strong>{doc.title}</strong><small>{authorLabel(doc)}</small></span>
            </label>
          ))}
        </div>
        <div className="source-library-compare-query">
          <textarea value={query} onChange={(e) => setQuery(e.target.value)} placeholder="What should the books be compared on? Leave blank for a broad source-grounded comparison." />
          <label className="source-library-toggle"><input type="checkbox" checked={synthesize} onChange={(e) => setSynthesize(e.target.checked)} /> Ask Ox Alpha to synthesize</label>
          <button type="button" onClick={submit} disabled={selected.length < 2 || state === 'loading'}>{state === 'loading' ? 'Comparing…' : `Compare ${selected.length || ''} books`}</button>
        </div>
      </div>
      {error && <p className="source-library-error">{error}</p>}
      {result?.synthesis?.message && (
        <article className="source-library-oa-card">
          <header><span className="source-library-oa-mark">OA</span><div><strong>Ox Alpha</strong><small>source comparison</small></div></header>
          <p>{result.synthesis.message}</p>
          <Provenance receipt={result.receipt} />
        </article>
      )}
      <div className="source-library-comparison-grid">
        {(result?.comparisons || []).map((comparison) => (
          <article key={comparison.document.item_id}>
            <h3>{comparison.document.title}</h3>
            <small>{authorLabel(comparison.document)}</small>
            {(comparison.evidence || []).map((evidence) => <p key={evidence.segment_id}><b>[{evidence.label}]</b> {evidence.snippet}</p>)}
          </article>
        ))}
      </div>
    </section>
  );
}

function AuthorPane({ documents }) {
  const [itemId, setItemId] = useState('');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');
  const selected = documents.find((doc) => doc.item_id === itemId) || null;

  useEffect(() => {
    if (!itemId && documents[0]?.item_id) setItemId(documents[0].item_id);
  }, [documents, itemId]);

  const submit = async (event) => {
    event.preventDefault();
    if (!itemId || !message.trim()) return;
    setState('loading'); setError('');
    try {
      const payload = await api('author', { item_id: itemId, message: message.trim() });
      setResult(payload); setState('ready');
    } catch (err) {
      setError(err.message); setState('error');
    }
  };

  return (
    <section className="source-library-pane source-library-author" aria-label="Ox Alpha author lens">
      <div className="source-library-author-intro">
        <span className="source-library-oa-mark">OA</span>
        <div><h3>Ox Alpha · Author Lens</h3><p>Choose a book. OA answers in first person as the authorial voice evidenced by that source, with retrieval markers preserved.</p></div>
      </div>
      <form onSubmit={submit} className="source-library-author-form">
        <select value={itemId} onChange={(e) => { setItemId(e.target.value); setResult(null); }}>
          {documents.map((doc) => <option value={doc.item_id} key={doc.item_id}>{doc.title} — {authorLabel(doc)}</option>)}
        </select>
        {selected && <p className="source-library-attribution">Attribution: <b>{selected.author_attribution_state || 'unknown'}</b> · extraction: <b>{selected.item?.extraction_status || 'unknown'}</b></p>}
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ask the author a question, request a passage, argument, explanation, dialogue, letter, or new text grounded in this book…" rows={5} />
        <button type="submit" disabled={!itemId || !message.trim() || state === 'loading'}>{state === 'loading' ? 'OA is reading…' : 'Write through Author Lens'}</button>
      </form>
      {error && <p className="source-library-error">{error}</p>}
      {result?.response?.message && (
        <article className="source-library-author-response">
          <header>
            <span className="source-library-oa-mark">OA</span>
            <div><strong>{authorLabel(result.document)}</strong><small>performed by Ox Alpha · {result.document.title}</small></div>
          </header>
          <div className="source-library-author-copy">{result.response.message}</div>
          <details><summary>Evidence used</summary>{(result.evidence || []).map((evidence) => <p key={evidence.segment_id}><b>[{evidence.label}]</b> {evidence.snippet}</p>)}</details>
          <Provenance receipt={result.receipt} />
        </article>
      )}
    </section>
  );
}

export function SourceLibrary() {
  const [documents, setDocuments] = useState([]);
  const [tab, setTab] = useState('search');
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api('list').then((payload) => {
      if (!active) return;
      setDocuments(payload.documents || []); setState('ready');
    }).catch((err) => {
      if (!active) return;
      setError(err.message); setState('error');
    });
    return () => { active = false; };
  }, []);

  const indexedCount = useMemo(() => documents.filter((doc) => doc.item?.index_status === 'indexed' || doc.item?.extraction_status === 'extracted').length, [documents]);

  return (
    <section className="source-library" aria-label="Flameclyffe Source Library">
      <header className="source-library-header">
        <div><p>Grand Library · private source archive</p><h2>Source Library</h2><span>{documents.length} catalogued · {indexedCount} text-ready</span></div>
        <nav aria-label="Source Library tools">
          {['search', 'compare', 'author'].map((name) => <button type="button" className={tab === name ? 'active' : ''} onClick={() => setTab(name)} key={name}>{name === 'author' ? 'OA Author Lens' : name[0].toUpperCase() + name.slice(1)}</button>)}
        </nav>
      </header>
      {state === 'loading' && <p className="source-library-loading">Opening indexed shelves…</p>}
      {error && <p className="source-library-error">{error}</p>}
      {state === 'ready' && tab === 'search' && <SearchPane documents={documents} />}
      {state === 'ready' && tab === 'compare' && <ComparePane documents={documents} />}
      {state === 'ready' && tab === 'author' && <AuthorPane documents={documents} />}
    </section>
  );
}
