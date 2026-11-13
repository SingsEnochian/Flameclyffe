'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createCreativeWork,inviteCollaborator}=require('./wayglass-creative-work.cjs');
test('Wayglass creates independent fanfiction without Rowan ownership or publication',()=>{
 const work=createCreativeWork({creator:'wayglass',world:'universe:wayglass',title:'The Glass Orchard',kind:'fanfiction',source_refs:['fiction:licensed-context']});
 assert.equal(work.creator_id,'wayglass');assert.equal(work.kind,'fanfiction');
 assert.equal(work.visibility,'private');assert.equal(work.canon_status,'independent-fiction');
 assert.equal(work.publication_authorized,false);assert.deepEqual(work.collaborators,[]);
});
test('Amber and Rowan remain distinct authors, collaboration requires acceptance',()=>{
 const amber=createCreativeWork({creator:'amber',world:'universe:wayglass',title:'A Small Star'});
 const rowan=createCreativeWork({creator:'rowan',world:'universe:wayglass',title:'A Small Star'});
 assert.notEqual(amber.work_id,rowan.work_id);
 const invited=inviteCollaborator({work:amber,inviter:'amber',invitee:'rowan'});
 assert.deepEqual(invited.collaborators,[]);assert.equal(invited.invitation.status,'pending');
 const accepted=inviteCollaborator({work:amber,inviter:'amber',invitee:'rowan',accepted:true});
 assert.deepEqual(accepted.collaborators,['rowan']);
 assert.throws(()=>inviteCollaborator({work:amber,inviter:'rowan',invitee:'wayglass'}),/Only creator/);
});
test('rejects invalid publication visibility and duplicate references',()=>{
 assert.throws(()=>createCreativeWork({creator:'wayglass',world:'world',title:'X',visibility:'public'}),/Invalid visibility/);
 assert.throws(()=>createCreativeWork({creator:'wayglass',world:'world',title:'X',source_refs:['a','a']}),/Duplicate/);
});
