import {spawn} from 'node:child_process';
import {cp,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const run=(args,extra={})=>new Promise((resolve,reject)=>{
 const child=spawn(process.platform==='win32'?'npm.cmd':'npm',args,{cwd:root,env:{...process.env,...extra},stdio:'inherit'});
 child.on('error',reject);child.on('close',code=>code===0?resolve():reject(new Error(args.join(' ')+' exited '+code)));
});
// Three independent outputs build concurrently; stage only a complete build set.
await Promise.all([run(['run','wayglass:build']),run(['run','arcsweep:build']),run(['run','starwell:build'],{STARWELL_BASE:'/starwell-foundry/'})]);
await run(['run','wayglass:stage:server']);
await run(['run','arcsweep:stage:server']);
await mkdir(new URL('../apps/starwell-server/public/starwell-foundry/',import.meta.url),{recursive:true});
await cp(new URL('../dist/starwell/',import.meta.url),new URL('../apps/starwell-server/public/starwell-foundry/',import.meta.url),{recursive:true});
console.log('Wayglass, inherited ArcSweep and Foundry staged together. No deployment performed.');
