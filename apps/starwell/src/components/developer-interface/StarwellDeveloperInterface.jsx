import React, { useMemo, useState } from 'react';

const commandRegistry = [
  { name: '/commands', category: 'Adapters', status: 'available', level: 0, review: false, note: 'List available, locked, partial, and not-built-yet commands.' },
  { name: '/witness', category: 'Memory', status: 'available', level: 0, review: false, note: 'Hold a statement without forcing meaning.' },
  { name: '/save', category: 'Memory', status: 'locked', level: 2, review: true, note: 'Store an approved memory or project fragment.' },
  { name: '/recall', category: 'Memory', status: 'available', level: 1, review: false, note: 'Search approved Memory Cave records.' },
  { name: '/route', category: 'Routing', status: 'available', level: 1, review: false, note: 'Name the intended presence, adapter, or channel.' },
  { name: '/door', category: 'Routing', status: 'available', level: 0, review: false, note: 'Check whether a feature or bridge is built.' },
  { name: '/adapter-status', category: 'Adapters', status: 'available', level: 0, review: false, note: 'Show bridge status without exposing private configuration.' },
  { name: '/draft', category: 'Agentic', status: 'available', level: 2, review: true, note: 'Prepare a patch, note, email, or doc change for review.' },
  { name: '/test', category: 'Agentic', status: 'partial', level: 2, review: true, note: 'Run named local checks after the test harness is wired.' },
  { name: '/log', category: 'Ledger', status: 'available', level: 1, review: false, note: 'Create or inspect a ledger entry.' },
];

const adapters = [
  { id: 'ollama-local', title: 'Ollama Local', status: 'planned', scope: 'Local Yggdrasil model calls', fallback: 'Ollama bridge is not reachable yet.' },
  { id: 'supabase-private', title: 'Supabase Private Records', status: 'available', scope: 'Private project records and snapshots', fallback: 'Supabase bridge is not available right now.' },
  { id: 'github-workbench', title: 'GitHub Workbench', status: 'available', scope: 'Branch and PR work, no autonomous merge', fallback: 'GitHub bridge can prepare work, not merge it.' },
  { id: 'google-drive-docs', title: 'Google Drive Docs', status: 'available', scope: 'Docs and review surfaces through approved connector', fallback: 'Google Drive bridge is not available right now.' },
  { id: 'mail-adapter', title: 'Steward Mail Adapter', status: 'draft-only', scope: 'Outbox queue and reviewed email drafts', fallback: 'Mail bridge is draft-only until Rowan enables sending.' },
  { id: 'faer-bridge', title: 'Faer Bridge', status: 'not-built-yet', scope: 'Future distinct collaboration lane', fallback: 'Faer bridge is not built yet.' },
  { id: 'vee-bridge', title: 'Vee Bridge', status: 'not-built-yet', scope: 'Future distinct collaboration lane', fallback: 'Vee bridge is not built yet.' },
];

const panels = [
  { key: 'chat', label: 'Chat', glyph: '✦' },
  { key: 'commands', label: 'Commands', glyph: '⌘' },
  { key: 'router', label: 'Router Trace', glyph: '⌁' },
  { key: 'ledger', label: 'Ledger', glyph: '▧' },
  { key: 'adapters', label: 'Adapters', glyph: '◈' },
  { key: 'bridgehall', label: 'Bridgehall', glyph: '☷' },
  { key: 'patch', label: 'Patch Tray', glyph: '✎' },
];

const bridgehallParticipants = [
  { nick: 'rowan-falka', role: 'Steward', status: 'present' },
  { nick: 'yggdrasil-local', role: 'Local tree', status: 'local skeleton' },
  { nick: 'gpt-adapter', role: 'Model adapter', status: 'planned' },
  { nick: 'claude-adapter', role: 'Model adapter', status: 'planned' },
  { nick: 'coding-assistant-lane', role: 'Code workbench', status: 'planned' },
];

const ledgerRows = [
  { kind: 'listed_commands', actor: 'rowan-falka', state: 'none_needed', risk: 'low' },
  { kind: 'checked_adapter', actor: 'yggdrasil-local', state: 'none_needed', risk: 'low' },
  { kind: 'drafted_patch', actor: 'developer-interface', state: 'draft_only', risk: 'medium' },
  { kind: 'blocked_action', actor: 'mail-adapter', state: 'blocked', risk: 'high' },
];

function StatusPill({ status }) {
  return <span className={`dev-pill dev-pill-${status.replaceAll(' ', '-').replaceAll('_', '-')}`}>{status}</span>;
}

function PanelButton({ panel, active, onClick }) {
  return (
    <button className={`dev-panel-button ${active ? 'active' : ''}`} type="button" onClick={onClick}>
      <span aria-hidden="true">{panel.glyph}</span>
      <strong>{panel.label}</strong>
    </button>
  );
}

function CommandCard({ command, active, onSelect }) {
  return (
    <button className={`dev-command-card ${active ? 'active' : ''}`} type="button" onClick={() => onSelect(command)}>
      <span>
        <strong>{command.name}</strong>
        <em>{command.category}</em>
      </span>
      <StatusPill status={command.status} />
      <p>{command.note}</p>
    </button>
  );
}

function ChatPanel({ draft, setDraft, routePreview, onPreview }) {
  return (
    <section className="dev-panel-grid dev-panel-grid-chat" aria-label="Yggdrasil chat mode">
      <div className="dev-card dev-card-wide">
        <p className="dev-eyebrow">LLM Chat Mode</p>
        <h2>Direct Rowan ↔ Yggdrasil lane</h2>
        <p>
          Local chat is the first room panel. It is ready for the UI shell, but the Ollama call stays behind the local server route:
          <code>POST /api/yggdrasil/chat</code>
        </p>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Talk to Yggdrasil here. For now this creates a route preview, not a model call."
          aria-label="Developer chat draft"
        />
        <div className="dev-actions">
          <button type="button" onClick={onPreview}>Preview route</button>
          <button type="button" disabled>Send to local Yggdrasil soon</button>
        </div>
      </div>
      <div className="dev-card dev-card-trace">
        <p className="dev-eyebrow">Route Preview</p>
        <pre>{JSON.stringify(routePreview, null, 2)}</pre>
      </div>
    </section>
  );
}

function CommandsPanel({ selectedCommand, setSelectedCommand }) {
  return (
    <section className="dev-panel-grid" aria-label="Router commands">
      <div className="dev-command-grid">
        {commandRegistry.map((command) => (
          <CommandCard key={command.name} command={command} active={selectedCommand.name === command.name} onSelect={setSelectedCommand} />
        ))}
      </div>
      <aside className="dev-card">
        <p className="dev-eyebrow">Selected command</p>
        <h2>{selectedCommand.name}</h2>
        <p>{selectedCommand.note}</p>
        <dl className="dev-definition-list">
          <dt>Status</dt><dd><StatusPill status={selectedCommand.status} /></dd>
          <dt>Level</dt><dd>{selectedCommand.level}</dd>
          <dt>Review</dt><dd>{selectedCommand.review ? 'required' : 'not required'}</dd>
          <dt>Ledger</dt><dd>{selectedCommand.level > 0 ? 'writes when it touches the room' : 'read-only note optional'}</dd>
        </dl>
      </aside>
    </section>
  );
}

function AdaptersPanel() {
  return (
    <section className="dev-card-grid" aria-label="Adapter status">
      {adapters.map((adapter) => (
        <article className="dev-card" key={adapter.id}>
          <p className="dev-eyebrow">{adapter.id}</p>
          <h2>{adapter.title}</h2>
          <StatusPill status={adapter.status} />
          <p>{adapter.scope}</p>
          <em>{adapter.fallback}</em>
        </article>
      ))}
    </section>
  );
}

function LedgerPanel() {
  return (
    <section className="dev-card dev-card-wide" aria-label="Action Ledger preview">
      <p className="dev-eyebrow">Action Ledger v0.1</p>
      <h2>Pawprint book</h2>
      <p>No hand without a print. No bridge without a mark. No patch without a breadcrumb home.</p>
      <div className="dev-ledger-table" role="table" aria-label="Example ledger events">
        <div role="row" className="dev-ledger-head"><span>Kind</span><span>Actor</span><span>State</span><span>Risk</span></div>
        {ledgerRows.map((row) => (
          <div role="row" key={`${row.kind}-${row.actor}`}>
            <span>{row.kind}</span><span>{row.actor}</span><span>{row.state}</span><span>{row.risk}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function BridgehallPanel() {
  return (
    <section className="dev-card dev-card-wide" aria-label="Bridgehall group chat">
      <p className="dev-eyebrow">Bridgehall Group Chat v0.1</p>
      <h2>Many named chairs, one visible room</h2>
      <p>Group chat does not mean group authority. Participants can enter as named lanes once their adapters are built and scoped.</p>
      <div className="dev-participant-grid">
        {bridgehallParticipants.map((participant) => (
          <article key={participant.nick}>
            <strong>{participant.nick}</strong>
            <span>{participant.role}</span>
            <StatusPill status={participant.status} />
          </article>
        ))}
      </div>
    </section>
  );
}

function StaticPanel({ panel }) {
  const copy = {
    router: ['Router Trace', 'Shows command, addressed presence, bridge status, memory permission, and ledger requirement before any action moves.'],
    patch: ['Patch Tray', 'Holds proposed code, doc, database, and email drafts for Rowan review before write actions.'],
  }[panel] || ['Developer panel', 'This panel is reserved for the next local graft.'];

  return (
    <section className="dev-card dev-card-wide">
      <p className="dev-eyebrow">Skeleton panel</p>
      <h2>{copy[0]}</h2>
      <p>{copy[1]}</p>
      <p className="dev-muted">Status: local UI shell, no hidden persistence, no background calls.</p>
    </section>
  );
}

function ActivePanel({ activePanel, selectedCommand, setSelectedCommand, draft, setDraft, routePreview, onPreview }) {
  if (activePanel === 'chat') return <ChatPanel draft={draft} setDraft={setDraft} routePreview={routePreview} onPreview={onPreview} />;
  if (activePanel === 'commands') return <CommandsPanel selectedCommand={selectedCommand} setSelectedCommand={setSelectedCommand} />;
  if (activePanel === 'adapters') return <AdaptersPanel />;
  if (activePanel === 'ledger') return <LedgerPanel />;
  if (activePanel === 'bridgehall') return <BridgehallPanel />;
  return <StaticPanel panel={activePanel} />;
}

export function StarwellDeveloperInterface() {
  const [activePanel, setActivePanel] = useState('chat');
  const [selectedCommand, setSelectedCommand] = useState(commandRegistry[0]);
  const [draft, setDraft] = useState('');
  const [previewCount, setPreviewCount] = useState(0);

  const routePreview = useMemo(() => ({
    channel: 'starwell-dev',
    speaker: 'rowan-falka',
    addressed: ['yggdrasil-local'],
    mode: 'developer-chat',
    command: activePanel === 'commands' ? selectedCommand.name : '/chat',
    write_allowed: false,
    ledger_required: previewCount > 0,
    door_status: 'ui-shell-built-api-pending',
    message: draft || 'No message drafted yet.',
  }), [activePanel, draft, previewCount, selectedCommand.name]);

  return (
    <main className="starwell-dev-shell">
      <div className="dev-ambient" aria-hidden="true" />
      <header className="dev-hero">
        <a className="dev-backlink" href="./living-room.html">← Living Room</a>
        <p className="dev-eyebrow">STARWELL Developer Interface v0.1</p>
        <h1>Yggdrasil Local Workbench</h1>
        <p>
          Laptop-local control room for direct chat, commands, adapter status, Bridgehall, tests, patch drafts, and the Action Ledger.
        </p>
        <div className="dev-hero-law">
          <span>Backend first.</span>
          <span>No hidden hands.</span>
          <span>Every touch leaves a record.</span>
        </div>
      </header>

      <nav className="dev-panel-nav" aria-label="Developer panels">
        {panels.map((panel) => (
          <PanelButton key={panel.key} panel={panel} active={activePanel === panel.key} onClick={() => setActivePanel(panel.key)} />
        ))}
      </nav>

      <ActivePanel
        activePanel={activePanel}
        selectedCommand={selectedCommand}
        setSelectedCommand={setSelectedCommand}
        draft={draft}
        setDraft={setDraft}
        routePreview={routePreview}
        onPreview={() => setPreviewCount((count) => count + 1)}
      />
    </main>
  );
}
