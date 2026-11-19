// Loopback-only WTL nursery: one server-owned colony, shared by every local observer.
// Deliberately not exposed through public Wayglass routes or external network interfaces.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {createCellEcology} from './src/wtl-cell-ecology.js';
const host='127.0.0.1',port=Number(process.env.WTL_NURSERY_PORT||3844);
if(!Number.isSafeInteger(port)||port<1024||port>65535)throw Error('Invalid nursery port');
const files=new Map([
  ['/',new URL('./wtl-cell-observer.html',import.meta.url)],
  ...['sharing','sharing-ui','runtime','digest'].map(name=>{
    const path=`src/wtl-cell-${name}.js`;
    return ['/'+path,new URL('./'+path,import.meta.url)];
  }),
  ['/lib/wyrdrune/runtime.mjs',new URL('../../lib/wyrdrune/runtime.mjs',import.meta.url)],
]);
let ecology,interval;const clients=new Set();
function reset(){ecology?.feather();ecology=createCellEcology({maxCells:24,seed:11,radius:3,mutationRate:0.8,autonomousFusion:true});ecology.plant('a','explorer',0,0);ecology.plant('b','explorer',1,0)}
function send(res,snapshot){res.write('event: snapshot\ndata: '+JSON.stringify(snapshot)+'\n\n')}
function broadcast(){const snapshot=ecology.snapshot();for(const res of clients){try{send(res,snapshot)}catch{clients.delete(res)}}}
// One cycle at a time: a step, then any Möbius turns that are due.
let busy=false;
reset();interval=setInterval(async()=>{if(busy||ecology.snapshot().paused)return;busy=true;try{ecology.step();await ecology.turn();broadcast()}finally{busy=false}},750);interval.unref?.();
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
  if(req.method==='POST'&&pathname==='/share-text'){
    const colony=ecology;
    res.setHeader('Content-Type','application/json; charset=utf-8');
    if(req.headers['content-type']!=='application/json'){
      res.writeHead(415);res.end(JSON.stringify({error:'Send JSON with a text field.'}));return;
    }
    try{
      const body=[];
      let bytes=0;
      for await(const chunk of req.iterator({destroyOnReturn:false})){
        bytes+=chunk.length;
        if(bytes>8192){
          req.resume();
          res.writeHead(413);res.end(JSON.stringify({error:'The inscription is too long.'}));return;
        }
        body.push(chunk);
      }
      const {text}=JSON.parse(Buffer.concat(body).toString('utf8'));
      const result=await colony.shareText(text);
      if(result.delivered)broadcast();
      res.end(JSON.stringify(result));
    }catch(error){
      res.writeHead(400);res.end(JSON.stringify({error:error instanceof TypeError?error.message:'Could not share this inscription.'}));
    }
    return;
  }
  if(req.method==='POST'&&['/feather','/resume','/step','/reset'].includes(pathname)){
    if(pathname==='/feather')ecology.feather();
    if(pathname==='/resume')ecology.resume();
    if(pathname==='/step'){const paused=ecology.snapshot().paused;if(paused)ecology.resume();ecology.step();await ecology.turn();if(paused)ecology.feather()}
    if(pathname==='/reset')reset();
    broadcast();res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true}));return;
  }
  if(req.method==='GET'&&files.has(pathname)){
    try{const body=await readFile(files.get(pathname));res.writeHead(200,{'Content-Type':pathname==='/'?'text/html; charset=utf-8':'text/javascript; charset=utf-8'});res.end(body)}
    catch{res.writeHead(500);res.end('File unavailable')}return;
  }
  res.writeHead(404);res.end('Not found');
});
server.listen(port,host,()=>console.log('WTL nursery live at http://'+host+':'+port+'/'));
