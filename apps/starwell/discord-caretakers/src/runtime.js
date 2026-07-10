import { Client, Events, GatewayIntentBits } from 'discord.js';

import { createCaretakerBridge, describeProvider } from './adapters.js';
import { createAccessPolicy, createCooldownLedger } from './policy.js';
import { formatCaretakerResponse } from './output.js';

async function replyPrivate(interaction, content) {
  if (interaction.deferred || interaction.replied) return interaction.followUp({ content, ephemeral: true });
  return interaction.reply({ content, ephemeral: true });
}

function reportPrompt(profile, focus) {
  return [
    `Prepare a Hearthweave Caretaker report from your office as ${profile.office}.`,
    `Your remit is: ${profile.remit}.`,
    focus ? `Requested focus: ${focus}` : 'Requested focus: your current office remit.',
    'Use only information actually present in this request and your configured system packet.',
    'If no live source packet was supplied, say so plainly and provide only a proposed check-list, not invented findings.',
    'Separate Confirmed, Unavailable, Recommended next actions, and Canon candidates when relevant.',
  ].join('\n');
}

export function createCaretakerRuntime(profile, env = process.env) {
  const policy = createAccessPolicy(env);
  const cooldown = createCooldownLedger(policy.cooldownMs);
  const state = { hushed: false };
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once(Events.ClientReady, (readyClient) => {
    console.log(`[${profile.id}] ready as ${readyClient.user.tag}`);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const access = policy.check(interaction);
    if (!access.ok) {
      await replyPrivate(interaction, access.reason);
      return;
    }

    if (interaction.commandName === 'status') {
      await replyPrivate(
        interaction,
        `**${profile.label} · ${profile.office}**\nState: ${state.hushed ? 'hushed' : 'awake'}\nProvider: ${describeProvider(profile, env)}\nListening: slash commands only\nDMs: closed`
      );
      return;
    }

    if (interaction.commandName === 'hush') {
      state.hushed = true;
      await replyPrivate(interaction, `${profile.label} is hushed. The route remains present but will not answer until /wake.`);
      return;
    }

    if (interaction.commandName === 'wake') {
      state.hushed = false;
      await replyPrivate(interaction, `${profile.label} is awake.`);
      return;
    }

    if (state.hushed) {
      await replyPrivate(interaction, `${profile.label} is currently hushed. Use /wake first.`);
      return;
    }

    const cooldownKey = `${profile.id}:${interaction.user.id}`;
    const remaining = cooldown.remaining(cooldownKey);
    if (remaining > 0) {
      await replyPrivate(interaction, `The route is cooling for ${Math.ceil(remaining / 1000)} more seconds.`);
      return;
    }
    cooldown.mark(cooldownKey);

    const isReport = interaction.commandName === 'report';
    const prompt = isReport
      ? reportPrompt(profile, interaction.options.getString('focus'))
      : interaction.options.getString('prompt', true);
    const contextLevel = isReport ? 'light' : interaction.options.getString('context') || 'light';
    const requestedRoute = isReport ? 'primary' : interaction.options.getString('route') || 'primary';

    await interaction.deferReply();

    try {
      const bridge = createCaretakerBridge(profile, requestedRoute, env);
      const response = await bridge.route({
        speaker: interaction.user.id,
        target: profile.id,
        room: interaction.channelId,
        message: prompt,
        context_level: contextLevel,
        metadata: {
          source: 'discord_slash_command',
          command: interaction.commandName,
          guild_id: interaction.guildId,
        },
      });

      const chunks = formatCaretakerResponse(profile, response, interaction.user.username);
      await interaction.editReply(chunks[0]);
      for (const chunk of chunks.slice(1)) await interaction.followUp(chunk);
    } catch (error) {
      console.error(`[${profile.id}] route failed:`, error?.message || error);
      await interaction.editReply(
        `**${profile.label} · route unavailable**\nThe invocation reached the threshold, but the provider route did not complete. No answer was invented.`
      );
    }
  });

  return {
    profile,
    client,
    state,
    async start() {
      const token = env[profile.tokenEnv];
      if (!token) throw new Error(`${profile.tokenEnv} is missing`);
      return client.login(token);
    },
  };
}
