export function parseCsv(value = '') {
  return new Set(
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

export function createAccessPolicy(env = process.env) {
  const allowedUsers = parseCsv(env.DISCORD_ALLOWED_USER_IDS);
  const allowedChannels = parseCsv(env.DISCORD_ALLOWED_CHANNEL_IDS);
  const cooldownMs = Number(env.CARETAKER_COOLDOWN_SECONDS || 60) * 1000;

  return {
    allowedUsers,
    allowedChannels,
    cooldownMs,
    check(interaction) {
      if (!interaction?.inGuild?.()) return { ok: false, reason: 'House Caretakers do not answer in DMs.' };
      if (!allowedUsers.size || !allowedUsers.has(interaction.user?.id)) {
        return { ok: false, reason: 'This Caretaker route is not open to this caller.' };
      }
      if (!allowedChannels.size || !allowedChannels.has(interaction.channelId)) {
        return { ok: false, reason: 'This room is not on the Caretaker channel allowlist.' };
      }
      return { ok: true };
    },
  };
}

export function createCooldownLedger(cooldownMs) {
  const entries = new Map();

  return {
    remaining(key, now = Date.now()) {
      const until = entries.get(key) || 0;
      return Math.max(0, until - now);
    },
    mark(key, now = Date.now()) {
      entries.set(key, now + cooldownMs);
    },
  };
}
