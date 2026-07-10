import 'dotenv/config';
import { REST, Routes } from 'discord.js';

import { HOUSE_COMMANDS } from './commands.js';
import { CARETAKER_PROFILES } from './profiles.js';

const guildId = process.env.DISCORD_GUILD_ID;
if (!guildId) throw new Error('DISCORD_GUILD_ID is missing');

for (const profile of CARETAKER_PROFILES) {
  const token = process.env[profile.tokenEnv];
  const applicationId = process.env[profile.applicationIdEnv];
  if (!token || !applicationId) {
    console.log(`[${profile.id}] skipped: Discord token or application id missing`);
    continue;
  }

  const rest = new REST({ version: '10' }).setToken(token);
  await rest.put(Routes.applicationGuildCommands(applicationId, guildId), { body: HOUSE_COMMANDS });
  console.log(`[${profile.id}] registered ${HOUSE_COMMANDS.length} guild commands`);
}
