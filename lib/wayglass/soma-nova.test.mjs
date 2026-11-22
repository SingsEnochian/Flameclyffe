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
const owner={id:'test-owner',authorized:true};
test('First Lantern: charge is inert, fire commits 9 with a receipt',async()=>{
 const chamber=createSomaNovaChamber({principal:owner});
 const charge=chamber.charge(spell);
 assert.equal(charge.status,'ready');assert.equal(charge.effects,'none');
 assert.equal(chamber.ready,true);
 await assert.rejects(chamber.fire(charge.chargeId),/consent/);
 const receipt=await chamber.fire(charge.chargeId,{consent:true});
 assert.equal(receipt.status,'committed');
 assert.ok(receipt.result.output.includes(9));
 assert.equal(receipt.outputKinds[0],'structured');
 assert.ok(receipt.receiptDigest);
 assert.equal(chamber.ready,false);
 await assert.rejects(chamber.fire(charge.chargeId,{consent:true}),/No matching/);
});
test('Feather cancels a staged charge',async()=>{
 const chamber=createSomaNovaChamber({principal:owner});
 const charge=chamber.charge(spell);chamber.feather();
 await assert.rejects(chamber.fire(charge.chargeId,{consent:true}),/No matching/);
});
test('Feather cancels active execution',async()=>{
 const chamber=createSomaNovaChamber({principal:owner});
 const charge=chamber.charge(spell);
 const running=chamber.fire(charge.chargeId,{consent:true});
 chamber.feather();
 await assert.rejects(running,/Feather/);
});
test('owner authorisation and external abort fail closed',()=>{
 assert.throws(()=>createSomaNovaChamber({principal:{id:'guest',authorized:false}}).charge(spell),/authorization/);
 const controller=new AbortController();controller.abort();
 assert.throws(()=>createSomaNovaChamber({principal:owner,signal:controller.signal}).charge(spell),/Feather/);
});
test('charge identity changes between invocations and stale IDs cannot fire',async()=>{
 const chamber=createSomaNovaChamber({principal:owner});
 const first=chamber.charge(spell);chamber.feather();
 const second=chamber.charge(spell);
 assert.notEqual(first.chargeId,second.chargeId);
 await assert.rejects(chamber.fire(first.chargeId,{consent:true}),/matching/);
 chamber.feather();
});
test('verification failure rolls back staged output',async()=>{
 const chamber=createSomaNovaChamber({principal:owner});
 const broken=spell.replace('light == 9','light == 10');
 const charge=chamber.charge(broken);
 const receipt=await chamber.fire(charge.chargeId,{consent:true});
 assert.equal(receipt.status,'rolled-back');
 assert.equal(receipt.result.output.length,0);
});
