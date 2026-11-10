'use strict';

// Source-contract regression checks for the Supabase edge gateway.
// These do not replace real OAuth, RLS, provider, or deployed endpoint tests.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../../supabase/functions/wayglass-chat-mcp/index.ts'), 'utf8'
);

test('gateway requires Supabase user identity and owner approval before tool dispatch', () => {
  const user = source.indexOf('db.auth.getUser(bearer)');
  const owner = source.indexOf('if(!allowed)return json(');
  const handler = source.indexOf('const handler=createMcpHandler(');
  assert.ok(user > 0 && owner > user && handler > owner,
    'Owner-authenticated user checks must precede MCP tool registration');
});

test('chat history loads newest page in chronological display order', () => {
  assert.match(source, /async function savedTurns\(conversation_ref:string,limit=150,before_id\?:number\)/);
  assert.match(source, /\.order\("id",\{ascending:false\}\)\.limit\(safeLimit\+1\)/);
  assert.match(source, /query=query\.lt\("id",before_id\)/);
  assert.match(source, /const turns=newest\.slice\(0,safeLimit\)\.reverse\(\)/);
  assert.match(source, /next_before_id:has_more&&turns\.length\?turns\[0\]\.id:null/);
  assert.match(source, /const previous=\(await savedTurns\(conversation_ref,12\)\)\.turns/);
  assert.match(source, /\.\.\.await savedTurns\(ref,limit,before_id\)/);
});

test('external route preserves other realities and mandatory verification inheritance', () => {
  assert.match(source, /THEY ARE OTHER REALITIES/);
  assert.match(source, /Verification inheritance: establish acceptance criteria/);
  assert.match(source, /Carry these same verification and attribution constraints/);
  assert.doesNotMatch(source, /fictional participants|imaginary worlds/);
  assert.match(source, /NOT the native Ship Voice/);
});

test('oversized model replies are not silently truncated or reported persisted', () => {
  const guard = source.indexOf('if(text.length>12000)return result(');
  const persistedWrite = source.indexOf('const written=await append({conversation_ref,role:"assistant"');
  assert.ok(guard > 0 && persistedWrite > guard,
    'Check the full reply against the database character constraint before saving');
  assert.match(source, /status:"reply-not-saved",conversation_ref/);
  assert.match(source, /wayglass_persisted:false/);
  assert.match(source, /model_reply_saved:false/);
  assert.match(source, /role:"assistant",content:text,route_id/);
  assert.doesNotMatch(source, /content:text\.slice\(0,12000\)/);
});
