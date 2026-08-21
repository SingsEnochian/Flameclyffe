import React, { useMemo, useRef, useState } from 'react';
import { createRichTextDocument, executeNativeRichTextCommand, sanitiseRichHtml } from './richText.js';
import { emitTerraAeternaArtifact, loadTerraAeternaArtifacts } from './terraAeternaRootAdapter.js';
import { emitWriterRoomArtifact, loadWriterRoomArtifacts } from './writerRoomRailAdapter.js';

function ArtifactRow({ artifact }) {
  return (
    <article className="artifact-row">
      <div><strong>{artifact.title}</strong><span>{artifact.kind} · {artifact.world_id || 'unscoped world'}</span></div>
      <code>{artifact.source.local_path_alias || artifact.source_adapter}</code>
      <span className="artifact-authority">{artifact.authority.canon_status} · not Project Zero-adopted</span>
    </article>
  );
}

export default function ArtifactBridgePanel() {
  const editor = useRef(null);
  const [writerTitle, setWriterTitle] = useState('Untitled passage');
  const [writerWorld, setWriterWorld] = useState('terra-aeterna');
  const [writerTags, setWriterTags] = useState('');
  const [terraTitle, setTerraTitle] = useState('Untitled Terra Aeterna artifact');
  const [terraKind, setTerraKind] = useState('artifact');
  const [terraPath, setTerraPath] = useState('');
  const [terraMime, setTerraMime] = useState('');
  const [terraTags, setTerraTags] = useState('');
  const [message, setMessage] = useState('Ready. Nothing crosses into Project Zero unless its own connector accepts it.');
  const [revision, setRevision] = useState(0);

  const recent = useMemo(() => {
    const all = [...loadWriterRoomArtifacts(), ...loadTerraAeternaArtifacts()];
    return all.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 8);
  }, [revision]);

  function command(name, value = null) {
    editor.current?.focus();
    executeNativeRichTextCommand(name, value);
  }

  function receiptWriterPassage() {
    const html = sanitiseRichHtml(editor.current?.innerHTML || '');
    const richText = createRichTextDocument({ html });
    if (!richText.plain_text.trim()) {
      setMessage('Writer Room receipt stopped: the passage is empty.');
      return;
    }
    const artifact = emitWriterRoomArtifact({
      kind: 'passage',
      title: writerTitle,
      worldId: writerWorld || null,
      richText,
      tags: writerTags,
      localBindingKey: 'writer_drafts',
      metadata: { surface: 'companion-artifact-rail' },
    });
    setRevision((value) => value + 1);
    setMessage(`Writer Room artifact receipted locally: ${artifact.artifact_id}. No canon or Project Zero adoption implied.`);
  }

  function receiptTerraArtifact() {
    const artifact = emitTerraAeternaArtifact({
      kind: terraKind,
      title: terraTitle,
      localPath: terraPath,
      localBindingKey: 'terra_root',
      mimeType: terraMime || null,
      tags: terraTags,
      metadata: { surface: 'companion-artifact-rail' },
    });
    setRevision((value) => value + 1);
    setMessage(`Terra Aeterna artifact receipted locally: ${artifact.artifact_id}. Raw local path was not persisted.`);
  }

  return (
    <section className="panel artifact-bridge-panel" id="artifact-bridge-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Flameclyffe Companion · shared artifact rail</p>
          <h2>Terra Aeterna + Writer Room</h2>
          <p className="small">Both adapters emit the same typed artifact contract. The rail creates Flameclyffe receipts only; Nocturne's Project Zero chooses whether to consume them.</p>
        </div>
      </div>

      <div className="artifact-bridge-grid">
        <div className="artifact-compose-card">
          <h3>Writer Room Rail</h3>
          <label><span>Title</span><input value={writerTitle} onChange={(event) => setWriterTitle(event.target.value)} /></label>
          <div className="grid two"><label><span>World</span><input value={writerWorld} onChange={(event) => setWriterWorld(event.target.value)} /></label><label><span>Tags</span><input value={writerTags} onChange={(event) => setWriterTags(event.target.value)} placeholder="chapter, scene, draft" /></label></div>
          <div className="rich-toolbar" role="toolbar" aria-label="Writer Room formatting">
            <button type="button" onClick={() => command('bold')}><b>B</b></button>
            <button type="button" onClick={() => command('italic')}><i>I</i></button>
            <button type="button" onClick={() => command('underline')}><u>U</u></button>
            <button type="button" onClick={() => command('formatBlock', 'h3')}>H</button>
            <button type="button" onClick={() => command('insertUnorderedList')}>• list</button>
            <button type="button" onClick={() => command('formatBlock', 'blockquote')}>❝</button>
          </div>
          <div ref={editor} className="rich-editor artifact-editor" contentEditable suppressContentEditableWarning data-placeholder="Paste or write a rich-text passage…" />
          <button type="button" onClick={receiptWriterPassage}>Receipt Writer Room passage</button>
        </div>

        <div className="artifact-compose-card">
          <h3>Terra Aeterna Root</h3>
          <label><span>Title</span><input value={terraTitle} onChange={(event) => setTerraTitle(event.target.value)} /></label>
          <div className="grid two">
            <label><span>Kind</span><select value={terraKind} onChange={(event) => setTerraKind(event.target.value)}><option value="artifact">artifact</option><option value="image">image</option><option value="audio">audio</option><option value="document">document</option><option value="file">file</option></select></label>
            <label><span>MIME type</span><input value={terraMime} onChange={(event) => setTerraMime(event.target.value)} placeholder="image/png" /></label>
          </div>
          <label><span>Local path or alias</span><input value={terraPath} onChange={(event) => setTerraPath(event.target.value)} placeholder="C:/…/Hearthweave/moon-map.png" /></label>
          <p className="small">Only a short path alias is retained in the artifact receipt. The raw local path is deliberately discarded.</p>
          <label><span>Tags</span><input value={terraTags} onChange={(event) => setTerraTags(event.target.value)} placeholder="map, hearthweave, canon-candidate" /></label>
          <button type="button" onClick={receiptTerraArtifact}>Receipt Terra Aeterna artifact</button>
        </div>
      </div>

      <p className="status">{message}</p>
      <div className="artifact-ledger">
        <h3>Recent Companion artifacts</h3>
        {!recent.length ? <p className="small">No artifact receipts yet.</p> : recent.map((artifact) => <ArtifactRow artifact={artifact} key={artifact.artifact_id} />)}
      </div>
    </section>
  );
}
