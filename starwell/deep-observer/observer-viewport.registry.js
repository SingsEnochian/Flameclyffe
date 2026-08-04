/* STARWELL / DEEP Observer Viewport Registry v0.1
   Layout tokens for glyph scale, sensor ring radius, dock spacing, and HUD-safe overlays.
   Keep viewport values here instead of scattering hardcoded layout nudges through the renderer.
*/
'use strict';

window.STARWELL_OBSERVER_VIEWPORT_REGISTRY = {
  version: '0.1',
  ruleId: 'observer-viewport-map-v0.1',
  boundary: 'Viewport tokens control layout and safe zones only. They must not change observation data, model variables, glyph meaning, or narrative interpretation.',
  defaultBand: 'tablet-landscape',
  bands: [
    {
      id: 'desktop-wide',
      label: 'Wide desktop',
      minWidth: 1280,
      tokens: {
        glyphSize: '440px',
        sensorRingInsetTop: '-10%',
        sensorRingInsetRight: '-15%',
        sensorRingInsetBottom: '-17%',
        sensorRingInsetLeft: '-15%',
        sensorNodeSize: '4.25rem',
        sensorNodeFont: '.56rem',
        dockWidth: '620px',
        dockGap: 'calc((var(--observer-sensor-node-size) / 2) + 18px)',
        stageGap: '1rem',
        panelMaxWidth: 'none',
        astrolabeDepthScale: '1'
      }
    },
    {
      id: 'desktop-standard',
      label: 'Standard desktop / laptop',
      minWidth: 1120,
      maxWidth: 1279,
      tokens: {
        glyphSize: '430px',
        sensorRingInsetTop: '-9%',
        sensorRingInsetRight: '-14%',
        sensorRingInsetBottom: '-16%',
        sensorRingInsetLeft: '-14%',
        sensorNodeSize: '4.15rem',
        sensorNodeFont: '.54rem',
        dockWidth: '590px',
        dockGap: 'calc((var(--observer-sensor-node-size) / 2) + 16px)',
        stageGap: '1rem',
        panelMaxWidth: 'none',
        astrolabeDepthScale: '.95'
      }
    },
    {
      id: 'tablet-landscape',
      label: 'Tablet landscape / constrained desktop',
      minWidth: 900,
      maxWidth: 1119,
      tokens: {
        glyphSize: '400px',
        sensorRingInsetTop: '-8%',
        sensorRingInsetRight: '-13%',
        sensorRingInsetBottom: '-16%',
        sensorRingInsetLeft: '-13%',
        sensorNodeSize: '3.95rem',
        sensorNodeFont: '.52rem',
        dockWidth: '560px',
        dockGap: 'calc((var(--observer-sensor-node-size) / 2) + 14px)',
        stageGap: '.9rem',
        panelMaxWidth: '720px',
        astrolabeDepthScale: '.85'
      }
    },
    {
      id: 'tablet-portrait',
      label: 'Tablet portrait / large mobile',
      minWidth: 640,
      maxWidth: 899,
      tokens: {
        glyphSize: 'min(78vw,390px)',
        sensorRingInsetTop: '-7%',
        sensorRingInsetRight: '-12%',
        sensorRingInsetBottom: '-15%',
        sensorRingInsetLeft: '-12%',
        sensorNodeSize: '3.55rem',
        sensorNodeFont: '.48rem',
        dockWidth: 'min(92vw,520px)',
        dockGap: 'calc((var(--observer-sensor-node-size) / 2) + 12px)',
        stageGap: '.8rem',
        panelMaxWidth: '92vw',
        astrolabeDepthScale: '.7'
      }
    },
    {
      id: 'mobile',
      label: 'Mobile portrait',
      maxWidth: 639,
      tokens: {
        glyphSize: 'min(74vw,330px)',
        sensorRingInsetTop: '-6%',
        sensorRingInsetRight: '-10%',
        sensorRingInsetBottom: '-14%',
        sensorRingInsetLeft: '-10%',
        sensorNodeSize: '3.05rem',
        sensorNodeFont: '.42rem',
        dockWidth: 'min(94vw,420px)',
        dockGap: 'calc((var(--observer-sensor-node-size) / 2) + 10px)',
        stageGap: '.72rem',
        panelMaxWidth: '94vw',
        astrolabeDepthScale: '.55'
      }
    }
  ],
  cssVarMap: {
    glyphSize: '--observer-glyph-size',
    sensorRingInsetTop: '--observer-sensor-ring-inset-top',
    sensorRingInsetRight: '--observer-sensor-ring-inset-right',
    sensorRingInsetBottom: '--observer-sensor-ring-inset-bottom',
    sensorRingInsetLeft: '--observer-sensor-ring-inset-left',
    sensorNodeSize: '--observer-sensor-node-size',
    sensorNodeFont: '--observer-sensor-node-font',
    dockWidth: '--observer-dock-width',
    dockGap: '--observer-dock-gap',
    stageGap: '--observer-stage-gap',
    panelMaxWidth: '--observer-panel-max-width',
    astrolabeDepthScale: '--observer-astrolabe-depth-scale'
  },
  classify(width = window.innerWidth) {
    const w = Number(width);
    const bands = this.bands || [];
    return bands.find(band => {
      const minOk = typeof band.minWidth !== 'number' || w >= band.minWidth;
      const maxOk = typeof band.maxWidth !== 'number' || w <= band.maxWidth;
      return minOk && maxOk;
    }) || bands.find(band => band.id === this.defaultBand) || bands[0];
  }
};
