function afterRender() {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, 250);
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(timer); resolve(); }));
    }
  });
}

export function createRoomNavigation({ document: doc = globalThis.document, settle = afterRender } = {}) {
  const buttons = () => [...(doc?.querySelectorAll('button[data-room]') || [])].filter((button) => button.dataset.room);
  const activeRoom = () => doc?.querySelector('.sidebar button[data-room].active')?.dataset.room
    || doc?.querySelector('button[data-room].active')?.dataset.room
    || doc?.querySelector('.content[data-houseglass-room]')?.dataset.houseglassRoom || null;
  const hasRoom = (room) => buttons().some((button) => button.dataset.room === room && !button.disabled);
  async function navigate(target) {
    const button = buttons().find((candidate) => candidate.dataset.room === target && !candidate.disabled);
    if (!button) return { ok: false, status: 'missing', target, observed_room: activeRoom() };
    if (activeRoom() !== target) button.click();
    await settle();
    const observedRoom = activeRoom();
    return { ok: observedRoom === target, status: observedRoom === target ? 'navigated' : 'not-observed', target, observed_room: observedRoom };
  }
  return Object.freeze({ activeRoom, hasRoom, navigate, settle });
}
