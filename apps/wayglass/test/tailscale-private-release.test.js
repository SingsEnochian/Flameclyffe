import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const script=readFileSync(new URL('../../../scripts/Start-Wayglass-Tailnet.ps1',import.meta.url),'utf8');
test('Tailscale alternative is read-only unless publish and owner ACL review are explicit',()=>{
 assert.match(script,/\[switch\]\$Publish/);
 assert.match(script,/\[switch\]\$OwnerOnlyAclReviewed/);
 assert.match(script,/if \(-not \$Publish\)/);
 assert.match(script,/if \(-not \$OwnerOnlyAclReviewed\)/);
 assert.match(script,/Assert-NoExistingShare \$existing/);
});
test('full-ship Serve targets the loopback Hearthgate origin, not Funnel or a public static preview',()=>{
 assert.match(script,/http:\/\/127\.0\.0\.1:3000/);
 assert.match(script,/wayglass:deploy:server/);
 assert.match(script,/Assert-FullShip/);
 assert.match(script,/wayglass-tailnet-serve\.mjs/);
 assert.match(script,/Assert-AllowedTailnetOrigin/);
 assert.match(script,/House Steward sign-in is not ready/);
 assert.doesNotMatch(script,/& tailscale funnel/);
 assert.doesNotMatch(script,/0\.0\.0\.0/);
});
test('doctor requires valid connected tailnet DNS and avoids guessing a live URL',()=>{
 assert.match(script,/Read-TailscaleJson -Arguments @\('status','--json'\)/);
 assert.match(script,/BackendState -ne 'Running'/);
 assert.match(script,/ts\\\.net/);
 assert.match(script,/Proposed tailnet URL \(not yet verified live\)/);
});
