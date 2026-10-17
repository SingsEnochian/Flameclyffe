'use strict';
// Disposable loopback-only host for the actual witness restart regression.
// No model route, provider call, production credential, or remote listener.
const path = require('node:path');
const express = require('express');
const { createWayglassMcpRouter } = require('../wayglass/mcp-bridge');

const directory = process.env.WORKSPACE_TEST_DIRECTORY;
const port = Number(process.env.WORKSPACE_TEST_PORT || 0);
if (!directory || !Number.isInteger(port) || port < 0 || port > 65535) {
  throw new Error('A disposable workspace directory and valid loopback port are required.');
}

const app = express();
app.use(express.json());
app.use('/mcp', createWayglassMcpRouter({
  tokenLoader: () => 'rarity-fixture-credential',
  codexTokenLoader: () => 'codex-fixture-credential',
  workspaceDirectory: directory,
  storePath: path.join(directory, 'conversations.json'),
  flameIds: [],
  fetchImpl: async () => { throw new Error('Provider calls are prohibited in the fixture.'); },
}));
app.listen(port, '127.0.0.1', function () {
  process.stdout.write(JSON.stringify({ port: this.address().port }) + '\n');
});
