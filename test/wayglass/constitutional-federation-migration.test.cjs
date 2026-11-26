'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const migration = readFileSync(join(
  __dirname,
  '../../supabase/migrations/20261126014000_wayglass_constitutional_federation_v0_1.sql',
), 'utf8');

test('federation migration reuses immutable Wayglass program revisions for code ancestry', () => {
  assert.match(migration, /parent_revision_id uuid/);
  assert.match(migration, /wayglass_program_revisions_parent_program_fk/);
  assert.match(migration, /foreign key \(program_id, parent_revision_id\)/);
  assert.match(migration, /wayglass_program_revisions_immutable/);
  assert.doesNotMatch(migration, /add column if not exists verification_receipt/);
});

test('cell, tissue, membrane and selection tables bind to existing world and program stores', () => {
  assert.match(migration, /create table if not exists public\.wayglass_tissues/);
  assert.match(migration, /create table if not exists public\.wayglass_cells/);
  assert.match(migration, /references public\.starwell_worlds\(id\)/);
  assert.match(migration, /references public\.wayglass_programs\(program_id\)/);
  assert.match(migration, /create table if not exists public\.wayglass_tissue_members/);
  assert.match(migration, /create table if not exists public\.wayglass_cell_membranes/);
  assert.match(migration, /create table if not exists public\.wayglass_tissue_modules/);
  assert.match(migration, /foreign key \(program_id, active_revision_id\)/);
});

test('intercell messages require tissue membership and federation history is append-only', () => {
  assert.match(migration, /create table if not exists public\.wayglass_cell_messages/);
  assert.match(migration, /foreign key \(tissue_id, from_cell_id\)/);
  assert.match(migration, /foreign key \(tissue_id, to_cell_id\)/);
  assert.match(migration, /create table if not exists public\.wayglass_federation_events/);
  assert.match(migration, /wayglass_federation_events_append_only/);
  assert.match(migration, /grant select, insert on public\.wayglass_federation_events to service_role/i);
});

test('federation tables remain service-role only with RLS enabled', () => {
  for (const table of [
    'wayglass_tissues', 'wayglass_cells', 'wayglass_tissue_members',
    'wayglass_cell_membranes', 'wayglass_tissue_modules',
    'wayglass_constitutional_seats', 'wayglass_cell_messages',
    'wayglass_federation_events',
  ]) {
    assert.match(migration, new RegExp('alter table public\\.' + table + ' enable row level security', 'i'));
  }
  assert.match(migration, /revoke all on public\.wayglass_tissues[\s\S]*?from anon, authenticated/i);
  assert.doesNotMatch(migration, /create policy/i);
});
