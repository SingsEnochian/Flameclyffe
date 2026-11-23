import {build} from 'vite';
import {readFile,mkdir,writeFile,rm} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
const target=resolve('dist/ipad/First-Lantern-iPad.html');
const [template,source]=await Promise.all([
 readFile(resolve('apps/wayglass/first-lantern-ipad-template.html'),'utf8'),
 readFile(resolve('lib/wyrdrune/first-lantern.wtl'),'utf8')
]);
const scratch=resolve('dist/ipad/.vite-first-lantern');
await build({
 configFile:false,root:process.cwd(),base:'./',logLevel:'error',
 build:{
  outDir:scratch,emptyOutDir:true,minify:true,target:'safari16.4',
  lib:{
   entry:resolve('apps/wayglass/src/first-lantern-ipad.js'),
   name:'FirstLantern',formats:['iife'],fileName:()=> 'runner.js'
  }
 }
});
const escapeHtml=x=>x.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const script=(await readFile(resolve(scratch,'runner.js'),'utf8')).replace(/<\/script/gi,'<\\/script');
await rm(scratch,{recursive:true,force:true});
const html=template.replace('__WTL_SOURCE__',escapeHtml(source)).replace('__BUNDLE__',script);
if(html.includes('__BUNDLE__')||html.length<20000)throw new Error('Missing offline Wyrdrune bundle');
await mkdir(dirname(target),{recursive:true});await writeFile(target,html,'utf8');
console.log('Built standalone First Lantern iPad app:',target,html.length,'bytes');
