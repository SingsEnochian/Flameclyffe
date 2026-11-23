// Check the exact downloadable single-file HTML, not just the source modules.
import {readFile} from 'node:fs/promises';
import {Script} from 'node:vm';
const html=await readFile('dist/ipad/First-Lantern-iPad.html','utf8');
const first=html.indexOf('<script>'),last=html.lastIndexOf('</script>');
if(first<0||last<=first)throw new Error('iPad bundle script element missing');
const js=html.slice(first+'<script>'.length,last);
if(js.includes('<!doctype html')||js.includes('__BUNDLE__')||js.includes('__WTL_SOURCE__'))
  throw new Error('iPad build accidentally expanded the template into JavaScript');
new Script(js,{filename:'First-Lantern-iPad.bundle.js'});
if(!html.includes('Run First Lantern')||!html.includes('mobius scoped'))
  throw new Error('First Lantern HTML missing native Wyrdrune controls/source');
console.log('iPad HTML payload verified:',js.length,'script characters');
