import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const REQUIRED_MAJOR = 24;
const REQUIRED_ENGINE = '>=24 <25';
const WORKFLOW_DIR = path.join(ROOT, '.github', 'workflows');
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(absolute);
    return [absolute];
  });
}

const currentMajor = Number.parseInt(process.versions.node.split('.')[0], 10);
if (currentMajor !== REQUIRED_MAJOR) {
  fail(`Policy check must run on Node ${REQUIRED_MAJOR}; received ${process.versions.node}.`);
}

const nvmrc = read('.nvmrc').trim();
if (nvmrc !== String(REQUIRED_MAJOR)) {
  fail(`.nvmrc must contain exactly ${REQUIRED_MAJOR}; received ${JSON.stringify(nvmrc)}.`);
}

const packageJson = JSON.parse(read('package.json'));
if (packageJson.engines?.node !== REQUIRED_ENGINE) {
  fail(`package.json engines.node must be ${JSON.stringify(REQUIRED_ENGINE)}.`);
}
if (packageJson.scripts?.['node24:check'] !== 'node scripts/verify-node24-policy.mjs') {
  fail('package.json must expose the node24:check policy command.');
}

const npmrcPath = path.join(ROOT, '.npmrc');
if (!fs.existsSync(npmrcPath) || !fs.readFileSync(npmrcPath, 'utf8').split(/\r?\n/).includes('engine-strict=true')) {
  fail('.npmrc must enforce engine-strict=true.');
}

const workflowFiles = walk(WORKFLOW_DIR).filter((file) => /\.ya?ml$/i.test(file));
for (const file of workflowFiles) {
  const relative = path.relative(ROOT, file).replaceAll(path.sep, '/');
  const source = fs.readFileSync(file, 'utf8');
  const lines = source.split(/\r?\n/);
  const setupIndexes = [];

  lines.forEach((line, index) => {
    if (line.includes('uses: actions/setup-node@')) setupIndexes.push(index);
  });

  const invokesNode = /(^|\s)(node|npm|npx)\s/m.test(source);
  if (invokesNode && setupIndexes.length === 0) {
    fail(`${relative} executes Node tooling without actions/setup-node.`);
  }

  for (const index of setupIndexes) {
    const block = lines.slice(index, index + 12).join('\n');
    if (!/node-version-file:\s*["']?\.nvmrc["']?/.test(block)) {
      fail(`${relative}:${index + 1} must use node-version-file: .nvmrc.`);
    }
    if (/node-version:\s*/.test(block)) {
      fail(`${relative}:${index + 1} hard-codes node-version instead of using .nvmrc.`);
    }
  }
}

if (failures.length > 0) {
  console.error('Node 24 policy failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Node 24 policy passed for ${workflowFiles.length} workflow files.`);
