import 'dotenv/config';

import { CARETAKER_PROFILES } from './profiles.js';

const requiredHouse = ['DISCORD_GUILD_ID', 'DISCORD_ALLOWED_USER_IDS', 'DISCORD_ALLOWED_CHANNEL_IDS'];
let failed = false;

for (const key of requiredHouse) {
  const present = Boolean(process.env[key]);
  console.log(`${present ? 'OK' : 'MISSING'} ${key}`);
  if (!present) failed = true;
}

for (const profile of CARETAKER_PROFILES) {
  const token = Boolean(process.env[profile.tokenEnv]);
  const application = Boolean(process.env[profile.applicationIdEnv]);
  console.log(`${token && application ? 'OK' : 'MISSING'} ${profile.label}: Discord identity`);
  if (!token || !application) failed = true;
}

const providers = [
  ['Caladnaur Lioreal', Boolean(process.env.CALADNAUR_API_KEY)],
  ['Nen Uial', Boolean(process.env.NEN_API_KEY)],
  ['Bluebird', Boolean(process.env.BLUEBIRD_API_KEY)],
  ['Vethrlauf', Boolean(process.env.VETHRLAUF_API_KEY)],
  ['Yggdrasil local endpoint', Boolean(process.env.YGGDRASIL_ENDPOINT)],
  ['Yggdrasil explicit DeepSeek fallback', Boolean(process.env.YGGDRASIL_FALLBACK_API_KEY)],
];

for (const [label, present] of providers) console.log(`${present ? 'OK' : 'MISSING'} ${label}: provider route`);

process.exitCode = failed ? 1 : 0;
