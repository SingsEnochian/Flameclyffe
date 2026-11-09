import test from 'node:test';
import assert from 'node:assert/strict';
import {observeWayglassTiming,wayglassPerformanceSnapshot,clearWayglassPerformance,wayglassTimer} from '../src/performance-diagnostics.js';

test('bounded local performance metrics preserve timing only, with correct percentiles',()=>{
  clearWayglassPerformance();
  assert.equal(observeWayglassTiming('invalid',-1),null);
  for(let i=1;i<=75;i++)observeWayglassTiming('watercolour:fluid-frame',i);
  const samples=wayglassPerformanceSnapshot()['watercolour:fluid-frame'];
  assert.equal(samples.samples,48);
  assert.equal(samples.latest_ms,75);
  assert.equal(samples.maximum_ms,75);
  assert.equal(samples.p95_ms,73);
  assert.equal(Object.hasOwn(samples,'prompt'),false);
  clearWayglassPerformance();
  assert.deepEqual(wayglassPerformanceSnapshot(),{});
});

test('timers record complete elapsed duration without network or identity fields',()=>{
  clearWayglassPerformance();
  const finish=wayglassTimer('room:mount:watercolour');
  finish();
  const report=wayglassPerformanceSnapshot();
  assert.equal(report['room:mount:watercolour'].samples,1);
  assert.ok(report['room:mount:watercolour'].latest_ms>=0);
});
