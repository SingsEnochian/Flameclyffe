// Loopback-only WTL nursery: one server-owned colony, shared by every local observer.
// Deliberately not exposed through public Wayglass routes or external network interfaces.
import http from 'node:http';
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createCellEcology} from './src/wtl-cell-ecology.js';
// 3844 is also where a local Starwell/Hearthgate host often lives; the nursery
// defaults to 3845 so both can run. WTL_NURSERY_PORT still overrides it.
const host='127.0.0.1',port=Number(process.env.WTL_NURSERY_PORT||3845);
// The colony is kept on disk between runs (atomic write, digest checked).
const keepDir=process.env.WTL_NURSERY_DIR||path.join(process.env.WAYGLASS_DATA_DIR||path.join(os.homedir(),'.wayglass'),'nursery');
const keepFile=path.join(keepDir,'colony.json');
if(!Number.isSafeInteger(port)||port<1024||port>65535)throw Error('Invalid nursery port');
const files=new Map([
  ['/',new URL('./wtl-cell-observer.html',import.meta.url)],
  ['/src/wtl-cell-ecology.js',new URL('./src/wtl-cell-ecology.js',import.meta.url)],
  ['/src/wtl-cell-tissue.js',new URL('./src/wtl-cell-tissue.js',import.meta.url)]
]);
let ecology,interval;const clients=new Set();
const fresh=()=>createCellEcology({maxCells:24,seed:11,radius:3,mutationRate:0.8});
function reset(){ecology=fresh();ecology.plant('a','explorer',0,0);ecology.plant('b','explorer',1,0)}
async function keep(){
  await mkdir(keepDir,{recursive:true});
  const temp=keepFile+'.'+process.pid+'.tmp';
  await writeFile(temp,JSON.stringify(ecology.exportColony()));
  await rename(temp,keepFile);
}
async function bringBack(){
  let saved;try{saved=JSON.parse(await readFile(keepFile,'utf8'))}catch(error){if(error.code==='ENOENT')return false;throw error}
  const next=fresh();
  try{const r=next.importColony(saved);ecology=next;console.log(`Welcome back: ${r.cells} babies, ${r.worlds} worlds at cycle ${r.generation}`);return true}
  catch(error){
    // Never overwrite a copy that would not load; set it aside.
    const aside=keepFile.replace(/\.json$/,'')+'.unloadable-'+Date.now()+'.json';
    await rename(keepFile,aside);console.error('Kept colony could not be loaded ('+error.message+'); set aside at '+aside);return false;
  }
}
function send(res,snapshot){res.write('event: snapshot\ndata: '+JSON.stringify(snapshot)+'\n\n')}
function broadcast(){const snapshot=ecology.snapshot();for(const res of clients){try{send(res,snapshot)}catch{clients.delete(res)}}}
// One cycle at a time: a step, then any Möbius turns that are due.
let busy=false;
reset();await bringBack().catch(error=>console.error('Could not read the kept colony: '+error.message));
interval=setInterval(async()=>{if(busy||ecology.snapshot().paused)return;busy=true;try{ecology.step();await ecology.turn();broadcast();if(ecology.snapshot().generation%20===0)await keep().catch(e=>console.error('Could not keep the colony: '+e.message))}finally{busy=false}},750);interval.unref?.();
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{try{await keep()}catch{}process.exit(0)});
const server=http.createServer(async(req,res)=>{
  const allowedHost='127.0.0.1:'+port;
  if(req.headers.host!==allowedHost){res.writeHead(403);res.end('Host denied');return}
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(req.method==='POST'&&req.headers.origin!=='http://'+allowedHost){res.writeHead(403);res.end('Origin denied');return}
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'");
  if(req.method==='GET'&&pathname==='/events'){
    res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Connection':'keep-alive'});
    clients.add(res);send(res,ecology.snapshot());req.on('close',()=>clients.delete(res));return;
  }
  if(req.method==='GET'&&pathname==='/snapshot'){
    res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(ecology.snapshot()));return;
  }
  if(req.method==='POST'&&['/feather','/resume','/step','/reset'].includes(pathname)){
    if(pathname==='/feather')ecology.feather();
    if(pathname==='/resume')ecology.resume();
    if(pathname==='/step'){const paused=ecology.snapshot().paused;if(paused)ecology.resume();ecology.step();await ecology.turn();if(paused)ecology.feather()}
    if(pathname==='/reset'){const archive=keepFile.replace(/\.json$/,'')+'.archive-'+Date.now()+'.json';await keep().then(()=>rename(keepFile,archive)).catch(()=>{});reset();}
    broadcast();res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true}));return;
  }
  if(req.method==='GET'&&files.has(pathname)){
    try{const body=await readFile(files.get(pathname));res.writeHead(200,{'Content-Type':pathname==='/'?'text/html; charset=utf-8':'text/javascript; charset=utf-8'});res.end(body)}
    catch{res.writeHead(500);res.end('File unavailable')}return;
  }
  res.writeHead(404);res.end('Not found');
});
server.listen(port,host,()=>console.log('WTL nursery live at http://'+host+':'+port+'/'));
