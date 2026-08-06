import * as THREE from '/vendor/three/three.module.min.js';
import { injectDispersion } from './dispersion.js';

const THEMES = {
  clear: { color: 0xdffbf0, roughness: 0.04, transmission: 1, thickness: 0.28, ior: 1.45, iridescence: 0, opacity: 0.62 },
  frosted: { color: 0xffffff, attenuationColor: 0xffffff, roughness: 0.6, transmission: 0.9, thickness: 1.5, ior: 1.5, clearcoat: 0.1, clearcoatRoughness: 0.1, iridescence: 0, dispersion: 0, opacity: 0.72 },
  stained: { color: 0x3a86ff, attenuationColor: 0xff006e, roughness: 0.1, transmission: 0.95, thickness: 2, ior: 1.52, clearcoat: 1, clearcoatRoughness: 0, iridescence: 0, dispersion: 0.01, opacity: 0.74 },
  refractive: { color: 0xffffff, attenuationColor: 0xffffff, roughness: 0, transmission: 1, thickness: 3.5, ior: 2.417, clearcoat: 1, clearcoatRoughness: 0, iridescence: 0, dispersion: 0.06, opacity: 0.68 },
  sea: { color: 0x56d8ae, roughness: 0.17, transmission: 0.92, thickness: 0.66, ior: 1.42, iridescence: 0.12, opacity: 0.72 },
  amber: { color: 0xd88b3c, roughness: 0.2, transmission: 0.88, thickness: 0.72, ior: 1.5, iridescence: 0.08, opacity: 0.76 },
  smoked: { color: 0x28363a, roughness: 0.22, transmission: 0.7, thickness: 0.8, ior: 1.52, iridescence: 0, opacity: 0.78 },
  prism: { color: 0xffffff, attenuationColor: 0xffffff, roughness: 0.1, transmission: 0.9, thickness: 1, ior: 1.33, clearcoat: 1, clearcoatRoughness: 0.1, iridescence: 1, iridescenceIOR: 1.5, iridescenceThicknessRange: [120, 520], dispersion: 0.02, opacity: 0.68 },
  translucent: { color: 0xe0aaff, attenuationColor: 0x9d4edd, roughness: 0.3, transmission: 0.4, thickness: 0.8, ior: 1.4, clearcoat: 0.5, clearcoatRoughness: 0.2, iridescence: 0, dispersion: 0, opacity: 0.8 },
};

export class GlassMaterialManager {
  constructor(environmentMap = null, initialTheme = 'sea') {
    this.material = new THREE.MeshPhysicalMaterial({
      envMap: environmentMap, transparent: true, side: THREE.DoubleSide,
      metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, attenuationDistance: 1.8,
    });
    this.setTheme(initialTheme);
  }

  setTheme(name) {
    const theme = THEMES[name] || THEMES.sea;
    for (const [key, value] of Object.entries(theme)) {
      if (key === 'color') this.material.color.setHex(value);
      else if (key === 'attenuationColor') this.material.attenuationColor.setHex(value);
      else this.material[key] = value;
    }
    if (!('attenuationColor' in theme)) this.material.attenuationColor.copy(this.material.color);
    injectDispersion(this.material, theme.dispersion || 0);
    this.material.needsUpdate = true;
    this.theme = name in THEMES ? name : 'sea';
    return this.material;
  }

  dispose() { this.material.dispose(); }
}

export { THREE, THEMES };
