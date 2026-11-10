import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
import {SOUND_PALETTE_SOURCE,SOUND_VOICES,SOUND_CHORDS,SOUND_RHYTHMS} from '../lib/wayglass-sound-palette.mjs';
const source=new URL('../lib/wayglass-sound-palette.mjs',import.meta.url),destination=new URL('../lib/wayglass-sound-palette.catalog.json',import.meta.url);
const catalog={schema:'wayglass.sound-palette-catalog/v1',source_ref:SOUND_PALETTE_SOURCE,source_sha256:createHash('sha256').update(await readFile(source)).digest('hex'),voices:SOUND_VOICES.map(({id,name,kind})=>({id,name,kind})),chords:SOUND_CHORDS,rhythms:SOUND_RHYTHMS,tempo_bpm:{min:20,max:240},sample_source:'owner-import:sha256',autoplay:false};
const text=JSON.stringify(catalog,null,2)+'\n';
if(process.argv.includes('--check')){if(await readFile(destination,'utf8')!==text)throw Error('Sound palette catalogue is stale');}else await writeFile(destination,text);
console.log(SOUND_VOICES.length+' original voices · '+Object.keys(SOUND_CHORDS).length+' chord shapes · '+Object.keys(SOUND_RHYTHMS).length+' rhythms');
