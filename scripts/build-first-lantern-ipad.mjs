import {build} from 'esbuild';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
const target=resolve('dist/ipad/First-Lantern-iPad.html');
const [template,source]=await Promise.all([
 readFile(resolve('apps/wayglass/first-lantern-ipad-template.html'),'utf8'),
 readFile(resolve('lib/wyrdrune/first-lantern.wtl'),'utf8')
]);
const buildResult=await build({
 entryPoints:[resolve('apps/wayglass/src/first-lantern-ipad.js')],
 bundle:true,platform:'browser',format:'iife',target:['safari16.4'],
 minify:true,write:false,logLevel:'warning'
});
const escapeHtml=x=>x.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const script=buildResult.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
const html=template.replace('__WTL_SOURCE__',escapeHtml(source)).replace('__BUNDLE__',script);
if(html.includes('__BUNDLE__')||html.length<20000)throw new Error('Missing offline Wyrdrune bundle');
await mkdir(dirname(target),{recursive:true});await writeFile(target,html,'utf8');
console.log('Built standalone First Lantern iPad app:',target,html.length,'bytes');
