import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const PAGE = new URL('../world-tone-approval/index.html', import.meta.url);

test('Rowan approval gate is pinned outside the buried decision panel', async () => {
  const html = await readFile(PAGE, 'utf8');
  const dockIndex = html.indexOf('id="approval-dock"');
  const decisionIndex = html.indexOf('<h2>4 · Rowan decides</h2>');
  const approveCount = (html.match(/id="approve"/g) || []).length;

  assert.ok(dockIndex >= 0, 'approval dock must exist');
  assert.ok(decisionIndex >= 0, 'decision panel must exist');
  assert.ok(dockIndex < decisionIndex, 'approval dock must appear before the decision panel');
  assert.equal(approveCount, 1, 'approval action must have one authoritative button');
  assert.match(html, /position:\s*fixed;/);
  assert.match(html, /ROWAN APPROVAL GATE/);
  assert.match(html, /approval-gate-status/);
});

test('approval dock states exactly why approval is locked or ready', async () => {
  const html = await readFile(PAGE, 'utf8');

  assert.match(html, /Approval locked/);
  assert.match(html, /LOCKED · Complete the somatic audition\./);
  assert.match(html, /READY · Confirm felt identity and comfort, then approve\./);
  assert.match(html, /Approve somatic tone/);
});
