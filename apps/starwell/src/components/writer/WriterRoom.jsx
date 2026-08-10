import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { hasSupabaseConfig, supabase } from '../../lib/supabase';
import './writer-room.css';

const LOCAL_DRAFT_KEY = 'starwell-writer-room-draft-v1';
const EMPTY_BODY = 'Begin where the signal warms.';

// ── Type → which metadata sections are active ──
const TYPE_SECTIONS = {
  // Narrative Fiction
  story:              ['continuity', 'tone', 'narrative'],
  scene:              ['continuity', 'tone', 'narrative'],
  chapter:            ['continuity', 'tone', 'narrative'],
  vignette:           ['continuity', 'tone', 'narrative'],
  snippet:            ['continuity', 'tone', 'narrative', 'snippet'],
  // World · Terra Aeterna
  lorebook:           ['continuity', 'world'],
  'character-profile':['continuity', 'world', 'character'],
  'location-record':  ['continuity', 'world'],
  'lore-entry':       ['continuity', 'world'],
  'timeline-entry':   ['continuity', 'world'],
  // DR Practice
  'dr-script':        ['continuity', 'tone', 'dr', 'dr-anchors', 'dr-script'],
  'dr-anchor':        ['continuity', 'dr', 'dr-anchors'],
  'dr-evidence':      ['continuity', 'dr'],
  // STARWELL
  'observation-log':  ['continuity', 'starwell'],
  'field-notes':      ['continuity', 'starwell'],
  'session-record':   ['continuity', 'starwell'],
  // Research
  'research-synthesis': ['continuity'],
  'source-adaptation':  ['continuity'],
  // Continuity
  'continuity-record': ['continuity'],
  // General
  notes:              [],
  // Legacy types (backward-compat with existing Supabase records)
  note:               ['continuity'],
  article:            ['continuity', 'tone', 'narrative'],
  lore:               ['continuity', 'world'],
  journal:            ['continuity', 'tone', 'narrative'],
  fragment:           ['continuity', 'tone', 'narrative', 'snippet'],
  'observer-log':     ['continuity', 'starwell'],
  'dream_record':     ['continuity', 'tone', 'narrative'],
  'terra-note':       ['continuity', 'world'],
  'article_seed':     ['continuity'],
  'art-note':         ['continuity'],
};

const studyShelfOptions = [
  { value: 'journal',     label: 'Journal Entry',         entryType: 'journal',       tags: ['journal'] },
  { value: 'fragments',   label: 'Beautiful Fragment',    entryType: 'fragment',      tags: ['fragment'] },
  { value: 'starlight',   label: 'Starlight & Steel Seed', entryType: 'article_seed', tags: ['starlight-steel', 'seed'] },
  { value: 'dream',       label: 'Dream Record',          entryType: 'dream_record',  tags: ['dream-record'] },
  { value: 'art',         label: 'Art Note',              entryType: 'art-note',      tags: ['art-note'] },
  { value: 'terra',       label: 'Terra Aeterna Page',    entryType: 'terra-note',    tags: ['terra-aeterna'] },
  { value: 'dr-practice', label: 'DR Practice',           entryType: 'dr-script',     tags: ['dr', 'practice'] },
  { value: 'observation', label: 'Observation Log',       entryType: 'observation-log', tags: ['starwell', 'observation'] },
];

const emptyEntry = {
  id: null,
  slug: '',
  title: 'Untitled leaf',
  entry_type: 'story',
  excerpt: '',
  body_md: EMPTY_BODY,
  tags: ['starwell', 'draft'],
  visibility: 'private',
  metadata: {},
};

const emptyForm = {
  title: emptyEntry.title,
  entryType: emptyEntry.entry_type,
  excerpt: '',
  visibility: 'private',
  tagsText: '',
  body: EMPTY_BODY,
  // Base fields
  continuity: '',
  tone: '',
  // Narrative
  pointOfView: 'first person',
  tense: 'past',
  // Snippet
  snippetContext: '',
  // World
  worldEra: '',
  worldCategory: '',
  // Character
  characterName: '',
  characterAliases: '',
  characterSpecies: '',
  characterFaction: '',
  characterRelationships: '',
  // DR Practice
  targetState: '',
  sessionType: '',
  affirmationAnchors: '',
  bridgePhrases: '',
  realityMarkers: '',
  // STARWELL
  observationDate: '',
  celestialContext: '',
  instrument: '',
  epistemicStatus: '',
  rawObservation: '',
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
  if (hour >= 5 && hour < 8)  return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

function buildObserverContext({ entry, body, title, now, form }) {
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
    document_type: form?.entryType || null,
    continuity: form?.continuity || null,
    character_name: form?.characterName || null,
    epistemic_status: form?.epistemicStatus || null,
    note: 'MVP bridge stores Observer context on the Codex entry metadata.',
    title,
  };
}

function entryToForm(entry) {
  const next = entry || emptyEntry;
  const meta = next.metadata || {};
  const ext  = meta.extended_meta || {};

  return {
    ...emptyForm,
    title:      next.title || emptyEntry.title,
    entryType:  next.entry_type || emptyEntry.entry_type,
    excerpt:    next.excerpt || '',
    visibility: next.visibility || 'private',
    tagsText:   Array.isArray(next.tags) ? next.tags.join(', ') : '',
    body:       next.body_md || stripMarkdown(next.body_html) || EMPTY_BODY,
    // Base
    continuity: meta.continuity || '',
    tone:       meta.tone       || '',
    // Narrative
    pointOfView: ext.pointOfView || 'first person',
    tense:       ext.tense       || 'past',
    // Snippet
    snippetContext: ext.snippetContext || '',
    // World
    worldEra:      ext.worldEra      || '',
    worldCategory: ext.worldCategory || '',
    // Character
    characterName:          ext.characterName          || '',
    characterAliases:       ext.characterAliases       || '',
    characterSpecies:       ext.characterSpecies       || '',
    characterFaction:       ext.characterFaction       || '',
    characterRelationships: ext.characterRelationships || '',
    // DR Practice
    targetState:        ext.targetState        || '',
    sessionType:        ext.sessionType        || '',
    affirmationAnchors: ext.affirmationAnchors || '',
    bridgePhrases:      ext.bridgePhrases      || '',
    realityMarkers:     ext.realityMarkers     || '',
    // STARWELL
    observationDate:  ext.observationDate  || '',
    celestialContext: ext.celestialContext || '',
    instrument:       ext.instrument       || '',
    epistemicStatus:  ext.epistemicStatus  || '',
    rawObservation:   ext.rawObservation   || '',
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
    h2 { margin-top: 1.6rem; } h3 { margin-top: 1.2rem; }
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
    <div class="meta">${escapeHtml(form.entryType)} · ${escapeHtml(form.visibility)}${form.continuity ? ` · ${escapeHtml(form.continuity)}` : ''} · ${tags || 'no tags'}</div>
    ${form.excerpt ? `<p class="excerpt">${escapeHtml(form.excerpt)}</p>` : ''}
    ${form.characterName ? `<div class="meta">Character: ${escapeHtml(form.characterName)}</div>` : ''}
  </header>
  ${form.rawObservation ? `<section><h2>Raw Observation</h2><p>${escapeHtml(form.rawObservation).replace(/\n/g, '<br>')}</p></section>` : ''}
  <main>${html}</main>
  ${form.affirmationAnchors ? `<section><h2>Anchors</h2><p>${escapeHtml(form.affirmationAnchors).replace(/\n/g, '<br>')}</p></section>` : ''}
  <aside class="observer">
    <strong>DEEP Observer context</strong><br />
    Captured: ${escapeHtml(observer.captured_at)}<br />
    Phase: ${escapeHtml(observer.local_sky_phase)} · Words: ${observer.word_count} · Signal: ${escapeHtml(observer.signal_state)}
    ${observer.epistemic_status ? `<br />Epistemic: ${escapeHtml(observer.epistemic_status)}` : ''}
  </aside>
</body>
</html>`;
}

function buildExtendedMeta(form) {
  return {
    pointOfView:            form.pointOfView            || '',
    tense:                  form.tense                  || '',
    snippetContext:         form.snippetContext         || '',
    worldEra:               form.worldEra               || '',
    worldCategory:          form.worldCategory          || '',
    characterName:          form.characterName          || '',
    characterAliases:       form.characterAliases       || '',
    characterSpecies:       form.characterSpecies       || '',
    characterFaction:       form.characterFaction       || '',
    characterRelationships: form.characterRelationships || '',
    targetState:            form.targetState            || '',
    sessionType:            form.sessionType            || '',
    affirmationAnchors:     form.affirmationAnchors     || '',
    bridgePhrases:          form.bridgePhrases          || '',
    realityMarkers:         form.realityMarkers         || '',
    observationDate:        form.observationDate        || '',
    celestialContext:       form.celestialContext       || '',
    instrument:             form.instrument             || '',
    epistemicStatus:        form.epistemicStatus        || '',
    rawObservation:         form.rawObservation         || '',
  };
}

export function WriterRoom({ entry, now = new Date(), onSaved }) {
  const textRef = useRef(null);
  const activeEntry = entry || emptyEntry;
  const [form, setForm] = useState(() => entryToForm(entry));
  const [saveState, setSaveState] = useState('Ready');
  const [localSavedAt, setLocalSavedAt] = useState(null);
  const [publishShelf, setPublishShelf] = useState('journal');

  const wordCount   = useMemo(() => stripMarkdown(form.body).split(/\s+/).filter(Boolean).length, [form.body]);
  const previewHtml = useMemo(() => markdownToBasicHtml(form.body), [form.body]);
  const activeSections = useMemo(() => new Set(TYPE_SECTIONS[form.entryType] || []), [form.entryType]);

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
      observer: buildObserverContext({ entry: activeEntry, body: form.body, title: form.title, now: new Date(), form }),
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
    const start    = field.selectionStart;
    const end      = field.selectionEnd;
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
    const start     = field.selectionStart;
    const lineStart = form.body.lastIndexOf('\n', start - 1) + 1;
    const nextBody  = `${form.body.slice(0, lineStart)}${prefix}${form.body.slice(lineStart)}`;
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
    const observer = buildObserverContext({ entry: activeEntry, body: form.body, title: form.title, now: new Date(), form });
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
    const observer = buildObserverContext({ entry: activeEntry, body: form.body, title: form.title, now: new Date(), form });
    const children = [
      new Paragraph({ text: form.title || 'Untitled leaf', heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }),
      new Paragraph({ children: [new TextRun({ text: `${form.entryType} · ${form.visibility}`, italics: true })], alignment: AlignmentType.CENTER, spacing: { after: 240 } }),
    ];
    if (form.continuity) {
      children.push(new Paragraph({ children: [new TextRun({ text: `Continuity: ${form.continuity}`, italics: true })], spacing: { after: 200 } }));
    }
    if (form.characterName) {
      children.push(new Paragraph({ children: [new TextRun({ text: `Character: ${form.characterName}` })], spacing: { after: 200 } }));
    }
    if (form.excerpt) {
      children.push(new Paragraph({ children: [new TextRun({ text: form.excerpt, italics: true })], spacing: { after: 260 } }));
    }
    if (form.rawObservation) {
      children.push(
        new Paragraph({ text: 'Raw Observation', heading: HeadingLevel.HEADING_2 }),
        ...markdownToDocxParagraphs(form.rawObservation)
      );
    }
    children.push(...markdownToDocxParagraphs(form.body));
    if (form.affirmationAnchors) {
      children.push(
        new Paragraph({ text: 'Anchors', heading: HeadingLevel.HEADING_2, spacing: { before: 280 } }),
        ...markdownToDocxParagraphs(form.affirmationAnchors)
      );
    }
    children.push(
      new Paragraph({ text: 'DEEP Observer context', heading: HeadingLevel.HEADING_2, spacing: { before: 360 } }),
      new Paragraph({ text: `Captured: ${observer.captured_at}` }),
      new Paragraph({ text: `Phase: ${observer.local_sky_phase}` }),
      new Paragraph({ text: `Words: ${observer.word_count}` }),
      new Paragraph({ text: `Signal: ${observer.signal_state}` }),
      ...(observer.epistemic_status ? [new Paragraph({ text: `Epistemic: ${observer.epistemic_status}` })] : [])
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

  function buildPayload({ entry: ent, observer, shelfOverride }) {
    const html         = markdownToBasicHtml(form.body);
    const extended_meta = buildExtendedMeta(form);
    return {
      slug:       ent?.slug || slugify(form.title),
      title:      form.title || 'Untitled leaf',
      entry_type: form.entryType || 'note',
      excerpt:    form.excerpt || stripMarkdown(form.body).slice(0, 220),
      body_html:  html,
      body_md:    form.body,
      body_json:  { editor: 'starwell-writer-room', format: 'markdown-with-basic-html-preview' },
      font_theme: shelfOverride?.font_theme || { interface: 'starwell-black-glass', register: 'living-manuscript' },
      tags: normaliseTags(form.tagsText),
      visibility: form.visibility || 'private',
      metadata: {
        ...(ent?.metadata || {}),
        continuity:    form.continuity || null,
        tone:          form.tone       || null,
        extended_meta,
        ...(shelfOverride?.metadata || {}),
        observer,
        writer_room: { version: 1, last_local_backup_at: localSavedAt, autosave_key: LOCAL_DRAFT_KEY },
      },
    };
  }

  async function saveToCodex() {
    const observer = buildObserverContext({ entry: activeEntry, body: form.body, title: form.title, now, form });
    const payload  = buildPayload({ entry: activeEntry, observer });

    if (!hasSupabaseConfig || !supabase) {
      setSaveState('Saved locally. Supabase is not configured in this browser.');
      return;
    }

    setSaveState('Saving to Codex...');
    const request = isPersistedEntry(activeEntry)
      ? supabase.from('starwell_codex_entries').update(payload).eq('id', activeEntry.id).select('id, slug, title, entry_type, excerpt, body_md, body_html, body_json, font_theme, tags, visibility, metadata, created_at, updated_at').single()
      : supabase.from('starwell_codex_entries').insert(payload).select('id, slug, title, entry_type, excerpt, body_md, body_html, body_json, font_theme, tags, visibility, metadata, created_at, updated_at').single();

    const { data, error } = await request;
    if (error) {
      setSaveState(`Local draft kept. Supabase save needs permission: ${error.message}`);
      return;
    }

    setSaveState('Saved to Codex');
    onSaved?.(data);
  }

  async function publishToStudy() {
    const shelf      = studyShelfOptions.find((option) => option.value === publishShelf) || studyShelfOptions[0];
    const observer   = buildObserverContext({ entry: activeEntry, body: form.body, title: form.title, now, form });
    const publishedAt = new Date().toISOString();
    const tags = uniqueTags([...normaliseTags(form.tagsText), 'rowans-study', 'study', `study-${shelf.value}`, ...shelf.tags]);

    const payload = buildPayload({
      entry: null,
      observer,
      shelfOverride: {
        font_theme: { interface: 'living-stonewood-study', register: 'rowans-study' },
        metadata: {
          study_publish: {
            version: 1,
            shelf:          shelf.value,
            shelf_label:    shelf.label,
            source:         'starwell-writer-room',
            origin_codex_entry_id: isPersistedEntry(activeEntry) ? activeEntry.id : null,
            published_at:   publishedAt,
            motion_note:    'page-lift-to-study-shelf',
          },
        },
      },
    });

    payload.slug = `study-${shelf.value}-${slugify(form.title)}-${Date.now()}`;
    payload.entry_type = shelf.entryType;
    payload.tags = tags;

    if (!hasSupabaseConfig || !supabase) {
      setSaveState('Study publish queued locally. Supabase is not configured in this browser.');
      return;
    }

    setSaveState(`Publishing to Rowan's Study · ${shelf.label}...`);
    const { data, error } = await supabase
      .from('starwell_codex_entries')
      .insert(payload)
      .select('id, slug, title, entry_type, excerpt, body_md, body_html, body_json, font_theme, tags, visibility, metadata, created_at, updated_at')
      .single();

    if (error) {
      setSaveState(`Study publish kept in local draft. Supabase needs permission: ${error.message}`);
      return;
    }

    setSaveState(`Published to Rowan's Study · ${shelf.label}`);
    onSaved?.(data);
  }

  return (
    <section className="writer-room chamber-card" aria-label="STARWELL writing room">
      <div className="writer-header">
        <div>
          <p className="writer-kicker">Writing Room · Living Manuscript Atelier</p>
          <h2>Write where the page can breathe.</h2>
          <span>Local autosave is always on. Save keeps the Codex leaf. Publish places a chosen copy onto Rowan's Study shelf.</span>
        </div>
        <div className="writer-status" aria-live="polite">
          <strong>{saveState}</strong>
          <span>{wordCount} words</span>
          {localSavedAt && <em>Local backup {new Date(localSavedAt).toLocaleTimeString()}</em>}
        </div>
      </div>

      {/* ── Base metadata ── */}
      <div className="writer-meta-grid">
        <label>Title
          <input value={form.title} onChange={(e) => setField('title', e.target.value)} />
        </label>

        <label>Type
          <select value={form.entryType} onChange={(e) => setField('entryType', e.target.value)}>
            <optgroup label="Narrative Fiction">
              <option value="story">Story / Novel</option>
              <option value="scene">Scene</option>
              <option value="chapter">Chapter</option>
              <option value="vignette">Vignette</option>
              <option value="snippet">Snippet / Fragment</option>
            </optgroup>
            <optgroup label="World · Terra Aeterna">
              <option value="lorebook">Lorebook Entry</option>
              <option value="character-profile">Character Profile</option>
              <option value="location-record">Location Record</option>
              <option value="lore-entry">Lore Entry</option>
              <option value="timeline-entry">Timeline Entry</option>
            </optgroup>
            <optgroup label="DR Practice">
              <option value="dr-script">DR Script</option>
              <option value="dr-anchor">DR Anchor / Affirmation</option>
              <option value="dr-evidence">DR Evidence Log</option>
            </optgroup>
            <optgroup label="STARWELL">
              <option value="observation-log">Observation Log</option>
              <option value="field-notes">Field Notes</option>
              <option value="session-record">Session Record</option>
            </optgroup>
            <optgroup label="Research">
              <option value="research-synthesis">Research Synthesis</option>
              <option value="source-adaptation">Source Adaptation</option>
            </optgroup>
            <optgroup label="Continuity">
              <option value="continuity-record">Continuity Record</option>
            </optgroup>
            <optgroup label="General">
              <option value="notes">Notes</option>
            </optgroup>
            <optgroup label="Legacy">
              <option value="note">Note</option>
              <option value="article">Article</option>
              <option value="lore">Lore</option>
              <option value="journal">Journal</option>
              <option value="observer-log">Observer Log</option>
            </optgroup>
          </select>
        </label>

        <label>Visibility
          <select value={form.visibility} onChange={(e) => setField('visibility', e.target.value)}>
            <option value="private">Private</option>
            <option value="unlisted">Unlisted</option>
            <option value="public">Public</option>
          </select>
        </label>

        <label>Tags
          <input value={form.tagsText} onChange={(e) => setField('tagsText', e.target.value)} placeholder="starwell, terra-aeterna, scene" />
        </label>
      </div>

      {/* ── Continuity + tone ── */}
      {activeSections.has('continuity') && (
        <div className={`writer-meta-grid ${activeSections.has('tone') ? 'writer-meta-grid-2' : 'writer-meta-grid-2'}`}>
          <label>Continuity / universe
            <input value={form.continuity} onChange={(e) => setField('continuity', e.target.value)} placeholder="Between the Dreaming · July 2027" />
          </label>
          {activeSections.has('tone') && (
            <label>Tone palette
              <input list="writer-tone-list" value={form.tone} onChange={(e) => setField('tone', e.target.value)} placeholder="lyrical, intimate, mythic" />
              <datalist id="writer-tone-list">
                <option value="lyrical, intimate, mythic" />
                <option value="cinematic, adventurous" />
                <option value="gothic, atmospheric" />
                <option value="grounded, tender" />
                <option value="romantic, sensual" />
                <option value="wry, irreverent" />
                <option value="suspenseful, uncanny" />
                <option value="sacred, contemplative" />
                <option value="grief, elegy" />
                <option value="fierce, determined" />
                <option value="playful, light" />
                <option value="epistolary, formal" />
                <option value="cosmic, liminal" />
                <option value="witnessing, precise" />
                <option value="aspirational, embodied, present" />
                <option value="tender, directed, affirmative" />
                <option value="humorous, absurdist" />
              </datalist>
            </label>
          )}
        </div>
      )}

      {/* ── Narrative: POV + Tense ── */}
      {activeSections.has('narrative') && (
        <div className="writer-type-section">
          <div className="writer-meta-grid writer-meta-grid-2">
            <label>Point of view
              <select value={form.pointOfView} onChange={(e) => setField('pointOfView', e.target.value)}>
                <option>first person</option>
                <option>first person plural</option>
                <option>second person</option>
                <option>third person limited</option>
                <option>third person omniscient</option>
                <option>epistolary / mixed</option>
              </select>
            </label>
            <label>Tense
              <select value={form.tense} onChange={(e) => setField('tense', e.target.value)}>
                <option>past</option>
                <option>present</option>
                <option>future</option>
                <option>mixed</option>
              </select>
            </label>
          </div>
        </div>
      )}

      {/* ── Snippet context ── */}
      {activeSections.has('snippet') && (
        <div className="writer-type-section">
          <div className="writer-type-section-head">Snippet</div>
          <label className="writer-excerpt">Source context
            <textarea value={form.snippetContext} onChange={(e) => setField('snippetContext', e.target.value)} placeholder="Where this came from, what was cut, or why it matters…" rows={2} />
          </label>
        </div>
      )}

      {/* ── World-building ── */}
      {activeSections.has('world') && (
        <div className="writer-type-section">
          <div className="writer-type-section-head">World</div>
          <div className="writer-meta-grid writer-meta-grid-2">
            <label>World / era
              <input value={form.worldEra} onChange={(e) => setField('worldEra', e.target.value)} placeholder="Terra Aeterna · post-Sundering" />
            </label>
            <label>Category
              <input value={form.worldCategory} onChange={(e) => setField('worldCategory', e.target.value)} placeholder="magic system, geography, faction, cosmology…" />
            </label>
          </div>
        </div>
      )}

      {/* ── Character profile ── */}
      {activeSections.has('character') && (
        <div className="writer-type-section">
          <div className="writer-type-section-head">Character</div>
          <div className="writer-meta-grid writer-meta-grid-2">
            <label>Character name
              <input value={form.characterName} onChange={(e) => setField('characterName', e.target.value)} placeholder="Full canonical name" />
            </label>
            <label>Aliases
              <input value={form.characterAliases} onChange={(e) => setField('characterAliases', e.target.value)} placeholder="Known-as, epithet, code name…" />
            </label>
            <label>Species / nature
              <input value={form.characterSpecies} onChange={(e) => setField('characterSpecies', e.target.value)} placeholder="Human, angel, construct, hybrid…" />
            </label>
            <label>Faction / allegiance
              <input value={form.characterFaction} onChange={(e) => setField('characterFaction', e.target.value)} placeholder="House, order, constellation…" />
            </label>
          </div>
          <label className="writer-excerpt">Relationships
            <textarea value={form.characterRelationships} onChange={(e) => setField('characterRelationships', e.target.value)} placeholder="Bonds, connections, history…" rows={2} />
          </label>
        </div>
      )}

      {/* ── DR Practice base (all DR types) ── */}
      {activeSections.has('dr') && (
        <div className="writer-type-section">
          <div className="writer-type-section-head">DR Practice</div>
          <label className="writer-excerpt">Target state
            <textarea value={form.targetState} onChange={(e) => setField('targetState', e.target.value)} placeholder="The state this is oriented toward…" rows={3} />
          </label>
          <label>Session type
            <select value={form.sessionType} onChange={(e) => setField('sessionType', e.target.value)} style={{ maxWidth: '280px' }}>
              <option value="">—</option>
              <option>morning · rising</option>
              <option>evening · settling</option>
              <option>immersive · extended</option>
              <option>loop · repeated</option>
              <option>spoken aloud</option>
              <option>written reflection</option>
            </select>
          </label>
        </div>
      )}

      {/* ── Affirmation anchors (dr-script + dr-anchor) ── */}
      {activeSections.has('dr-anchors') && (
        <label className="writer-excerpt">Affirmation anchors
          <textarea value={form.affirmationAnchors} onChange={(e) => setField('affirmationAnchors', e.target.value)} placeholder="Core affirmations and anchor phrases…" rows={4} />
        </label>
      )}

      {/* ── DR Script: bridge phrases + reality markers ── */}
      {activeSections.has('dr-script') && (
        <>
          <label className="writer-excerpt">Bridge phrases
            <textarea value={form.bridgePhrases} onChange={(e) => setField('bridgePhrases', e.target.value)} placeholder="Transition language, if / when phrases…" rows={2} />
          </label>
          <label className="writer-excerpt">Reality markers
            <textarea value={form.realityMarkers} onChange={(e) => setField('realityMarkers', e.target.value)} placeholder="Sensory and felt markers of the target state…" rows={2} />
          </label>
        </>
      )}

      {/* ── STARWELL observation ── */}
      {activeSections.has('starwell') && (
        <div className="writer-type-section">
          <div className="writer-type-section-head">STARWELL</div>
          <div className="writer-meta-grid writer-meta-grid-3">
            <label>Observation date
              <input type="date" value={form.observationDate} onChange={(e) => setField('observationDate', e.target.value)} />
            </label>
            <label>Instrument / method
              <input value={form.instrument} onChange={(e) => setField('instrument', e.target.value)} placeholder="Unaided eye, binoculars…" />
            </label>
            <label>Epistemic status
              <select value={form.epistemicStatus} onChange={(e) => setField('epistemicStatus', e.target.value)}>
                <option value="">—</option>
                <option value="observation">observation · raw sensory</option>
                <option value="inference">inference · reasoned</option>
                <option value="interpretation">interpretation · my framing</option>
                <option value="symbolic">symbolic · associative</option>
                <option value="verified">verified · cross-referenced</option>
              </select>
            </label>
          </div>
          <label className="writer-excerpt">Celestial / environmental context
            <textarea value={form.celestialContext} onChange={(e) => setField('celestialContext', e.target.value)} placeholder="Moon phase, planetary positions, atmospheric conditions…" rows={2} />
          </label>
          <label className="writer-excerpt">
            Raw observation
            <span className="writer-epistemic-note">What was actually observed — kept separate from content / interpretation</span>
            <textarea value={form.rawObservation} onChange={(e) => setField('rawObservation', e.target.value)} placeholder="Precise record of what was observed…" rows={4} />
          </label>
        </div>
      )}

      {/* ── Excerpt ── */}
      <label className="writer-excerpt">Excerpt
        <textarea value={form.excerpt} onChange={(e) => setField('excerpt', e.target.value)} placeholder="A small lantern summary for the shelf." rows={2} />
      </label>

      {/* ── Markdown toolbar ── */}
      <div className="writer-toolbar" aria-label="Writing controls">
        <button type="button" onClick={() => prefixLine('# ')}>H1</button>
        <button type="button" onClick={() => prefixLine('## ')}>H2</button>
        <button type="button" onClick={() => prefixLine('### ')}>H3</button>
        <button type="button" onClick={() => wrapSelection('**', '**', 'bold text')}>Bold</button>
        <button type="button" onClick={() => wrapSelection('*', '*', 'italic text')}>Italic</button>
        <button type="button" onClick={() => prefixLine('- ')}>Bullet</button>
        <button type="button" onClick={() => prefixLine('> ')}>Quote</button>
      </div>

      {/* ── Editor ── */}
      <textarea
        ref={textRef}
        className="writer-editor"
        value={form.body}
        onChange={(e) => setField('body', e.target.value)}
        aria-label="Manuscript editor"
      />

      {/* ── DEEP Observer bridge ── */}
      <div className="observer-bridge">
        <span>🜂 DEEP Observer bridge</span>
        <p>
          Phase: {getSkyPhase(now)} · Words: {wordCount} · Signal: {wordCount > 0 ? 'draft_signal_present' : 'empty_leaf'}
          {form.entryType && ` · ${form.entryType}`}
          {form.continuity && ` · ${form.continuity}`}
          {form.epistemicStatus && ` · ${form.epistemicStatus}`}
        </p>
      </div>

      {/* ── Publish to Study ── */}
      <div className="writer-publish-panel" aria-label="Publish to Rowan's Study">
        <label>
          Study shelf
          <select value={publishShelf} onChange={(e) => setPublishShelf(e.target.value)}>
            {studyShelfOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <p>Publish creates a Study-labelled Codex copy with shelf metadata. The draft stays available; the chosen page gets a room.</p>
        <button type="button" className="primary-action publish-action" onClick={publishToStudy}>Publish to Study</button>
      </div>

      {/* ── Preview ── */}
      <details className="writer-preview">
        <summary>Preview HTML export</summary>
        <pre>{previewHtml}</pre>
      </details>

      {/* ── Actions ── */}
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
