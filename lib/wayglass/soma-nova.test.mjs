import test from 'node:test';
import assert from 'node:assert/strict';
import {createSomaNovaChamber} from './soma-nova.mjs';

const spell=`mobius scoped {
 perceive { let light = 3; emit "First Lantern begins"; }
 compress { set light = light * 2; }
 release { set light = light + 3; }
 verify { require light == 9 else "Lantern failed"; }
 integrate { emit "Light verified"; }
 choose { emit "Carry the light"; }
 return { emit light; }
 transcend { carry light = light; }
}`;
test('First Lantern: charge is inert, fire commits 9 with a receipt',async()=>{
 const chamber=createSomaNovaChamber({principal:{id:'test-owner',authorized:true}});
 const charge=chamber.charge(spell);
 assert.equal(charge.status,'ready');assert.equal(charge.effects,'none');
 await assert.rejects(chamber.fire(charge.chargeId),/consent/);
 const receipt=await chamber.fire(charge.chargeId,{consent:true});
 assert.equal(receipt.status,'committed');
 assert.ok(receipt.result.output.includes(9));
 assert.equal(receipt.outputKinds[0],'structured');
 assert.ok(receipt.receiptDigest);
 await assert.rejects(chamber.fire(charge.chargeId,{consent:true}),/No matching/);
});
test('Feather cancels a staged charge',async()=>{
 const chamber=createSomaNovaChamber({principal:{id:'test-owner',authorized:true}});
 const charge=chamber.charge(spell);chamber.feather();
 await assert.rejects(chamber.fire(charge.chargeId,{consent:true}),/No matching/);
});
test('unauthorized owner cannot charge',()=>{
 assert.throws(()=>createSomaNovaChamber({principal:{id:'guest',authorized:false}}).charge(spell),/authorization/);
});
