import {test} from 'node:test';
import assert from 'node:assert/strict';
import {proposeMythienceCrossing,proposeMythienceHybrid,mythienceSnapshot,clearMythience,subscribeMythience} from '../src/mythience-client.js';

for(const [name,propose] of [['crossing',proposeMythienceCrossing],['hybrid',proposeMythienceHybrid]]){
  test('cancelled '+name+' response cannot publish a stale Watercolour receipt',async()=>{
    clearMythience();
    const controller=new AbortController(),observations=[];
    const unsubscribe=subscribeMythience(value=>observations.push(value));
    const fetchImpl=async()=>({ok:true,json:async()=>{
      controller.abort();
      return {status:'candidate-returned',candidate:{expression:.8,permeability:.7},input_hash:'stale'};
    }});
    await assert.rejects(propose({request:{},seeds:{},signal:controller.signal,fetchImpl}),error=>error.name==='AbortError');
    assert.equal(mythienceSnapshot(),null);
    assert.deepEqual(observations,[]);
    unsubscribe();
  });
}
