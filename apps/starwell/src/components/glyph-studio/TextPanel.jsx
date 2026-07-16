import React, { useMemo, useRef, useState } from 'react';
import { makeId } from './glyphStudioModel.js';

const ALIGNMENTS = ['left', 'center', 'right', 'justify'];
const FONT_ACCEPT = '.ttf,.otf,.ttc,font/ttf,font/otf,font/collection';

function makeFontRecord(file, family) {
  return {
    id: makeId('font'),
    family,
    fileName: file.name,
    size: file.size,
    type: file.type || 'font/unknown',
    source: 'local-import',
    importedAt: new Date().toISOString(),
    status: 'loaded',
  };
}

export function makeTextLayer() {
  return {
    id: makeId('layer'),
    name: 'Text',
    kind: 'text',
    parentId: null,
    visible: true,
    locked: false,
    selected: false,
    opacity: 1,
    blendMode: 'normal',
    alphaLock: false,
    clippingMask: false,
    reference: false,
    private: false,
    maskOf: null,
    text: {
      content: 'Text',
      x: 180,
      y: 420,
      width: 640,
      height: 240,
      family: 'serif',
      style: 'normal',
      weight: 400,
      size: 96,
      kerning: 0,
      tracking: 0,
      leading: 1.2,
      baseline: 0,
      alignment: 'left',
      underline: false,
      outline: false,
      orientation: 'horizontal',
      capitals: false,
      colour: '#e6c67a',
      vector: true,
    },
  };
}

function Slider({ label, value, min, max, step = 1, suffix = '', onChange }) {
  return (
    <label className="range-field text-range">
      <span>{label}<output>{value}{suffix}</output></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

export default function TextPanel({ layer, fontLibrary, onChangeLayer, onChangeFontLibrary, onRasterize }) {
  const importRef = useRef(null);
  const [status, setStatus] = useState('Vector text remains editable.');
  const text = layer?.text;
  const families = useMemo(() => [
    { id: 'system-serif', family: 'serif', source: 'browser-generic' },
    { id: 'system-sans', family: 'sans-serif', source: 'browser-generic' },
    { id: 'system-mono', family: 'monospace', source: 'browser-generic' },
    ...(fontLibrary || []),
  ], [fontLibrary]);

  if (!layer || layer.kind !== 'text' || !text) {
    return <section className="text-panel empty"><p>Select or create a Text layer to open the Text Studio.</p></section>;
  }

  function patch(patchValue) {
    onChangeLayer({ ...layer, text: { ...text, ...patchValue } });
  }

  async function importFonts(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    const accepted = [];
    const rejected = [];

    for (const file of files) {
      const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
      if (!['.ttf', '.otf', '.ttc'].includes(extension)) {
        rejected.push(`${file.name}: unsupported extension`);
        continue;
      }
      try {
        const family = `STARWELL-${file.name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/gi, '-')}-${Date.now()}`;
        const buffer = await file.arrayBuffer();
        const face = new FontFace(family, buffer);
        await face.load();
        document.fonts.add(face);
        accepted.push(makeFontRecord(file, family));
      } catch (error) {
        rejected.push(`${file.name}: ${error.message}`);
      }
    }

    if (accepted.length) {
      onChangeFontLibrary([...(fontLibrary || []), ...accepted]);
      patch({ family: accepted[0].family });
    }
    setStatus([
      accepted.length ? `${accepted.length} font file${accepted.length === 1 ? '' : 's'} loaded for this STARWELL session.` : '',
      rejected.length ? rejected.join(' · ') : '',
    ].filter(Boolean).join(' '));
  }

  return (
    <section className="text-panel" aria-label="Text Studio">
      <div className="panel-heading">
        <div><span>Typography</span><h2>Text Studio</h2></div>
        <button onClick={() => importRef.current?.click()}>Import Fonts</button>
        <input ref={importRef} type="file" accept={FONT_ACCEPT} multiple hidden onChange={importFonts} />
      </div>

      <label className="field-label">Text
        <textarea value={text.content} onChange={(event) => patch({ content: event.target.value })} />
      </label>

      <div className="font-browser">
        <label className="field-label">Font
          <select value={text.family} onChange={(event) => patch({ family: event.target.value })}>
            {families.map((font) => <option key={font.id} value={font.family} style={{ fontFamily: font.family }}>{font.family}</option>)}
          </select>
        </label>
        <div className="font-preview" style={{ fontFamily: text.family, fontStyle: text.style, fontWeight: text.weight }}>
          {text.content || 'STARWELL'}
        </div>
      </div>

      <div className="field-pair">
        <label className="field-label">Style
          <select value={text.style} onChange={(event) => patch({ style: event.target.value })}>
            <option value="normal">Normal</option>
            <option value="italic">Italic</option>
            <option value="oblique">Oblique</option>
          </select>
        </label>
        <label className="field-label">Weight
          <select value={text.weight} onChange={(event) => patch({ weight: Number(event.target.value) })}>
            {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((weight) => <option key={weight} value={weight}>{weight}</option>)}
          </select>
        </label>
      </div>

      <Slider label="Size" value={text.size} min={6} max={480} suffix="px" onChange={(value) => patch({ size: value })} />
      <Slider label="Pair kerning" value={text.kerning} min={-100} max={200} onChange={(value) => patch({ kerning: value })} />
      <Slider label="Tracking" value={text.tracking} min={-100} max={400} onChange={(value) => patch({ tracking: value })} />
      <Slider label="Leading" value={text.leading} min={0.5} max={4} step={0.05} onChange={(value) => patch({ leading: value })} />
      <Slider label="Baseline" value={text.baseline} min={-300} max={300} suffix="px" onChange={(value) => patch({ baseline: value })} />
      <Slider label="Opacity" value={layer.opacity} min={0} max={1} step={0.01} onChange={(value) => onChangeLayer({ ...layer, opacity: value })} />

      <div className="text-alignments" aria-label="Text alignment">
        {ALIGNMENTS.map((alignment) => (
          <button key={alignment} className={text.alignment === alignment ? 'pressed' : ''} onClick={() => patch({ alignment })}>{alignment}</button>
        ))}
      </div>

      <div className="text-attributes">
        <button className={text.underline ? 'pressed' : ''} onClick={() => patch({ underline: !text.underline })}>Underline</button>
        <button className={text.outline ? 'pressed' : ''} onClick={() => patch({ outline: !text.outline })}>Outline</button>
        <button className={text.orientation === 'vertical' ? 'pressed' : ''} onClick={() => patch({ orientation: text.orientation === 'vertical' ? 'horizontal' : 'vertical' })}>Vertical</button>
        <button className={text.capitals ? 'pressed' : ''} onClick={() => patch({ capitals: !text.capitals })}>Capitals</button>
      </div>

      <div className="field-pair">
        <label className="field-label">Box width<input type="number" min="40" value={text.width} onChange={(event) => patch({ width: Number(event.target.value) })} /></label>
        <label className="field-label">Box height<input type="number" min="40" value={text.height} onChange={(event) => patch({ height: Number(event.target.value) })} /></label>
      </div>
      <label className="field-label colour-field">Text colour<input type="color" value={text.colour} onChange={(event) => patch({ colour: event.target.value })} /></label>

      <div className="text-actions">
        <button onClick={() => setStatus('Alternate-character browser is planned for the font inventory and FontForge bridge.')}>Glyph Browser</button>
        <button className="danger" onClick={() => {
          if (window.confirm('Rasterize this Text layer? Editable text and font metadata will be preserved only in project history.')) onRasterize(layer);
        }}>Rasterize</button>
      </div>
      <p className="panel-footnote" aria-live="polite">{status}</p>
    </section>
  );
}
