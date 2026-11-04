// Open Becoming kernel: participants propose new relations and transformations.
// This registry records hypotheses without granting code execution or authority.
const copy=x=>JSON.parse(JSON.stringify(x));
export function createBecomingLattice(){
 return {schema:'wayglass.becoming-lattice/v0.1',entities:{},relations:[],proposals:[],next_id:1};
}
export function introduceForm(lattice,{author,form,description='',representation=null,provenance=[]}){
 if(!author||!form||typeof form!=='string')throw Error('Author and form required');
 const next=copy(lattice),id='form:'+next.next_id++;
 next.entities[id]={id,author,form,description,representation:copy(representation),
  provenance:copy(provenance),status:'proposed'};
 return {lattice:next,id};
}
export function proposeRelation(lattice,{author,from,to,relation,meaning=null,provenance=[]}){
 if(!lattice.entities[from]||!lattice.entities[to])throw Error('Unknown endpoints');
 if(!author||!relation)throw Error('Author and relation required');
 const next=copy(lattice),id='relation:'+next.next_id++;
 next.relations.push({id,author,from,to,relation,meaning:copy(meaning),
  provenance:copy(provenance),status:'proposed'});
 return {lattice:next,id};
}
export function proposeTransformation(lattice,{author,inputs=[],operation,outputs=[],hypothesis=null,provenance=[]}){
 if(!author||!operation||typeof operation!=='string')throw Error('Author and operation required');
 if(!Array.isArray(inputs)||!Array.isArray(outputs))throw Error('Invalid transformation');
 const next=copy(lattice),id='proposal:'+next.next_id++;
 next.proposals.push({id,author,inputs:copy(inputs),operation,outputs:copy(outputs),
  hypothesis:copy(hypothesis),provenance:copy(provenance),status:'unexamined',
  execution_authority:'none'});
 return {lattice:next,id};
}
export function inspectBecomingLattice(lattice){
 const entities=Object.values(lattice.entities);
 return {forms:entities.length,relations:lattice.relations.length,
  transformations:lattice.proposals.length,authors:[...new Set([
    ...entities.map(x=>x.author),...lattice.relations.map(x=>x.author),
    ...lattice.proposals.map(x=>x.author)])],
  unexamined:lattice.proposals.filter(x=>x.status==='unexamined').length};
}
