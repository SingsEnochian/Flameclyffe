'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

function read(path) { return readFileSync(path,'utf8'); }
const source = read('supabase/migrations/20261107070400_wayglass_noaa_private_observer_collector_v1.sql');
const schedule = read('supabase/migrations/20261107071500_wayglass_noaa_live_observer_schedule_v1.sql');

test('NOAA ingestion stays inside a private allowlist with no publicly callable collector',()=>{
  assert.match(source,/CREATE SCHEMA IF NOT EXISTS wayglass_observer_internal/);
  assert.match(source,/SECURITY INVOKER/);
  assert.match(source,/REVOKE ALL ON SCHEMA wayglass_observer_internal FROM PUBLIC, anon, authenticated/);
  assert.match(source,/REVOKE ALL ON FUNCTION wayglass_observer_internal\.collect_noaa_feed\(text\)/);
  assert.match(source,/v_source\.endpoint_url IS DISTINCT FROM v_url/);
  assert.match(source,/pg_try_advisory_xact_lock/);
  assert.match(source,/ON CONFLICT \(source_id,metric_key,measured_at,payload_hash\) DO NOTHING/);
  assert.match(source,/sha256\(convert_to/);
  assert.match(source,/raw_payload/);
  assert.match(source,/last_success_at=clock_timestamp/);
  assert.doesNotMatch(source,/SECURITY DEFINER|GRANT.*anon/i);
});

test('five NOAA collection schedules remain pinned and independently identifiable',()=>{
  assert.equal((schedule.match(/cron\.schedule\(/g)||[]).length,5);
  for(const label of ['summary-fast','goes-six-hour','planetary-kp','rtsw-minute-archives','goes-weekly-window'])
    assert.match(schedule,new RegExp('wayglass-noaa-'+label+'-v1'));
  assert.match(schedule,/wayglass_observer_internal\.collect_noaa_feed/);
  assert.doesNotMatch(schedule,/service_role|api.key|secret\s*=/i);
});
