const DISCORD_LIMIT = 2000;

export function splitDiscordMessage(text, limit = 1800) {
  const chunks = [];
  let rest = String(text || '').trim();

  while (rest.length > limit) {
    let splitAt = rest.lastIndexOf('\n', limit);
    if (splitAt < limit * 0.55) splitAt = rest.lastIndexOf(' ', limit);
    if (splitAt < limit * 0.55) splitAt = limit;
    chunks.push(rest.slice(0, splitAt).trim());
    rest = rest.slice(splitAt).trim();
  }
  if (rest) chunks.push(rest);
  return chunks.length ? chunks : ['(empty response)'];
}

export function formatCaretakerResponse(profile, response, invokedBy) {
  const receipt = `**${profile.label} · ${profile.office}**\n_${response.truth_label} · ${response.engine} · invoked by ${invokedBy}_\n\n`;
  const chunks = splitDiscordMessage(response.message, DISCORD_LIMIT - receipt.length - 20);
  return chunks.map((chunk, index) => `${index === 0 ? receipt : ''}${chunk}`);
}
