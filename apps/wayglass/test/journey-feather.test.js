import test from 'node:test';
import assert from 'node:assert/strict';
import {createJourneyLedger} from '../src/journey-before-destination.js';
import {synchronizeJourneyFeather} from '../src/surfaces/journey-before-destination.js';
import {createSomaticSoundscape,WAYGLASS_FEATHER_EVENT} from '../src/somatic-sound.js';

test('shared Feather latches the actual Journey ledger once and confirmed release records once',()=>{
  const ledger=createJourneyLedger({now:()=> 'fixture-time'});
  synchronizeJourneyFeather({stopped:true},ledger);synchronizeJourneyFeather({stopped:true},ledger);
  assert.equal(ledger.snapshot().feather_stopped,true);assert.equal(ledger.snapshot().entries.length,1);
  assert.throws(()=>ledger.selectChamber('voyage'),/Feather Stop/);
  synchronizeJourneyFeather({stopped:false},ledger);assert.equal(ledger.snapshot().feather_stopped,true);
  synchronizeJourneyFeather({stopped:false,confirmed:true},ledger);synchronizeJourneyFeather({stopped:false,confirmed:true},ledger);
  assert.equal(ledger.snapshot().feather_stopped,false);assert.equal(ledger.snapshot().entries.length,2);
  assert.deepEqual(ledger.snapshot().entries.map(e=>e.kind),['feather-stop','feather-released']);
});
test('shared sound stop and release reconcile Journey after a room was unmounted without restarting sound',()=>{
  const scope=new EventTarget(),ledger=createJourneyLedger();
  const sound=createSomaticSoundscape({scope,getAudioContext:()=>null});
  const listener=event=>synchronizeJourneyFeather(event.detail,ledger);
  scope.addEventListener(WAYGLASS_FEATHER_EVENT,listener);
  sound.feather();assert.equal(ledger.snapshot().feather_stopped,true);
  scope.removeEventListener(WAYGLASS_FEATHER_EVENT,listener);
  sound.releaseFeather({confirmed:true});assert.equal(ledger.snapshot().feather_stopped,true);
  const restored=sound.snapshot();
  assert.equal(restored.feather_release_confirmed,true);
  synchronizeJourneyFeather({stopped:restored.feather_stopped,confirmed:restored.feather_release_confirmed},ledger);
  assert.equal(ledger.snapshot().feather_stopped,false);assert.equal(sound.snapshot().audio_enabled,false);
  sound.feather();assert.equal(sound.snapshot().feather_release_confirmed,false);sound.dispose();
});
