const permissions = [
  { id: 'visual', label: 'Visual Bloom', state: 'on', x: 500, y: 115, description: 'Glow, bloom, and visual emphasis only.' },
  { id: 'sound', label: 'Sound', state: 'off', x: 710, y: 145, description: 'Audible tones and ambience. Not started here.' },
  { id: 'subbass', label: 'Sub-bass', state: 'off', x: 870, y: 310, description: 'Low-frequency body signal. Not started here.' },
  { id: 'haptics', label: 'Haptics', state: 'blocked', x: 835, y: 535, description: 'Device vibration or external haptics.' },
  { id: 'camera', label: 'Camera', state: 'off', x: 610, y: 650, description: 'Vision input. Requires explicit separate consent.' },
  { id: 'gaze', label: 'Gaze', state: 'off', x: 390, y: 650, description: 'Eye or pointer attention signal.' },
  { id: 'location', label: 'Location', state: 'blocked', x: 165, y: 535, description: 'Geolocation signal. Blocked in this sketch.' },
  { id: 'logging', label: 'Export / Logging', state: 'on', x: 130, y: 310, description: 'Local notes, exports, or almanac logs.' },
  { id: 'depth', label: 'Depth / LiDAR', state: 'off', x: 290, y: 145, description: 'Spatial depth events for AR. Not started here.' }
];

const core = { x: 500, y: 390, label: 'DEEP' };
const branchLayer = document.querySelector('#branch-layer');
const nodeLayer = document.querySelector('#node-layer');
const controlList = document.querySelector('#control-list');
const statusLine = document.querySelector('#status-line');
const pulseEnabledButton = document.querySelector('#pulse-enabled');
const allOffButton = document.querySelector('#all-off');

function curvePath(target, index) {
  const midX = (core.x + target.x) / 2;
  const midY = (core.y + target.y) / 2;
  const dx = target.x - core.x;
  const dy = target.y - core.y;
  const length = Math.max(Math.hypot(dx, dy), 1);
  const normalX = -dy / length;
  const normalY = dx / length;
  const bend = index % 2 === 0 ? 70 : -70;
  return `M ${core.x} ${core.y} Q ${midX + normalX * bend} ${midY + normalY * bend} ${target.x} ${target.y}`;
}

function makePath(d, className) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  path.classList.add(className);
  return path;
}

function renderBranches() {
  branchLayer.replaceChildren();

  permissions.forEach((permission, index) => {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.classList.add('branch');
    group.dataset.permission = permission.id;
    group.dataset.state = permission.state;
    group.dataset.activity = String(Boolean(permission.activity));

    const path = curvePath(permission, index);
    group.append(
      makePath(path, 'branch-lock'),
      makePath(path, 'branch-path'),
      makePath(path, 'branch-pulse')
    );

    branchLayer.append(group);
  });
}

function renderNodes() {
  nodeLayer.replaceChildren();

  const coreGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  coreGroup.classList.add('node', 'core');
  coreGroup.setAttribute('transform', `translate(${core.x} ${core.y})`);
  coreGroup.append(makeCircle(48), makeText(core.label, 6));
  nodeLayer.append(coreGroup);

  permissions.forEach((permission) => {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.classList.add('node');
    group.dataset.permission = permission.id;
    group.dataset.state = permission.state;
    group.dataset.activity = String(Boolean(permission.activity));
    group.setAttribute('transform', `translate(${permission.x} ${permission.y})`);

    group.append(makeCircle(34), makeText(permission.label, 58));
    nodeLayer.append(group);
  });
}

function makeCircle(radius) {
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('r', radius);
  return circle;
}

function makeText(label, y) {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('y', y);
  text.textContent = label;
  return text;
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
  }, 1400);
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
