import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { hasSupabaseConfig, supabase } from '../../lib/supabase';
import './writer-room.css';

const LOCAL_DRAFT_KEY = 'starwell-writer-room-draft-v1';
const EMPTY_BODY = 'Begin where the signal warms.';

const studyShelfOptions = [
  { value: 'journal', label: 'Journal Entry', entryType: 'journal', tags: ['journal'] },
  { value: 'fragments', label: 'Beautiful Fragment', entryType: 'fragment', tags: ['fragment'] },
  { value: 'starlight', label: 'Starlight & Steel Seed', entryType: 'article_seed', tags: ['starlight-steel', 'seed'] },
  { value: 'dream', label: 'Dream Record', entryType: 'dream_record', tags: ['dream-record'] },
  { value: 'art', label: 'Art Note', entryType: 'art-note', tags: ['art-note'] },
  { value: 'terra', label: 'Terra Aeterna Page', entryType: 'terra-note', tags: ['terra-aeterna'] },
];

const emptyEntry = {
  id: null,
  slug: '',
  title: 'Untitled leaf',
  entry_type: 'note',
  excerpt: '',
  body_md: EMPTY_BODY,
  tags: ['starwell', 'draft'],
  visibility: 'private',
  metadata: {},
};

function slugify(value) {
  const slug = String(value || '')
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || `starwell-leaf-${Date.now()}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function markdownToBasicHtml(markdown) {
  return String(markdown || '')
    .split(/\n{2,}/)
    .map((block) => {
      const text = block.trim();
      if (!text) return '';
      if (text.startsWith('### ')) return `<h3>${escapeHtml(text.slice(4))}</h3>`;
      if (text.startsWith('## ')) return `<h2>${escapeHtml(text.slice(3))}</h2>`;
      if (text.startsWith('# ')) return `<h1>${escapeHtml(text.slice(2))}</h1>`;
      if (text.startsWith('> ')) return `<blockquote>${escapeHtml(text.slice(2))}</blockquote>`;
      if (text.split('\n').every((line) => line.trim().startsWith('- '))) {
        const items = text
          .split('\n')
          .map((line) => `<li>${escapeHtml(line.trim().slice(2))}</li>`)
          .join('');
        return `<ul>${items}</ul>`;
      }
      return `<p>${escapeHtml(text).replace(/\n/g, '<br />')}</p>`;
    })
    .filter(Boolean)
    .join('\n');
}

function stripMarkdown(value) {
  return String(value || '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/^[*-]\s+/gm, '')
    .replace(/[*_`]/g, '')
    .trim();
}

function normaliseTags(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function uniqueTags(tags) {
  return [...new Set(tags.map((tag) => String(tag || '').trim()).filter(Boolean))];
}

function getSkyPhase(date = new Date()) {
  const hour = date.getHours() + date.getMinutes() / 60;
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

function buildObserverContext({ entry, body, title, now }) {
  const plainText = stripMarkdown(body);
  const words = plainText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  return {
    source: 'starwell-writer-room',
    mode: 'DEEP Observer bridge',
    captured_at: now.toISOString(),
    local_sky_phase: getSkyPhase(now),
    word_count: wordCount,
    character_count: plainText.length,
    estimated_reading_minutes: Math.max(1, Math.ceil(wordCount / 220)),
    linked_codex_entry_id: entry?.id || null,
    signal_state: wordCount > 0 ? 'draft_signal_present' : 'empty_leaf',
    resonance_tags: ['writing-room', 'codex', 'deep-observer'],
    note: 'MVP bridge stores Observer context on the Codex entry metadata until live DEEP signals are promoted into their own records.',
    title,
  };
}

function entryToForm(entry) {
  const next = entry || emptyEntry;
  return {
    title: next.title || emptyEntry.title,
    entryType: next.entry_type || emptyEntry.entry_type,
    excerpt: next.excerpt || '',
    visibility: next.visibility || 'private',
    tagsText: Array.isArray(next.tags) ? next.tags.join(', ') : '',
    body: next.body_md || stripMarkdown(next.body_html) || EMPTY_BODY,
  };
}

function isPersistedEntry(entry) {
  return Boolean(entry?.id && !String(entry.id).includes('fallback') && !entry.local_only);
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadText(filename, content, type = 'text/markdown') {
  downloadBlob(filename, new Blob([content], { type }));
}

function markdownBlocks(markdown) {
  return String(markdown || '')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function cleanInlineMarkdown(value) {
  return String(value || '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1');
}

function textRunsFromMarkdown(value, options = {}) {
  const text = cleanInlineMarkdown(value);
  return [new TextRun({ text, ...options })];
}

function markdownToDocxParagraphs(markdown) {
  return markdownBlocks(markdown).flatMap((block) => {
    if (block.startsWith('### ')) {
      return [new Paragraph({ text: cleanInlineMarkdown(block.slice(4)), heading: HeadingLevel.HEADING_3 })];
    }

    if (block.startsWith('## ')) {
      return [new Paragraph({ text: cleanInlineMarkdown(block.slice(3)), heading: HeadingLevel.HEADING_2 })];
    }

    if (block.startsWith('# ')) {
      return [new Paragraph({ text: cleanInlineMarkdown(block.slice(2)), heading: HeadingLevel.HEADING_1 })];
    }

    if (block.startsWith('> ')) {
      return [
        new Paragraph({
          children: textRunsFromMarkdown(block.replace(/^>\s?/gm, ''), { italics: true }),
          indent: { left: 720 },
          spacing: { before: 180, after: 180 },
        }),
      ];
    }

    if (block.split('\n').every((line) => line.trim().startsWith('- '))) {
      return block.split('\n').map((line) =>
        new Paragraph({
          children: textRunsFromMarkdown(line.trim().slice(2)),
          bullet: { level: 0 },
          spacing: { after: 120 },
        })
      );
    }

    return [
      new Paragraph({
        children: textRunsFromMarkdown(block.replace(/\n/g, ' ')),
        spacing: { after: 220 },
      }),
    ];
  });
}

function buildPrintSheet({ form, html, observer }) {
  const tags = normaliseTags(form.tagsText).map(escapeHtml).join(', ');
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(form.title)} · STARWELL Export</title>
  <style>
    @page { margin: 0.72in; }
    body { color: #221b18; font-family: Georgia, 'Times New Roman', serif; line-height: 1.55; }
    header { border-bottom: 1px solid #c8a766; margin-bottom: 1.5rem; padding-bottom: 0.8rem; }
    h1 { font-size: 2.05rem; line-height: 1.15; margin: 0 0 0.45rem; }
    h2 { margin-top: 1.6rem; }
    h3 { margin-top: 1.2rem; }
    .meta, .observer { color: #5d514a; font-family: Arial, sans-serif; font-size: 0.82rem; }
    .excerpt { color: #4f3d35; font-style: italic; margin-top: 0.9rem; }
    blockquote { border-left: 4px solid #c8a766; color: #463933; margin: 1rem 0; padding-left: 1rem; }
    .observer { border-top: 1px solid #d7c8aa; margin-top: 2rem; padding-top: 0.8rem; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(form.title || 'Untitled leaf')}</h1>
    <div class="meta">${escapeHtml(form.entryType)} · ${escapeHtml(form.visibility)} · ${tags || 'no tags'}</div>
    ${form.excerpt ? `<p class="excerpt">${escapeHtml(form.excerpt)}</p>` : ''}
  </header>
  <main>${html}</main>
  <aside class="observer">
    <strong>DEEP Observer context</strong><br />
    Captured: ${escapeHtml(observer.captured_at)}<br />
    Phase: ${escapeHtml(observer.local_sky_phase)} · Words: ${observer.word_count} · Signal: ${escapeHtml(observer.signal_state)}
  </aside>
</body>
</html>`;
}

export function WriterRoom({ entry, now = new Date(), onSaved }) {
  const textRef = useRef(null);
  const activeEntry = entry || emptyEntry;
  const [form, setForm] = useState(() => entryToForm(entry));
  const [saveState, setSaveState] = useState('Ready');
  const [localSavedAt, setLocalSavedAt] = useState(null);
  const [publishShelf, setPublishShelf] = useState('journal');

  const wordCount = useMemo(() => stripMarkdown(form.body).split(/\s+/).filter(Boolean).length, [form.body]);
  const previewHtml = useMemo(() => markdownToBasicHtml(form.body), [form.body]);

  useEffect(() => {
    setForm(entryToForm(entry));
    setSaveState(entry?.local_only ? 'New local leaf' : 'Ready');
  }, [entry?.id]);

  useEffect(() => {
    const savedAt = new Date().toISOString();
    const draft = {
      entryId: activeEntry?.id || 'new',
      savedAt,
      publishShelf,
      ...form,
      observer: buildObserverContext({ entry: activeEntry, body: form.body, title: form.title, now: new Date() }),
    };

    try {
      window.localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(draft));
      setLocalSavedAt(savedAt);
    } catch (error) {
      setSaveState(`Local backup blocked: ${error.message}`);
    }
  }, [activeEntry?.id, form, publishShelf]);

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function wrapSelection(before, after = before, placeholder = 'text') {
    const field = textRef.current;
    if (!field) return;

    const start = field.selectionStart;
    const end = field.selectionEnd;
    const selected = form.body.slice(start, end) || placeholder;
    const nextBody = `${form.body.slice(0, start)}${before}${selected}${after}${form.body.slice(end)}`;
    setField('body', nextBody);

    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }

  function prefixLine(prefix) {
    const field = textRef.current;
    if (!field) return;
    const start = field.selectionStart;
    const lineStart = form.body.lastIndexOf('\n', start - 1) + 1;
    const nextBody = `${form.body.slice(0, lineStart)}${prefix}${form.body.slice(lineStart)}`;
    setField('body', nextBody);
    requestAnimationFrame(() => field.focus());
  }

  async function copyMarkdown() {
    await navigator.clipboard?.writeText(form.body);
    setSaveState('Markdown copied');
  }

  async function copyHtml() {
    await navigator.clipboard?.writeText(previewHtml);
    setSaveState('HTML copied');
  }

  function exportPdf() {
    const observer = buildObserverContext({ entry: activeEntry, body: form.body, title: form.title, now: new Date() });
    const sheet = buildPrintSheet({ form, html: previewHtml, observer });
    const printWindow = window.open('', '_blank', 'noopener,noreferrer');

    if (!printWindow) {
      downloadText(`${slugify(form.title)}-print-sheet.html`, sheet, 'text/html');
      setSaveState('PDF print window blocked. HTML print sheet downloaded.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(sheet);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    setSaveState('PDF print sheet opened');
  }

  async function exportDocx() {
    const observer = buildObserverContext({ entry: activeEntry, body: form.body, title: form.title, now: new Date() });
    const children = [
      new Paragraph({
        text: form.title || 'Untitled leaf',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `${form.entryType} · ${form.visibility}`, italics: true }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
      }),
    ];

    if (form.excerpt) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: form.excerpt, italics: true })],
          spacing: { after: 260 },
        })
      );
    }

    children.push(...markdownToDocxParagraphs(form.body));
    children.push(
      new Paragraph({
        text: 'DEEP Observer context',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 360 },
      }),
      new Paragraph({ text: `Captured: ${observer.captured_at}` }),
      new Paragraph({ text: `Phase: ${observer.local_sky_phase}` }),
      new Paragraph({ text: `Words: ${observer.word_count}` }),
      new Paragraph({ text: `Signal: ${observer.signal_state}` })
    );

    const doc = new Document({
      creator: 'STARWELL Writer Room',
      title: form.title || 'Untitled leaf',
      description: form.excerpt || 'STARWELL Codex export',
      sections: [{ children }],
    });

    const blob = await Packer.toBlob(doc);
    downloadBlob(`${slugify(form.title)}.docx`, blob);
    setSaveState('DOCX exported');
  }

  async function saveToCodex() {
    const observer = buildObserverContext({ entry: activeEntry, body: form.body, title: form.title, now });
    const html = markdownToBasicHtml(form.body);
    const payload = {
      slug: activeEntry?.slug || slugify(form.title),
      title: form.title || 'Untitled leaf',
      entry_type: form.entryType || 'note',
      excerpt: form.excerpt || stripMarkdown(form.body).slice(0, 220),
      body_html: html,
      body_md: form.body,
      body_json: {
        editor: 'starwell-writer-room',
        format: 'markdown-with-basic-html-preview',
      },
      font_theme: {
        interface: 'starwell-black-glass',
        register: 'living-manuscript',
      },
      tags: normaliseTags(form.tagsText),
      visibility: form.visibility || 'private',
      metadata: {
        ...(activeEntry?.metadata || {}),
        observer,
        writer_room: {
          version: 1,
          last_local_backup_at: localSavedAt,
          autosave_key: LOCAL_DRAFT_KEY,
        },
      },
    };

    if (!hasSupabaseConfig || !supabase) {
      setSaveState('Saved locally. Supabase is not configured in this browser.');
      return;
    }

    setSaveState('Saving to Codex...');

    const request = isPersistedEntry(activeEntry)
      ? supabase
          .from('starwell_codex_entries')
          .update(payload)
          .eq('id', activeEntry.id)
          .select('id, slug, title, entry_type, excerpt, body_md, body_html, body_json, font_theme, tags, visibility, metadata, created_at, updated_at')
          .single()
      : supabase
          .from('starwell_codex_entries')
          .insert(payload)
          .select('id, slug, title, entry_type, excerpt, body_md, body_html, body_json, font_theme, tags, visibility, metadata, created_at, updated_at')
          .single();

    const { data, error } = await request;
    if (error) {
      setSaveState(`Local draft kept. Supabase save needs permission: ${error.message}`);
      return;
    }

    setSaveState('Saved to Codex with DEEP Observer metadata');
    onSaved?.(data);
  }

  async function publishToStudy() {
    const shelf = studyShelfOptions.find((option) => option.value === publishShelf) || studyShelfOptions[0];
    const observer = buildObserverContext({ entry: activeEntry, body: form.body, title: form.title, now });
    const html = markdownToBasicHtml(form.body);
    const publishedAt = new Date().toISOString();
    const tags = uniqueTags([
      ...normaliseTags(form.tagsText),
      'rowans-study',
      'study',
      `study-${shelf.value}`,
      ...shelf.tags,
    ]);

    const payload = {
      slug: `study-${shelf.value}-${slugify(form.title)}-${Date.now()}`,
      title: form.title || 'Untitled Study page',
      entry_type: shelf.entryType,
      excerpt: form.excerpt || stripMarkdown(form.body).slice(0, 220),
      body_html: html,
      body_md: form.body,
      body_json: {
        editor: 'starwell-writer-room',
        format: 'markdown-with-basic-html-preview',
      },
      font_theme: {
        interface: 'living-stonewood-study',
        register: 'rowans-study',
      },
      tags,
      visibility: form.visibility || 'private',
      metadata: {
        observer,
        study_publish: {
          version: 1,
          shelf: shelf.value,
          shelf_label: shelf.label,
          source: 'starwell-writer-room',
          origin_codex_entry_id: isPersistedEntry(activeEntry) ? activeEntry.id : null,
          published_at: publishedAt,
          motion_note: 'page-lift-to-study-shelf',
        },
        writer_room: {
          version: 1,
          last_local_backup_at: localSavedAt,
          autosave_key: LOCAL_DRAFT_KEY,
        },
      },
    };

    if (!hasSupabaseConfig || !supabase) {
      setSaveState('Study publish queued locally. Supabase is not configured in this browser.');
      return;
    }

    setSaveState(`Publishing to Rowan’s Study · ${shelf.label}...`);

    const { data, error } = await supabase
      .from('starwell_codex_entries')
      .insert(payload)
      .select('id, slug, title, entry_type, excerpt, body_md, body_html, body_json, font_theme, tags, visibility, metadata, created_at, updated_at')
      .single();

    if (error) {
      setSaveState(`Study publish kept in local draft. Supabase needs permission: ${error.message}`);
      return;
    }

    setSaveState(`Published to Rowan’s Study · ${shelf.label}`);
    onSaved?.(data);
  }

  return (
    <section className="writer-room chamber-card" aria-label="STARWELL writing room">
      <div className="writer-header">
        <div>
          <p className="writer-kicker">Writing Room · Living Manuscript Atelier</p>
          <h2>Write where the page can breathe.</h2>
          <span>Local autosave is always on. Save keeps the Codex leaf. Publish places a chosen copy onto Rowan’s Study shelf.</span>
        </div>
        <div className="writer-status" aria-live="polite">
          <strong>{saveState}</strong>
          <span>{wordCount} words</span>
          {localSavedAt && <em>Local backup {new Date(localSavedAt).toLocaleTimeString()}</em>}
        </div>
      </div>

      <div className="writer-meta-grid">
        <label>Title<input value={form.title} onChange={(event) => setField('title', event.target.value)} /></label>
        <label>Type<select value={form.entryType} onChange={(event) => setField('entryType', event.target.value)}><option value="note">Note</option><option value="article">Article</option><option value="scene">Scene</option><option value="lore">Lore</option><option value="journal">Journal</option><option value="observer-log">Observer Log</option></select></label>
        <label>Visibility<select value={form.visibility} onChange={(event) => setField('visibility', event.target.value)}><option value="private">Private</option><option value="unlisted">Unlisted</option><option value="public">Public</option></select></label>
        <label>Tags<input value={form.tagsText} onChange={(event) => setField('tagsText', event.target.value)} placeholder="starwell, terra-aeterna, scene" /></label>
      </div>

      <label className="writer-excerpt">Excerpt<textarea value={form.excerpt} onChange={(event) => setField('excerpt', event.target.value)} placeholder="A small lantern summary for the shelf." rows={2} /></label>

      <div className="writer-toolbar" aria-label="Writing controls">
        <button type="button" onClick={() => prefixLine('# ')}>H1</button>
        <button type="button" onClick={() => prefixLine('## ')}>H2</button>
        <button type="button" onClick={() => prefixLine('### ')}>H3</button>
        <button type="button" onClick={() => wrapSelection('**', '**', 'bold text')}>Bold</button>
        <button type="button" onClick={() => wrapSelection('*', '*', 'italic text')}>Italic</button>
        <button type="button" onClick={() => prefixLine('- ')}>Bullet</button>
        <button type="button" onClick={() => prefixLine('> ')}>Quote</button>
      </div>

      <textarea ref={textRef} className="writer-editor" value={form.body} onChange={(event) => setField('body', event.target.value)} aria-label="Manuscript editor" />

      <div className="observer-bridge"><span>🜂 DEEP Observer bridge</span><p>Phase: {getSkyPhase(now)} · Words: {wordCount} · Signal: {wordCount > 0 ? 'draft_signal_present' : 'empty_leaf'}</p></div>

      <div className="writer-publish-panel" aria-label="Publish to Rowan's Study">
        <label>
          Study shelf
          <select value={publishShelf} onChange={(event) => setPublishShelf(event.target.value)}>
            {studyShelfOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <p>Publish creates a Study-labelled Codex copy with shelf metadata. The draft stays available; the chosen page gets a room.</p>
        <button type="button" className="primary-action publish-action" onClick={publishToStudy}>Publish to Study</button>
      </div>

      <details className="writer-preview"><summary>Preview HTML export</summary><pre>{previewHtml}</pre></details>

      <div className="writer-actions">
        <button type="button" className="primary-action" onClick={saveToCodex}>Save Codex Leaf</button>
        <button type="button" onClick={copyMarkdown}>Copy Markdown</button>
        <button type="button" onClick={copyHtml}>Copy HTML</button>
        <button type="button" onClick={() => downloadText(`${slugify(form.title)}.md`, form.body)}>Download .md</button>
        <button type="button" onClick={exportPdf}>Export PDF</button>
        <button type="button" onClick={exportDocx}>Export DOCX</button>
      </div>
    </section>
  );
}

export default WriterRoom;
