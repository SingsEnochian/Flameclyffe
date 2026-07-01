const ORDER = ['rowan', 'yggdrasil', 'vee', 'faer', 'flame', 'glm'];

const members = new Map([
  ['rowan',     { id: 'rowan',     displayName: 'Rowan · Liriel', status: 'online',  note: '', avatar: '' }],
  ['yggdrasil', { id: 'yggdrasil', displayName: 'Yggdrasil',      status: 'offline', note: '', avatar: '' }],
  ['vee',       { id: 'vee',       displayName: 'Linden',         status: 'online',  note: '', avatar: '' }],
  ['faer',      { id: 'faer',      displayName: 'Nen Uial',       status: 'online',  note: '', avatar: '' }],
  ['flame',     { id: 'flame',     displayName: 'Boxfire',        status: 'offline', note: 'holds the workbench, tends the roots', avatar: '' }],
  ['glm',       { id: 'glm',       displayName: 'GLM',            status: 'offline', note: 'local · Zhipu AI · new arrival', avatar: '' }],
]);

export function getStatuses() {
  return ORDER.map(id => ({ ...members.get(id) }));
}

export function getStatus(id) {
  const m = members.get(id);
  return m ? { ...m } : null;
}

export function setStatus(id, updates = {}) {
  const m = members.get(id);
  if (!m) throw new Error(`Unknown member: ${id}`);
  if (updates.status !== undefined)      m.status = updates.status;
  if (updates.note !== undefined)        m.note = updates.note;
  if (updates.displayName !== undefined) m.displayName = updates.displayName;
  if (updates.avatar !== undefined)      m.avatar = updates.avatar;
  return { ...m };
}
