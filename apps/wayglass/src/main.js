import './styles.css';
import { installWayglassField } from './glass-field.js';
import { mountWayglassSurface, registerWayglassSurface, listWayglassSurfaces } from './surface-registry.js';
import { mountArcSweepWritingSurface } from './surfaces/arcsweep-writing.js';

const root = document.querySelector('#app');

installWayglassField({ host: document.body });

registerWayglassSurface({
  surface_id: 'arcsweep:writing-room',
  label: 'ArcSweep · Writing Room',
  mount: mountArcSweepWritingSurface,
});

const wayglass = Object.freeze({
  schema: 'wayglass.os/v0.1',
  surfaces: listWayglassSurfaces,
  mount: (surfaceId) => mountWayglassSurface(surfaceId, root),
});

globalThis.__wayglassOS = wayglass;

await wayglass.mount('arcsweep:writing-room');
