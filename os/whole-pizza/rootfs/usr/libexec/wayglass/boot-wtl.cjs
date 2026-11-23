'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
async function boot({ root, receiptDir, source }) {
  if (!root || !receiptDir || !source) throw new Error('Missing Wyrdrune boot inputs');
  const runtimePath = path.join(root, 'lib/wyrdrune/wyrdrune.cjs');
  const required = [runtimePath, path.join(root,'apps/starwell-server/server-secure.js'),
    path.join(root,'apps/starwell-server/public/wayglass/index.html')];
  if (!required.every(p => fs.existsSync(p))) throw new Error('Incomplete installed Wayglass release');
  const runtime = require(runtimePath);
  const ir = runtime.compile(source);
  const result = await runtime.execute(ir, {
    principal: { id: 'wayglass-os-boot-service', authorized: true },
    bridges: { host: {
      ready: async () => true,
      boot_event: async ({ arguments: [v] }) => ({ kind: 'wayglass.os-start/v1', verified: v === true }),
      checkpoint: async ({ arguments: [v] }) => ({ kind: 'wayglass.os-checkpoint/v1', verified: v === true })
    }}
  });
  if (result.status !== 'committed') throw new Error('Wyrdrune refused boot: ' + result.status);
  const receipt = {
    schema: 'wayglass.os-firstboot/v1', invocation_id: randomUUID(),
    actor: 'wayglass-os-boot-service', status: result.status,
    source_sha: fs.readFileSync(path.join(root,'.wayglass-source-sha'),'utf8').trim(),
    wtl_sha256: createHash('sha256').update(source).digest('hex'),
    cycles: result.withness?.completedCycles ?? null,
    output_kinds: result.output?.map(x => x.kind) ?? [],
    timestamp: new Date().toISOString(),
    observation_kind: 'local-runtime',
    scope: 'WTL bootstrap only; not full ship or hardware acceptance'
  };
  fs.mkdirSync(receiptDir,{recursive:true});
  const temp = path.join(receiptDir, '.boot-' + receipt.invocation_id + '.json');
  fs.writeFileSync(temp, JSON.stringify(receipt,null,2)+'\n',{mode:0o600, flag:'wx'});
  fs.renameSync(temp,path.join(receiptDir,'boot-latest.json'));
  return receipt;
}
if (require.main === module) {
  const source = fs.readFileSync(path.join(__dirname,'boot.wtl'),'utf8');
  boot({root:process.env.WAYGLASS_SOURCE_ROOT,receiptDir:process.env.WAYGLASS_RECEIPTS_DIR,source})
    .then(r => console.log('[Wayglass] WTL boot receipt:',r.wtl_sha256))
    .catch(e => {console.error('[Wayglass] Boot halted:',e.message);process.exitCode=1});
}
module.exports = {boot};
