import { listEightfoldCharacters, traverseEightfoldMobius } from '../eightfold-mobius.js';
import { invokeWayglassRoute } from '../route-client.js';

export async function mountPsychicUniverse(root) {
  const characters = listEightfoldCharacters('psychic-universe');
  root.replaceChildren();
  const section = document.createElement('section');
  section.className = 'wg-surface glass-panel';
  const title = document.createElement('h1'); title.textContent = 'Psychic Universe · Eightfold Möbius';
  const description = document.createElement('p'); description.textContent = 'Read paired identities, inspect eightfold crossings, and request a model response. Character ownership remains independent of the selected route.';
  const select = document.createElement('select');
  for (const character of characters) {
    const option = document.createElement('option');
    option.value = character.character_id;
    option.textContent = character.name + ' · ' + character.owner_id;
    select.append(option);
  }
  const input = document.createElement('textarea');
  input.rows = 4; input.placeholder = 'Message for the selected character';
  const route = document.createElement('input'); route.placeholder = 'Verified route ID (e.g. openai:gpt)';
  const consentLabel = document.createElement('label');
  const consent = document.createElement('input'); consent.type = 'checkbox';
  consentLabel.append(consent, document.createTextNode(' I authorize sending this prompt to the selected external provider'));
  const inspect = document.createElement('button'); inspect.textContent = 'Inspect eightfold';
  const send = document.createElement('button'); send.textContent = 'Request response';
  const status = document.createElement('pre'); status.setAttribute('aria-live','polite'); status.style.whiteSpace = 'pre-wrap';
  inspect.onclick = () => {
    const result = traverseEightfoldMobius({ character_id: select.value, world_id: 'psychic-universe', prompt: input.value, route_id: route.value });
    status.textContent = JSON.stringify(result, null, 2);
  };
  send.onclick = async () => {
    if (!input.value.trim() || !route.value.trim() || !consent.checked) {
      status.textContent = 'A message, verified route ID, and explicit provider consent are required.'; return;
    }
    send.disabled = true;
    status.textContent = 'Requesting authenticated host response…';
    try {
      const result = await invokeWayglassRoute({
        routeId: route.value.trim(), externalProviderConsent: true,
        worldId: 'psychic-universe', characterId: select.value,
        input: input.value, interaction: { channel: 'IC' },
        surfaceId: 'wayglass:psychic-universe',
      });
      status.textContent = JSON.stringify(result, null, 2);
    } catch (error) {
      status.textContent = 'Host declined or unavailable: ' + error.message;
    } finally { send.disabled = false; }
  };
  section.append(title, description, select, input, route, consentLabel, inspect, send, status);
  root.append(section);
  return { surface_id: 'wayglass:psychic-universe', destroy() { inspect.onclick = null; send.onclick = null; } };
}
