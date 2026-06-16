import { createCircle, createPath, createSvgElement, createText } from '../shared/dom-svg.js';
import { alternatingBend, curvedPathBetween } from '../shared/svg-paths.js';
import {
  CONSENT_BRANCHES,
  CONSENT_WEB_CONFIG,
  CONSENT_WEB_CORE,
} from './consent-web.model.js';

const permissions = CONSENT_BRANCHES.map((branch) => ({ ...branch }));
const branchLayer = document.querySelector('#branch-layer');
const nodeLayer = document.querySelector('#node-layer');
const controlList = document.querySelector('#control-list');
const statusLine = document.querySelector('#status-line');
const pulseEnabledButton = document.querySelector('#pulse-enabled');
const allOffButton = document.querySelector('#all-off');

function renderBranches() {
  branchLayer.replaceChildren();

  permissions.forEach((permission, index) => {
    const group = createSvgElement('g');
    group.classList.add('branch');
    group.dataset.permission = permission.id;
    group.dataset.state = permission.state;
    group.dataset.activity = String(Boolean(permission.activity));

    const path = curvedPathBetween(CONSENT_WEB_CORE, permission, {
      bend: alternatingBend(index, CONSENT_WEB_CONFIG.bend),
    });

    group.append(
      createPath(path, 'branch-lock'),
      createPath(path, 'branch-path'),
      createPath(path, 'branch-pulse')
    );

    branchLayer.append(group);
  });
}

function renderNodes() {
  nodeLayer.replaceChildren();

  const coreGroup = createSvgElement('g', {
    transform: `translate(${CONSENT_WEB_CORE.x} ${CONSENT_WEB_CORE.y})`,
  });
  coreGroup.classList.add('node', 'core');
  coreGroup.append(
    createCircle(CONSENT_WEB_CONFIG.coreRadius),
    createText(CONSENT_WEB_CORE.label, CONSENT_WEB_CONFIG.coreLabelOffsetY)
  );
  nodeLayer.append(coreGroup);

  permissions.forEach((permission) => {
    const group = createSvgElement('g', {
      transform: `translate(${permission.x} ${permission.y})`,
    });
    group.classList.add('node');
    group.dataset.permission = permission.id;
    group.dataset.state = permission.state;
    group.dataset.activity = String(Boolean(permission.activity));

    group.append(
      createCircle(CONSENT_WEB_CONFIG.nodeRadius),
      createText(permission.label, CONSENT_WEB_CONFIG.labelOffsetY)
    );
    nodeLayer.append(group);
  });
}

function renderControls() {
  controlList.replaceChildren();

  permissions.forEach((permission) => {
    const button = document.createElement('button');
    button.className = 'consent-toggle';
    button.type = 'button';
    button.dataset.permission = permission.id;
    button.dataset.state = permission.state;
    button.setAttribute('aria-pressed', String(permission.state === 'on'));
    button.disabled = permission.state === 'blocked';
    button.innerHTML = `<span>${permission.label}<br><small>${permission.description}</small></span><span class="toggle-state">${permission.state}</span>`;
    button.addEventListener('click', () => togglePermission(permission.id));
    controlList.append(button);
  });
}

function togglePermission(id) {
  const permission = permissions.find((item) => item.id === id);
  if (!permission || permission.state === 'blocked') return;
  permission.state = permission.state === 'on' ? 'off' : 'on';
  permission.activity = false;
  renderAll();
}

function pulseEnabled() {
  permissions.forEach((permission) => {
    permission.activity = permission.state === 'on';
  });
  renderAll();
  window.setTimeout(() => {
    permissions.forEach((permission) => {
      permission.activity = false;
    });
    renderAll();
  }, CONSENT_WEB_CONFIG.activityMs);
}

function setAllOff() {
  permissions.forEach((permission) => {
    if (permission.state !== 'blocked') permission.state = 'off';
    permission.activity = false;
  });
  renderAll();
}

function updateStatus() {
  const active = permissions.filter((permission) => permission.state === 'on');
  const blocked = permissions.filter((permission) => permission.state === 'blocked');

  if (active.length === 0) {
    statusLine.textContent = `No sensory systems are active. ${blocked.length} branches are blocked or unavailable.`;
    return;
  }

  statusLine.textContent = `Enabled: ${active.map((permission) => permission.label).join(', ')}. Blocked: ${blocked.length}.`;
}

function renderAll() {
  renderBranches();
  renderNodes();
  renderControls();
  updateStatus();
}

pulseEnabledButton.addEventListener('click', pulseEnabled);
allOffButton.addEventListener('click', setAllOff);

renderAll();
