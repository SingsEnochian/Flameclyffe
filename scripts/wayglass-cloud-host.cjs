#!/usr/bin/env node
'use strict';
const path = require('node:path');
const { createWayglassCloudHost } = require('../lib/wayglass-cloud-host.cjs');

// Adapter is reviewed deployment code, never a URL or an MCP caller argument.
// Production credentials remain in that adapter's private host environment.
async function startWayglassCloudHost({ environment = process.env, loadAdapter = require } = {}) {
  const adapterFile = environment.WAYGLASS_CLOUD_ADAPTER;
  if (typeof adapterFile !== 'string' || !path.isAbsolute(adapterFile)) throw new Error('Absolute trusted cloud adapter required');
  const portText = environment.PORT || '7860';
  if (!/^\d+$/.test(portText) || Number(portText) < 1 || Number(portText) > 65535) throw new Error('Valid cloud port required');
  const host = environment.WAYGLASS_BIND_HOST || '127.0.0.1';
  if (!['127.0.0.1', '0.0.0.0', '::1', '::'].includes(host)) throw new Error('Explicit bind interface required');
  const adapter = loadAdapter(adapterFile);
  if (typeof adapter.createCloudAdapters !== 'function') throw new Error('Trusted cloud adapter factory required');
  const sourceSha = environment.WAYGLASS_SOURCE_SHA;
  if (!/^[a-f0-9]{40}$/.test(sourceSha || '')) throw new Error('Exact cloud source SHA required');
  const adapters = await adapter.createCloudAdapters({ sourceSha });
  const server = createWayglassCloudHost({ ...adapters, sourceSha });
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(Number(portText), host, () => { server.removeListener('error', reject); resolve(); });
    });
  } catch (error) { await adapters.close?.(); throw error; }
  async function close() {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await adapters.close?.();
  }
  return { server, close };
}
if (require.main === module) {
  startWayglassCloudHost().then(({ close }) => {
    let closing = false;
    for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => {
      if (closing) return; closing = true;
      close().catch(() => { process.exitCode = 1; });
    });
  }).catch(() => {
    // Errors may originate in credentialed adapters. Print no exception details.
    process.stderr.write('Wayglass cloud host startup failed; inspect private host diagnostics.\n');
    process.exitCode = 1;
  });
}
module.exports = { startWayglassCloudHost };
