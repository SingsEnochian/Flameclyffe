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

test('Windows discovers installed Tailscale without requiring CLI on PATH',()=>{
 assert.match(script,/Join-Path \$env:ProgramFiles 'Tailscale\\\\tailscale\.exe'/);
 assert.match(script,/WAYGLASS_TAILSCALE_CLI/);
 assert.match(script,/\& \$script:TailscaleExe serve status --json/);
});
test('foreground Serve keeps the owner-private route and prints only an intended Nursery URL',()=>{
 const serve=readFileSync(new URL('../../../scripts/wayglass-tailnet-serve.mjs',import.meta.url),'utf8');
 assert.match(serve,/process\.env\.WAYGLASS_TAILSCALE_CLI\|\|'tailscale'/);
 assert.match(serve,/room=wayglass%3Acell-garden/);
 assert.match(serve,/Intended Nursery URL/);
 assert.doesNotMatch(serve,/spawn\([^\n]*\['funnel'/);
});
