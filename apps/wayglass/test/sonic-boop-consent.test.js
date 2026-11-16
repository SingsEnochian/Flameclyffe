import test from 'node:test';import assert from 'node:assert/strict';
import {createSonicBoopConsent,boopDecision,revokeSonicBoops,grantSonicBoops} from '../src/sonic-boop-consent.js';
test('owner permits spontaneous greetings when audio is ready',()=>{const c=grantSonicBoops(createSonicBoopConsent(),{ownerConfirmed:true});assert.equal(boopDecision(c,{audioReady:true}).play,true);assert.equal(boopDecision(c).play,false);});
test('Feather and quiet mode always override boops',()=>{const c=grantSonicBoops(createSonicBoopConsent(),{ownerConfirmed:true});assert.equal(boopDecision(c,{audioReady:true,feather:true}).reason,'feather');assert.equal(boopDecision(c,{audioReady:true,quietMode:true}).play,false);});
test('permission can be revoked',()=>{const c=revokeSonicBoops(grantSonicBoops(createSonicBoopConsent(),{ownerConfirmed:true}));assert.equal(boopDecision(c,{audioReady:true}).play,false);});
test('does not grant arbitrary warning or external audio permission',()=>{assert.equal(boopDecision(grantSonicBoops(createSonicBoopConsent(),{ownerConfirmed:true}),{audioReady:true,kind:'system-warning'}).play,false);});

test('fresh session is silent and only explicit owner confirmation grants boops',()=>{const c=createSonicBoopConsent();assert.equal(boopDecision(c,{audioReady:true}).play,false);assert.throws(()=>grantSonicBoops(c));assert.equal(boopDecision(grantSonicBoops(c,{ownerConfirmed:true}),{audioReady:true}).play,true);});
