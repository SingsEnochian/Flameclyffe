import 'dotenv/config';

import { CARETAKER_PROFILES } from './profiles.js';
import { createCaretakerRuntime } from './runtime.js';

if (process.env.HOUSE_CARETAKERS_DISABLED === 'true') {
  console.log('House Caretakers are disabled by HOUSE_CARETAKERS_DISABLED=true');
  process.exit(0);
}

const enabled = CARETAKER_PROFILES.filter((profile) => process.env[profile.tokenEnv]);
if (!enabled.length) throw new Error('No Discord Caretaker tokens are configured. Run npm run caretakers:doctor.');

const runtimes = enabled.map((profile) => createCaretakerRuntime(profile));
const results = await Promise.allSettled(runtimes.map((runtime) => runtime.start()));

results.forEach((result, index) => {
  if (result.status === 'rejected') {
    console.error(`[${enabled[index].id}] failed to start: ${result.reason?.message || result.reason}`);
  }
});

if (results.every((result) => result.status === 'rejected')) process.exitCode = 1;
