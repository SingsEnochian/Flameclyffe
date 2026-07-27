'use strict';

const fs = require('node:fs');
const path = require('node:path');

const appPackage = require('./package.json');
const electronPackage = require('electron/package.json');
const builderPackage = require('electron-builder/package.json');

const receipt = {
  schemaVersion: 1,
  product: appPackage.productName,
  appVersion: appPackage.version,
  electronVersion: electronPackage.version,
  electronBuilderVersion: builderPackage.version,
  buildNodeVersion: process.versions.node,
  sourceCommit: process.env.GITHUB_SHA || process.env.ARCSWEEP_SOURCE_COMMIT || null,
  workflowRunId: process.env.GITHUB_RUN_ID || null,
  generatedAt: new Date().toISOString(),
};

const outputDirectory = path.resolve(__dirname, '../../../dist/arcsweep-desktop');
const outputFile = path.join(outputDirectory, 'RUNTIME-RECEIPT.json');
fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(outputFile, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(receipt)}\n`);
