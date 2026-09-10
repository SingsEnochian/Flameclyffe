function activeRoomId() {
  return document.querySelector('.content[data-houseglass-room]')?.dataset?.houseglassRoom
    || document.querySelector('.sidebar [data-room].active')?.dataset?.room
    || null;
}

function roomButton(room) {
  const target = String(room || '').trim();
  if (!target) return null;
  return [...document.querySelectorAll('.sidebar [data-room]')]
    .find((button) => button.dataset?.room === target) || null;
}

function reflectHealth(status, detail = null) {
  const os = globalThis.__arcsweepOS;
  os?.health?.set?.({
    service_id: 'os-navigation-driver',
    status,
    version: os.manifest?.version || null,
    last_success_at: status === 'healthy' ? new Date().toISOString() : null,
    last_error: status === 'healthy' ? null : detail,
    dependencies: ['arcsweep-os-kernel', 'arcsweep-main-ui'],
    recoverable: true,
    repair_class: 'UI/WIRING',
  });
}

export function installOSNavigationDriver() {
  if (typeof document === 'undefined' || globalThis.__arcsweepOSNavigationDriver) return globalThis.__arcsweepOSNavigationDriver || null;

  const onNavigation = (event) => {
    const target = event?.detail?.capsule?.current_room
      || event?.detail?.navigation_receipt?.payload?.current_room
      || null;
    if (!target || activeRoomId() === target) return;
    const button = roomButton(target);
    if (!button) {
      reflectHealth('degraded', `No visible ArcSweep room button exists for ${target}.`);
      return;
    }
    button.click();
    queueMicrotask(() => {
      if (activeRoomId() === target) reflectHealth('healthy');
      else reflectHealth('degraded', `Room click did not activate ${target}.`);
    });
  };

  globalThis.addEventListener('arcsweep:os-navigation', onNavigation);
  const api = Object.freeze({
    schema: 'arcsweep.os-navigation-driver/v1',
    activeRoom: activeRoomId,
    navigateVisible(room) {
      const button = roomButton(room);
      if (!button) return false;
      button.click();
      return true;
    },
    destroy() {
      globalThis.removeEventListener('arcsweep:os-navigation', onNavigation);
      delete globalThis.__arcsweepOSNavigationDriver;
    },
  });
  globalThis.__arcsweepOSNavigationDriver = api;
  reflectHealth('healthy');
  return api;
}

if (typeof document !== 'undefined') installOSNavigationDriver();
