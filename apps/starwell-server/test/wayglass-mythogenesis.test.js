'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {mkdtempSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const {createCellGarden,PHASES}=require('../../../lib/wayglass-cell-mitosis.cjs');
const {createColonyCheckpointStore}=require('../../../lib/wayglass-colony-checkpoint.cjs');
test('mythic exchange remembers and becomes without canonising or losing lineage',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'mythic-colony-'));
 t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const open=()=>createCellGarden({store:createColonyCheckpointStore(dir)});
 const g=open();
 const p=await g.propose({cell_id:'cell:origin',expected_revision:0});
 const {culture}=g.commit({proposal_id:p.proposal_id,expected_revision:0,owner_confirmed:true});
 const [a,b]=culture.cells.filter(x=>x.status==='active').map(x=>x.cell_id);
 await g.specialise({cell_id:a,role:'resonance',expected_revision:1,owner_confirmed:true});
 await g.specialise({cell_id:b,role:'observation',expected_revision:2,owner_confirmed:true});
 const base={from_id:a,to_id:b,message:'a lantern in the river',owner_confirmed:true,receiver_route_approved:true};
 const inherited={world:'garden',origin:'inherited',interpretation:'a guide',source_refs:['fixture:lantern'],parent_ids:[]};
 const send=(rev,myth,extra={})=>g.exchange({...base,expected_revision:rev,myth,...extra});
 await assert.rejects(send(3,inherited,{receiver_route_approved:false}),/opt-in/i);
 await assert.rejects(send(3,{...inherited,parent_ids:['missing']}),/provenance/i);
 const first=(await send(3,inherited)).receipt;
 assert.equal(first.myth.canon_status,'candidate');
 assert.equal(first.myth.author_kind,'owner-directed');
 assert.deepEqual(first.wtl.phase_receipts.map(x=>x.phase),PHASES);
 const second=(await send(4,{...inherited,origin:'emergent',interpretation:'a warning',source_refs:[],parent_ids:[first.myth.motif_id]})).receipt;
 const third=(await send(5,{...inherited,origin:'mixed',interpretation:'both guide and warning',parent_ids:[first.myth.motif_id,second.myth.motif_id]})).receipt;
 assert.notEqual(second.myth.motif_id,first.myth.motif_id);
 assert.notEqual(first.wtl.source_hash,second.wtl.source_hash);
 assert.equal(third.myth.physical_effect_verified,false);
 assert.deepEqual(open().snapshot(),g.snapshot());
 assert.equal(open().snapshot().history[3].myth.interpretation,'a guide');
 g.feather();
 await assert.rejects(send(6,inherited),/Feather/i);
 assert.equal(open().snapshot().revision,6);
});

test('Remembering crosses mitosis only through actual carried memory, not ancestry alone',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'mythic-inheritance-'));
 t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const open=()=>createCellGarden({store:createColonyCheckpointStore(dir)});
 let g=open();
 async function divide(cell_id){
   const expected_revision=g.snapshot().revision;
   const p=await g.propose({cell_id,expected_revision});
   return g.commit({proposal_id:p.proposal_id,expected_revision,owner_confirmed:true}).receipt.daughter_ids;
 }
 async function role(cell_id,role){
   await g.specialise({cell_id,role,expected_revision:g.snapshot().revision,owner_confirmed:true});
 }
 const [a,b]=await divide('cell:origin');
 await role(a,'resonance'); await role(b,'observation');
 const send=(from_id,to_id,myth,extra={})=>g.exchange({
   from_id,to_id,myth,message:'Lantern',expected_revision:g.snapshot().revision,
   owner_confirmed:true,receiver_route_approved:true,...extra
 });
 const first=(await send(a,b,{world:'garden',origin:'inherited',interpretation:'guide',
   source_refs:['fixture:lantern'],parent_ids:[]})).receipt;
 const [c,d]=await divide(b);
 await role(c,'observation'); await role(d,'resonance');
 const [e]=await divide(a);
 await role(e,'resonance');
 g=open();
 const child={world:'garden',origin:'mixed',interpretation:'guide and warning',
   source_refs:[],parent_ids:[first.myth.motif_id]};
 const before=g.snapshot();
 await assert.rejects(send(e,c,child),/provenance/i,'ancestry without memory is insufficient');
 await assert.rejects(send(c,d,{...child,world:'other'}),/provenance/i,'no implicit world crossing');
 assert.deepEqual(g.snapshot(),before);
 const next=(await send(c,d,{...child,world:' garden '})).receipt;
 assert.deepEqual(next.myth.parent_ids,[first.myth.motif_id]);
 assert.equal(next.myth.canon_status,'candidate');
 assert.equal(next.myth.world,'garden');
 assert.equal(next.myth.author_kind,'owner-directed');
 assert.deepEqual(open().snapshot(),g.snapshot());
});
