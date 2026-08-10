import React, { useMemo, useState } from 'react';
import { glyphToSvg } from './glyphStudioIO.js';
import { makeId } from './glyphStudioModel.js';
import './forge-panel.css';

function option(glyph) { return <option key={glyph.id} value={glyph.id}>{glyph.character || '◇'} · {glyph.name} · U+{glyph.codepoint}</option>; }
function svgUrl(glyph) { return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(glyphToSvg(glyph))}`; }

function shapeProof(text, project) {
  const glyphs = project.glyphs || [];
  const byCharacter = new Map(glyphs.filter((glyph) => glyph.character).map((glyph) => [glyph.character, glyph]));
  const byId = new Map(glyphs.map((glyph) => [glyph.id, glyph]));
  const source = Array.from(text || '');
  const rules = (project.ligatures || []).map((rule) => ({ ...rule, inputs: rule.inputGlyphIds.map((id) => byId.get(id)) })).filter((rule) => rule.inputs.length >= 2 && rule.inputs.every(Boolean) && byId.has(rule.outputGlyphId)).sort((a, b) => b.inputs.length - a.inputs.length);
  const shaped = [];
  for (let index = 0; index < source.length;) {
    const rule = rules.find((candidate) => candidate.inputs.every((glyph, offset) => glyph.character === source[index + offset]));
    if (rule) { shaped.push({ glyph: byId.get(rule.outputGlyphId), feature: rule.feature, source: rule.inputs.map((glyph) => glyph.character).join('') }); index += rule.inputs.length; continue; }
    shaped.push({ glyph: byCharacter.get(source[index]) || null, source: source[index] }); index += 1;
  }
  return shaped.map((item, index) => {
    const next = shaped[index + 1];
    const pair = item.glyph && next?.glyph ? (project.kerningPairs || []).find((entry) => entry.leftGlyphId === item.glyph.id && entry.rightGlyphId === next.glyph.id) : null;
    return { ...item, kern: Number(pair?.value || 0) };
  });
}

export default function ForgePanel({ project, onChangeProject }) {
  const [proof, setProof] = useState(() => project.glyphs.map((glyph) => glyph.character).filter(Boolean).join(''));
  const shaped = useMemo(() => shapeProof(proof, project), [proof, project]);
  const glyphs = project.glyphs;
  const addPair = () => onChangeProject({ ...project, kerningPairs: [...(project.kerningPairs || []), { id: makeId('kern'), leftGlyphId: glyphs[0]?.id || '', rightGlyphId: glyphs[1]?.id || glyphs[0]?.id || '', value: 0 }] }, 'Kerning pair added.');
  const patchPair = (id, patch) => onChangeProject({ ...project, kerningPairs: project.kerningPairs.map((pair) => pair.id === id ? { ...pair, ...patch } : pair) }, 'Kerning updated.');
  const removePair = (id) => onChangeProject({ ...project, kerningPairs: project.kerningPairs.filter((pair) => pair.id !== id) }, 'Kerning pair removed.');
  const addLigature = () => onChangeProject({ ...project, ligatures: [...(project.ligatures || []), { id: makeId('liga'), feature: 'liga', inputGlyphIds: glyphs.slice(0, 2).map((glyph) => glyph.id), outputGlyphId: glyphs[2]?.id || glyphs[0]?.id || '' }] }, 'Ligature rule added.');
  const patchLigature = (id, patch) => onChangeProject({ ...project, ligatures: project.ligatures.map((rule) => rule.id === id ? { ...rule, ...patch } : rule) }, 'Ligature updated.');
  const removeLigature = (id) => onChangeProject({ ...project, ligatures: project.ligatures.filter((rule) => rule.id !== id) }, 'Ligature removed.');
  return <section className="forge-panel">
    <div className="panel-heading"><div><span>Type system</span><h2>Forge</h2></div></div>
    <p className="panel-footnote">Kerning changes spacing between a pair. Ligatures substitute a sequence with a deliberately drawn output glyph. Rules retain stable glyph IDs if names or codepoints change.</p>
    <div className="forge-section-title"><strong>Kerning pairs</strong><button onClick={addPair} disabled={!glyphs.length}>＋ Pair</button></div>
    <div className="forge-rule-list">{(project.kerningPairs || []).map((pair) => <article className="forge-rule" key={pair.id}>
      <select value={pair.leftGlyphId} onChange={(event) => patchPair(pair.id, { leftGlyphId: event.target.value })}>{glyphs.map(option)}</select><span>↔</span><select value={pair.rightGlyphId} onChange={(event) => patchPair(pair.id, { rightGlyphId: event.target.value })}>{glyphs.map(option)}</select>
      <label>Adjustment <input type="number" min="-1000" max="1000" value={pair.value} onChange={(event) => patchPair(pair.id, { value: Number(event.target.value) })} /></label><button className="danger" onClick={() => removePair(pair.id)}>Remove</button>
    </article>)}</div>
    <div className="forge-section-title"><strong>OpenType ligatures</strong><button onClick={addLigature} disabled={glyphs.length < 2}>＋ Rule</button></div>
    <div className="forge-rule-list">{(project.ligatures || []).map((rule) => <article className="forge-rule" key={rule.id}>
      <label>Feature<select value={rule.feature} onChange={(event) => patchLigature(rule.id, { feature: event.target.value })}><option value="liga">liga · standard</option><option value="dlig">dlig · discretionary</option><option value="rlig">rlig · required</option></select></label>
      <label>Input glyphs<select multiple value={rule.inputGlyphIds} onChange={(event) => patchLigature(rule.id, { inputGlyphIds: [...event.target.selectedOptions].map((entry) => entry.value) })}>{glyphs.map(option)}</select></label>
      <label>Output glyph<select value={rule.outputGlyphId} onChange={(event) => patchLigature(rule.id, { outputGlyphId: event.target.value })}>{glyphs.map(option)}</select></label><button className="danger" onClick={() => removeLigature(rule.id)}>Remove</button>
    </article>)}</div>
    <div className="forge-section-title"><strong>Proof sheet</strong><span>{shaped.length} shaped glyphs</span></div>
    <label className="field-label">Proof text<textarea value={proof} onChange={(event) => setProof(event.target.value)} placeholder="Type characters assigned in the Glyph panel…" /></label>
    <div className="forge-proof">{shaped.map((item, index) => item.glyph ? <figure key={`${index}-${item.glyph.id}`} style={{ marginRight: `${Math.max(-28, Math.min(28, item.kern / 10))}px` }}><img src={svgUrl(item.glyph)} alt={item.glyph.name} /><figcaption>{item.feature ? `${item.feature}: ${item.source}` : item.glyph.character}<small>{item.kern ? `kern ${item.kern}` : `U+${item.glyph.codepoint}`}</small></figcaption></figure> : <span className="forge-missing" key={index}>{item.source}<small>unmapped</small></span>)}</div>
  </section>;
}
