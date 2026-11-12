// Wyrdrune relational world semantics v0.1.
// Symbolic and coordinate addresses are independent routes to the SAME stable world ID.
// No glyph artwork, ritual meaning, world creation or participant consent is inferred.
export const WORLD_GRAPH_SCHEMA = 'wyrdrune.world-graph/v1';
const clone = value => JSON.parse(JSON.stringify(value));
const nonempty = (s,label) => {
  if(typeof s!=='string'||!s.trim()||s.length>256)throw new TypeError(label+' must be nonempty text (max 256)');
  return s;
};
const finite = (n,label) => {
  if(typeof n!=='number'||!Number.isFinite(n))throw new TypeError(label+' must be finite');
  return n;
};
export function worldRune(glyphId){
  return Object.freeze({kind:'wyrdrune.world-rune/v1',glyphId:nonempty(glyphId,'glyphId')});
}
export function worldCoordinates(universe,branch,time,x,y,z){
  return Object.freeze({kind:'wyrdrune.world-coordinates/v1',
    universe:nonempty(universe,'universe'),branch:nonempty(branch,'branch'),
    time:finite(time,'time'),x:finite(x,'x'),y:finite(y,'y'),z:finite(z,'z')});
}
export function whisperPhrase(phrase,softness){
  nonempty(phrase,'phrase');finite(softness,'softness');
  if(softness<0||softness>1)throw new RangeError('softness must be between 0 and 1');
  return Object.freeze({kind:'wyrdrune.whisper-phrase/v1',phrase,softness,
    // Modulation is an instruction, never a rewrite of the source phrase.
    sourcePreserved:true});
}
export function runeRelation(type,participants){
  nonempty(type,'relation type');
  if(!Array.isArray(participants)||participants.length<2||participants.length>64)
    throw new TypeError('relation needs 2 to 64 participants');
  const ids=participants.map((p,i)=>nonempty(p,'participant '+i));
  if(new Set(ids).size!==ids.length)throw new TypeError('relation participants must be distinct');
  return Object.freeze({kind:'wyrdrune.relation/v1',type,participants:Object.freeze(ids)});
}
const addrKey = address => {
  if(address?.kind==='wyrdrune.world-rune/v1')return 'rune:'+nonempty(address.glyphId,'glyphId');
  if(address?.kind==='wyrdrune.world-coordinates/v1'){
    const {universe,branch,time,x,y,z}=address;
    return 'coords:'+JSON.stringify([nonempty(universe,'universe'),nonempty(branch,'branch'),
      finite(time,'time'),finite(x,'x'),finite(y,'y'),finite(z,'z')]);
  }
  throw new TypeError('Expected a Wyrdrune rune or coordinate address');
};
const empty=()=>({schema:WORLD_GRAPH_SCHEMA,revision:0,worlds:[],connections:[],events:[]});
export class MemoryWorldStore {
  // Test/demo only: callers wanting durable continuity must provide a persistent CAS store.
  constructor(initial=empty()){this.state=clone(initial);}
  async load(){return clone(this.state);}
  async compareAndSwap(expected,next){
    if(this.state.revision!==expected)return false;
    this.state=clone(next);return true;
  }
}
export class RelationalWorldGraph {
  constructor({store,authorize}={}){
    if(typeof store?.load!=='function'||typeof store?.compareAndSwap!=='function')
      throw new TypeError('A load/compareAndSwap world store is required');
    if(typeof authorize!=='function')throw new TypeError('Explicit authorization callback required');
    this.store=store;this.authorize=authorize;
  }
  async snapshot(){
    const s=await this.store.load();
    if(s?.schema!==WORLD_GRAPH_SCHEMA||!Number.isSafeInteger(s.revision)||
      !Array.isArray(s.worlds)||!Array.isArray(s.connections)||!Array.isArray(s.events))
      throw new TypeError('Invalid world graph snapshot');
    return s;
  }
  async mutate(action,context,fn){
    if(!await this.authorize(action,context))throw new Error('World mutation denied: '+action);
    const current=await this.snapshot(),next=clone(current);
    const result=fn(next);
    next.revision++;
    if(!await this.store.compareAndSwap(current.revision,next))
      throw new Error('World graph revision conflict: retry after re-reading');
    return clone(result);
  }
  async registerWorld({id,rune=null,coordinates=null},context){
    nonempty(id,'world ID');
    if(!rune&&!coordinates)throw new TypeError('World requires rune or coordinates');
    if(rune)addrKey(rune);if(coordinates)addrKey(coordinates);
    return this.mutate('world.register',context,s=>{
      if(s.worlds.some(w=>w.id===id))throw new Error('World ID already exists');
      for(const a of [rune,coordinates].filter(Boolean))
        if(s.worlds.some(w=>[w.rune,w.coordinates].filter(Boolean).some(b=>addrKey(b)===addrKey(a))))
          throw new Error('World address already assigned');
      const world={id,rune,coordinates,parents:[],origin:null};
      s.worlds.push(world);s.events.push({kind:'world.registered',id});return world;
    });
  }
  async resolve(address){
    const key=addrKey(address),s=await this.snapshot();
    const matches=s.worlds.filter(w=>[w.rune,w.coordinates].filter(Boolean).some(a=>addrKey(a)===key));
    if(matches.length!==1)throw new Error(matches.length?'Ambiguous world address':'World address not found');
    return clone(matches[0]);
  }
  async connect({id,from,to,permeability,bidirectional=true,withness=true},context){
    nonempty(id,'connection ID');nonempty(from,'from');nonempty(to,'to');
    if(from===to)throw new TypeError('Connection needs distinct worlds');
    if(typeof bidirectional!=='boolean'||typeof withness!=='boolean')throw new TypeError('Connection flags must be boolean');
    if(!permeability||typeof permeability!=='object'||Array.isArray(permeability)||
      !Object.keys(permeability).length)throw new TypeError('Permeability channels required');
    const channels={};
    for(const [channel,value] of Object.entries(permeability)){
      nonempty(channel,'channel');finite(value,'permeability');
      if(value<0||value>1)throw new RangeError('Permeability must be in [0,1]');
      channels[channel]=value;
    }
    return this.mutate('membrane.connect',context,s=>{
      if(!s.worlds.some(w=>w.id===from)||!s.worlds.some(w=>w.id===to))
        throw new Error('Both worlds must exist');
      if(s.connections.some(c=>c.id===id))throw new Error('Connection ID already exists');
      const edge={id,from,to,permeability:channels,bidirectional,withness};
      s.connections.push(edge);s.events.push({kind:'membrane.connected',id,from,to});
      return edge;
    });
  }
  static reachable(s,ids,channel='possibility'){
    const found=new Set([ids[0]]),pending=[ids[0]];
    while(pending.length){
      const from=pending.shift();
      for(const c of s.connections){
        if(!(c.permeability[channel]>0)||!c.withness)continue;
        const to=c.from===from?c.to:c.bidirectional&&c.to===from?c.from:null;
        if(to&&!found.has(to)){found.add(to);pending.push(to);}
      }
    }
    return ids.every(id=>found.has(id));
  }
  async previewConjunction({id,parents,rune=null,coordinates=null,mode='third-body'}){
    nonempty(id,'new world ID');
    if(mode!=='third-body'&&mode!=='eightfold')throw new TypeError('Unknown conjunction mode');
    const relation=runeRelation('withness',parents);
    if(!rune&&!coordinates)throw new TypeError('New world needs a rune or coordinates');
    if(rune)addrKey(rune);if(coordinates)addrKey(coordinates);
    const s=await this.snapshot();
    if(s.worlds.some(w=>w.id===id))throw new Error('New world ID already exists');
    if(!parents.every(p=>s.worlds.some(w=>w.id===p)))throw new Error('Unknown parent world');
    if(!RelationalWorldGraph.reachable(s,parents))throw new Error('No permeable Withness path among parent worlds');
    for(const a of [rune,coordinates].filter(Boolean))
      if(s.worlds.some(w=>[w.rune,w.coordinates].filter(Boolean).some(b=>addrKey(b)===addrKey(a))))
        throw new Error('New world address already assigned');
    return Object.freeze({kind:'wyrdrune.conjunction-proposal/v1',revision:s.revision,
      id,parents:relation.participants,rune,coordinates,mode});
  }
  async commitConjunction(proposal,context){
    if(proposal?.kind!=='wyrdrune.conjunction-proposal/v1')throw new TypeError('Conjunction proposal required');
    // Re-evaluate against the current graph, not trusting caller-supplied provenance.
    const fresh=await this.previewConjunction(proposal);
    if(JSON.stringify(fresh)!==JSON.stringify(proposal))throw new Error('Stale or modified conjunction proposal');
    return this.mutate('world.conjoin',context,s=>{
      if(s.revision!==proposal.revision)throw new Error('Conjunction revision conflict');
      const world={id:proposal.id,rune:proposal.rune,coordinates:proposal.coordinates,
        parents:[...proposal.parents],origin:{mode:proposal.mode,atRevision:s.revision}};
      s.worlds.push(world);
      s.events.push({kind:'world.born',id:world.id,parents:[...world.parents],mode:proposal.mode});
      return world;
    });
  }
  async transition({from,to,channel='movement',direction='forward'}){
    nonempty(from,'from');nonempty(to,'to');nonempty(channel,'channel');
    if(direction!=='forward'&&direction!=='reverse')throw new TypeError('Direction must be forward or reverse');
    const s=await this.snapshot();
    if(!s.worlds.some(w=>w.id===from)||!s.worlds.some(w=>w.id===to))throw new Error('Unknown world');
    const c=s.connections.find(e=>e.permeability[channel]>0&&
      (e.from===from&&e.to===to||(e.bidirectional&&e.from===to&&e.to===from)));
    if(!c)throw new Error('No permitted permeable transition');
    return Object.freeze({kind:'wyrdrune.transition-plan/v1',from,to,channel,direction,
      membrane:c.id,permeability:c.permeability[channel],executed:false});
  }
  async possibilities(worldIds){
    const relation=runeRelation('eightfold-possibility',worldIds),s=await this.snapshot();
    if(!worldIds.every(id=>s.worlds.some(w=>w.id===id)))throw new Error('Unknown world');
    return Object.freeze({kind:'wyrdrune.possibility-field/v1',
      worlds:relation.participants,connected:RelationalWorldGraph.reachable(s,worldIds),
      // Possibilities are not automatically created worlds or predicted outcomes.
      created:false});
  }
}
export function createWorldBridges(graph,{context,selection,target}={}){
  if(!(graph instanceof RelationalWorldGraph))throw new TypeError('RelationalWorldGraph required');
  return Object.freeze({worlds:Object.freeze({
    selected:async()=>[...runeRelation('selection',selection).participants],
    target:async()=>clone(target),
    resolveId:async({arguments:args})=>(await graph.resolve(args[0])).id,
    preview:async({arguments:args})=>graph.previewConjunction(args[0]),
    verify:async({arguments:args})=>{
      const proposal=args[0],fresh=await graph.previewConjunction(proposal);
      if(JSON.stringify(fresh)!==JSON.stringify(proposal))throw new Error('Conjunction proposal changed');
      return 'verified';
    },
    commit:async({arguments:args})=>graph.commitConjunction(args[0],context),
  })});
}
