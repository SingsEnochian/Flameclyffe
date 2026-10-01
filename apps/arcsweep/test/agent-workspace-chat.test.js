import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const html = read('apps/agent-workspace/index.html');
const chat = read('apps/agent-workspace/chat.js');
const css = read('apps/agent-workspace/chat.css');
const sw = read('apps/agent-workspace/sw.js');

test('House Workspace loads a dedicated mobile chat dock', () => {
  assert.match(html, /\.\/chat\.css/);
  assert.match(html, /\.\/chat\.js/);
  assert.match(chat, /Talk to our agents/);
  assert.match(chat, /Talk to House/);
  assert.match(css, /\.house-chat-drawer/);
  assert.match(css, /@media \(max-width: 820px\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
});

test('chat uses the House session broker and never persists the credential', () => {
  assert.match(chat, /['"]\/api\/v1\/house\/session['"]/);
  assert.match(chat, /body: JSON\.stringify\(\{ credential \}\)/);
  assert.match(chat, /credentials: 'same-origin'/);
  assert.match(chat, /input\.value = ''/);
  assert.doesNotMatch(chat, /localStorage\.setItem\([^\n]*credential/i);
});

test('chat invokes living Flame routes with bounded local context', () => {
  assert.match(chat, /\/api\/v1\/flames\/\$\{routePath\(agent\.route\)\}\/chat/);
  assert.match(chat, /session_id: sessionId/);
  assert.match(chat, /context: prior/);
  assert.match(chat, /CONTEXT_MESSAGES = 12/);
  assert.match(chat, /route: 'starsong\/larkshine'/);
  assert.match(chat, /route: 'starsong\/ellowind'/);
  assert.match(chat, /split\('\/'\)\.map\(\(segment\) => encodeURIComponent\(segment\)\)\.join\('\/'\)/);
});

test('chat keeps thread content device-local and separates it by agent', () => {
  assert.match(chat, /CHAT_STATE_KEY = 'hearthweave\.agent-chat\/v0\.1'/);
  assert.match(chat, /threads: \{\}/);
  assert.match(chat, /chatState\.threads\[agentId\]/);
  assert.match(chat, /MAX_THREAD_MESSAGES = 80/);
  assert.match(chat, /Thread history stays on this device\. House credentials do not\./);
});

test('offline shell includes chat and Crow Nest assets', () => {
  assert.match(sw, /house-workspace-os-v0\.2\.2/);
  assert.match(sw, /'\.\/chat\.css'/);
  assert.match(sw, /'\.\/chat\.js'/);
  assert.match(sw, /'\.\/crow-nest\.css'/);
  assert.match(sw, /'\.\/crow-nest-motion\.css'/);
  assert.match(sw, /'\.\/crow-nest-bootstrap\.js'/);
  assert.match(sw, /'\.\/crow-nest\.js'/);
  assert.match(sw, /'\.\/astra-bridge\.js'/);
});
