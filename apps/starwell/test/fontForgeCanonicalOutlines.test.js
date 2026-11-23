import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import test from 'node:test';
import {makeProject} from '../src/components/glyph-studio/glyphStudioModel.js';
import {mergeSomaticRuneRegistry} from '../src/components/glyph-studio/somaticGlyphImport.js';
const require=createRequire(import.meta.url);
const {buildFontJob,glyphOutlineSvg}=require('../../starwell-server/fontforge/worker.js');
test('FontForge jobs carry canonical SVG outlines instead of blank glyphs',()=>{
 const {project}=mergeSomaticRuneRegistry(makeProject());
 const job=buildFontJob(project,{familyName:'Wayglass Wyrdrune',formats:['ttf']});
 const imported=job.glyphs.filter(g=>g.semanticId);
 assert.equal(imported.length,14); assert.ok(imported.every(g=>g.hasOutlinePath));
 const svg=glyphOutlineSvg(project.glyphs.find(g=>g.semanticId==='return'));
 assert.match(svg,/<path d=/); assert.match(svg,/scale\([^)]* -/);
});
test('FontForge rejects unsafe SVG path data and invalid viewBoxes',()=>{
 const {project}=mergeSomaticRuneRegistry(makeProject()), glyph=project.glyphs.find(g=>g.semanticId==='rowan');
 glyph.outlinePath='<script>alert(1)</script>';
 assert.throws(()=>buildFontJob({...project,glyphs:[glyph]}),/unsafe SVG path/);
 const invalid=mergeSomaticRuneRegistry(makeProject()).project.glyphs.find(g=>g.semanticId==='rowan');
 invalid.outlineViewBox='0 0 0 0';
 assert.throws(()=>buildFontJob({...project,glyphs:[invalid]}),/viewBox/);
});
