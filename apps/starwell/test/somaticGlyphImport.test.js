import assert from 'node:assert/strict';
import test from 'node:test';
import { makeProject } from '../src/components/glyph-studio/glyphStudioModel.js';
import { mergeSomaticRuneRegistry, SOMATIC_GLYPH_REGISTRY } from '../src/components/glyph-studio/somaticGlyphImport.js';
import { glyphToSvg, normaliseGlyph } from '../src/components/glyph-studio/glyphStudioIO.js';
test('imports all 14 original manuscript glyphs without rewriting outlines',()=>{
 const {project,added}=mergeSomaticRuneRegistry(makeProject());
 assert.equal(SOMATIC_GLYPH_REGISTRY.runes.length,14); assert.equal(added.length,14);
 const glyph=project.glyphs.find(g=>g.semanticId==='rowan');
 const source=SOMATIC_GLYPH_REGISTRY.runes.find(r=>r.id==='rowan');
 assert.equal(glyph.outlinePath,source.path); assert.equal(glyph.outlineViewBox,source.viewBox);
 assert.equal(glyph.sourceImage,source.source); assert.equal(glyph.semanticKind,source.kind);
 assert.equal(glyph.codepointStatus,'provisional-private-use'); assert.equal(glyph.layers[0].locked,true);
});
test('import is idempotent and preserves existing project glyphs',()=>{
 const base=makeProject(), once=mergeSomaticRuneRegistry(base), twice=mergeSomaticRuneRegistry(once.project);
 assert.equal(twice.added.length,0); assert.equal(twice.skipped.length,14);
 assert.equal(twice.project.glyphs.length,once.project.glyphs.length); assert.equal(twice.project.glyphs[0].id,base.glyphs[0].id);
});
test('SVG export retains original outline and source provenance',()=>{
 const {project}=mergeSomaticRuneRegistry(makeProject());
 const glyph=normaliseGlyph(project.glyphs.find(g=>g.semanticId==='desired_timeline_shift'));
 const svg=glyphToSvg(glyph);
 assert.ok(svg.includes(glyph.outlinePath)); assert.match(svg,/desired_timeline_shift/); assert.match(svg,/IMG_5899\.jpeg/);
});
