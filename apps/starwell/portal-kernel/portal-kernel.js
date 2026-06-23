import { portalWorldNodes, findPortalNode } from '../src/worlds/portalRegistry.js';
import { createMockFlameAdapter } from '../src/bridges/mockFlameAdapter.js';
import { resolveInputWeather } from '../src/interaction/starwellInputWeather.js';
import { createYggdrasilLocalAccountAdapter } from '../src/accounts/yggdrasilLocalAccountAdapter.js';
import { createYggRoomBuilderProposal, yggInterfaces, yggRoomTemplates } from '../src/interfaces/yggInterfaceRegistry.js';
import { isYggRoomProposalReviewable } from '../src/interfaces/yggInterfaceSchema.js';
import { portalSoundPatches } from '../src/sound/portalSoundRegistry.js';
import { createWeatherSoundProposal } from '../src/sound/weatherSoundConductor.js';

const output = document.querySelector('[data-output]');
const branches = document.querySelector('[data-branches]');
const nodes = document.querySelector('[data-nodes]');
const sceneTextInput = document.querySelector('[data-scene-text]');
const growButton = document.querySelector('[data-grow]');
const inviteButton = document.querySelector('[data-invite]');
const accountButton = document.querySelector('[data-account]');
const roomButton = document.querySelector('[data-room]');
const resetButton = document.querySelector('[data-reset]');

const positions = new Map([
  ['templehouse', [88, 378]],
  ['lighted-steps', [192, 300]],
  ['templehouse-shrine', [296, 228]],
  ['ygg-gate', [358, 178]],
  ['dreaming-grove', [455, 140]],
  ['terra-aeterna', [572, 100]],
  ['luna-eira', [648, 192]],
  ['grove-playfield', [568, 288]],
]);

const displayLabels = new Map([
  ['templehouse', 'Templehouse'],
  ['lighted-steps', 'Lighted Steps'],
  ['templehouse-shrine', 'Shrine'],
  ['ygg-gate', 'Ygg Gate'],
  ['dreaming-grove', 'Dreaming Grove'],
  ['terra-aeterna', 'Terra Aeterna'],
  ['luna-eira', 'Luna'],
  ['grove-playfield', 'Playfield'],
]);

const labelOffsets = new Map([
  ['templehouse', [0, -22]],
  ['lighted-steps', [0, -22]],
  ['templehouse-shrine', [0, -22]],
  ['ygg-gate', [0, -22]],
  ['dreaming-grove', [0, 34]],
  ['terra-aeterna', [-16, -22]],
  ['luna-eira', [-32, -22]],
  ['grove-playfield', [0, 34]],
]);

const nodePatchHints = new Map([
  ['templehouse', 'north_star_still'],
  ['lighted-steps', 'safe_gateway_369'],
  ['templehouse-shrine', 'runa_gateway_432'],
  ['ygg-gate', 'yggdrasil_root_breath'],
  ['dreaming-grove', 'dreaming_grove_purrfield'],
  ['terra-aeterna', 'safe_gateway_369'],
  ['luna-eira', 'north_star_still'],
  ['grove-playfield', 'dreaming_grove_purrfield'],
]);

const roomTemplateHints = new Map([
  ['templehouse', 'hearth-nook'],
  ['lighted-steps', 'hearth-nook'],
  ['templehouse-shrine', 'tone-lab'],
  ['ygg-gate', 'tone-lab'],
  ['dreaming-grove', 'starlit-atelier'],
  ['terra-aeterna', 'moon-bridge'],
  ['luna-eira', 'moon-bridge'],
  ['grove-playfield', 'starlit-atelier'],
]);

let grown = false;
let invited = false;
let currentNodeId = 'templehouse';
let lastMockExchange = null;
let lastRoomProposal = null;
let accountAdapter = createYggdrasilLocalAccountAdapter();

function getLabNodes() {
  const baseNodes = grown ? [...portalWorldNodes] : portalWorldNodes.filter((node) => node.id === 'templehouse');
  if (lastRoomProposal?.node && !baseNodes.some((node) => node.id === lastRoomProposal.node.id)) {
    baseNodes.push(lastRoomProposal.node);
  }
  return baseNodes;
}

function getLabPositions() {
  const activePositions = new Map(positions);
  if (lastRoomProposal?.node) {
    const parentPosition = activePositions.get(lastRoomProposal.node.parentId) ?? activePositions.get('dreaming-grove') ?? [430, 150];
    activePositions.set(lastRoomProposal.node.id, [Math.min(parentPosition[0] + 78, 630), Math.min(parentPosition[1] + 88, 350)]);
  }
  return activePositions;
}

function render() {
  const activeNodes = getLabNodes();
  const activePositions = getLabPositions();
  branches.innerHTML = '';
  nodes.innerHTML = '';

  activeNodes.forEach((node) => {
    if (node.parentId && activePositions.has(node.parentId) && activePositions.has(node.id)) {
      const [x1, y1] = activePositions.get(node.parentId);
      const [x2, y2] = activePositions.get(node.id);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${x1} ${y1} C ${x1 + 30} ${y1 - 60}, ${x2 - 40} ${y2 + 60}, ${x2} ${y2}`);
      path.setAttribute('class', node.id === lastRoomProposal?.node?.id ? 'branch branch-proposal' : 'branch');
      branches.append(path);
    }
  });

  activeNodes.forEach((node) => {
    const position = activePositions.get(node.id);
    if (!position) return;
    const [x, y] = position;
    const isProposal = node.id === lastRoomProposal?.node?.id;
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', `node ${node.id === currentNodeId ? 'is-current' : ''} ${isProposal ? 'is-proposal' : ''}`);
    group.setAttribute('tabindex', '0');
    group.setAttribute('role', 'button');
    group.setAttribute('aria-label', node.title);
    group.addEventListener('click', () => focusNode(node.id));
    group.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        focusNode(node.id);
      }
    });

    const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    halo.setAttribute('cx', x);
    halo.setAttribute('cy', y);
    halo.setAttribute('r', node.id === currentNodeId ? 24 : 16);
    halo.setAttribute('class', isProposal ? 'halo halo-proposal' : 'halo');

    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', x);
    dot.setAttribute('cy', y);
    dot.setAttribute('r', invited && node.id === 'dreaming-grove' ? 10 : isProposal ? 9 : 7);
    dot.setAttribute('class', invited && node.id === 'dreaming-grove' ? 'dot invited' : isProposal ? 'dot proposed' : 'dot');

    const [lx, ly] = isProposal ? [0, 34] : (labelOffsets.get(node.id) ?? [0, -22]);
    const labelText = isProposal
      ? (node.title ?? node.id).replace(/^[^']*'s\s*/u, '').slice(0, 20)
      : (displayLabels.get(node.id) ?? node.title ?? node.id);
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', x + lx);
    label.setAttribute('y', y + ly);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('class', isProposal ? 'label proposal-label' : 'label');
    label.textContent = labelText;

    group.append(halo, dot, label);
    nodes.append(group);
  });

  renderOutput();
}

function focusNode(id) {
  currentNodeId = id;
  render();
}

function getCurrentNode() {
  return findPortalNode(currentNodeId) ?? (lastRoomProposal?.node?.id === currentNodeId ? lastRoomProposal.node : null);
}

function renderOutput(extra = {}) {
  const node = getCurrentNode();
  const account = accountAdapter.getAccount();
  const accessibility = account?.customization?.accessibility ?? {};
  const weather = resolveInputWeather({ typing: { cadence: grown ? 0.42 : 0.08, revision: 0.1 }, pointer: { drift: invited ? 0.64 : 0.12 } }, accessibility);
  const weatherSoundProposal = createWeatherSoundProposal({
    text: sceneTextInput?.value ?? '',
    node,
    inputWeather: weather,
    accessibility,
  });

  output.textContent = JSON.stringify({
    node,
    invitedMockFlame: invited,
    yggdrasilAccount: account,
    yggInterfaces,
    roomBuilder: {
      availableTemplateIds: yggRoomTemplates.map((template) => template.id),
      lastProposal: lastRoomProposal,
      reviewable: isYggRoomProposalReviewable(lastRoomProposal),
    },
    weather,
    soundContract: {
      availablePatchIds: portalSoundPatches.map((patch) => patch.id),
      currentProposal: weatherSoundProposal,
    },
    mockExchange: lastMockExchange,
    ...extra,
  }, null, 2);
}

growButton?.addEventListener('click', () => {
  grown = true;
  currentNodeId = 'dreaming-grove';
  render();
});

inviteButton?.addEventListener('click', () => {
  const adapter = createMockFlameAdapter({ displayName: 'Mock Grove Flame', roomsAllowed: ['dreaming-grove'] });
  adapter.connect();
  invited = true;
  currentNodeId = 'dreaming-grove';
  lastMockExchange = { mockPassport: adapter.passport, mockReply: adapter.send('May I enter the Grove?') };
  render();
});

accountButton?.addEventListener('click', () => {
  accountAdapter.createPreviewAccount({
    displayName: 'Starroot Guest',
    handle: 'starroot-guest',
    customization: {
      palette: 'sea-blues',
      branchStyle: 'silver-leaf',
      rootAccent: 'moon-gold',
      accessibility: { sensoryQuiet: true, captions: true },
      sound: { defaultPatch: nodePatchHints.get(currentNodeId) ?? 'north_star_still', allowFuturePlayback: false },
    },
  });
  render({ accountPreviewCreated: true });
});

roomButton?.addEventListener('click', () => {
  grown = true;
  const account = accountAdapter.getAccount();
  const templateId = roomTemplateHints.get(currentNodeId) ?? 'hearth-nook';
  const parentNodeId = findPortalNode(currentNodeId) ? currentNodeId : lastRoomProposal?.node?.parentId ?? 'dreaming-grove';
  lastRoomProposal = createYggRoomBuilderProposal({
    templateId,
    account,
    parentNodeId,
    customization: account?.customization,
  });
  currentNodeId = lastRoomProposal.node.id;
  render({ roomSeedCreated: true });
});

sceneTextInput?.addEventListener('input', () => {
  renderOutput({ sceneTextChanged: true });
});

resetButton?.addEventListener('click', () => {
  grown = false;
  invited = false;
  lastMockExchange = null;
  lastRoomProposal = null;
  accountAdapter = createYggdrasilLocalAccountAdapter();
  currentNodeId = 'templehouse';
  render();
});

render();
