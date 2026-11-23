import registry from '../../../../../lib/wyrdrune/somatic-glyph-registry.v0.2.json' with { type: 'json' };
export const SOMATIC_GLYPH_REGISTRY = registry;
function nextPrivateUseCodepoint(used) {
  for (let value=0xe000; value<=0xf8ff; value+=1) if (!used.has(value)) return value;
  throw new Error('The Unicode Private Use Area is exhausted.');
}
export function mergeSomaticRuneRegistry(project) {
  if (!project || !Array.isArray(project.glyphs)) throw new TypeError('A Glyph Studio project is required.');
  const known=new Set(project.glyphs.map(g=>g.semanticId).filter(Boolean));
  const used=new Set(project.glyphs.map(g=>Number.parseInt(g.codepoint,16)).filter(Number.isInteger));
  const added=[], skipped=[];
  for (const rune of registry.runes) {
    if (known.has(rune.id)) { skipped.push(rune.id); continue; }
    const cp=nextPrivateUseCodepoint(used); used.add(cp);
    const layerId='layer-canonical-'+rune.id;
    added.push({
      id:'wyrdrune-somatic-'+rune.id, name:rune.label, character:String.fromCodePoint(cp),
      codepoint:cp.toString(16).toUpperCase(), codepointStatus:'provisional-private-use',
      advanceWidth:1000,leftBearing:80,rightBearing:80,
      notes:'Canonical manuscript outline. Source image: '+rune.source+'. PUA mapping is provisional.',
      semanticId:rune.id,semanticKind:rune.kind,sourceArtifact:registry.source_artifact,sourceImage:rune.source,
      outlinePath:rune.path,outlineViewBox:rune.viewBox,outlineLayerId:layerId,glyphRegistrySchema:registry.schema,
      layers:[{id:layerId,name:'Canonical manuscript outline',kind:'vector',visible:true,locked:true,opacity:1,blendMode:'normal',private:false,reference:false}],
      activeLayerId:layerId,strokes:[],
      provenance:{artifact:registry.source_artifact,image:rune.source,importedFrom:'canonical-rune-registry',semanticId:rune.id}
    });
    known.add(rune.id);
  }
  return {
    project:{...project,name:project.name==='STARWELL Script Seed'?'Wayglass Wyrdrune':project.name,
      glyphs:[...project.glyphs,...added],activeGlyphId:added[0]?.id||project.activeGlyphId,updatedAt:new Date().toISOString()},
    added:added.map(g=>g.semanticId),skipped
  };
}
