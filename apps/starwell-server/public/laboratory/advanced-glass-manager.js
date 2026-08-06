import * as THREE from '/vendor/three/three.module.min.js';
import { gsap } from '/vendor/gsap/index.js';
import { THEMES } from './glass-material-manager.js';
import { injectDispersion } from './dispersion.js';

export class AdvancedGlassManager {
  constructor(environmentMap = null, initialTheme = 'sea') {
    this.material = new THREE.MeshPhysicalMaterial({
      envMap: environmentMap, envMapIntensity: 1.5, transparent: true,
      side: THREE.DoubleSide, metalness: 0, attenuationDistance: 1.8,
    });
    injectDispersion(this.material, 0);
    this.activeTween = null;
    this.setTheme(initialTheme, 0);
  }

  setTheme(themeName, duration = 0.8) {
    const config = THEMES[themeName === 'iridescent' ? 'prism' : themeName] || THEMES.sea;
    this.activeTween?.kill();
    const color = new THREE.Color(config.color ?? this.material.color);
    const attenuation = new THREE.Color(config.attenuationColor ?? config.color ?? this.material.attenuationColor);
    const numeric = Object.fromEntries(Object.entries(config).filter(([key, value]) => typeof value === 'number' && !['color', 'attenuationColor', 'dispersion'].includes(key)));
    const target = {
      ...numeric,
      colorR: color.r, colorG: color.g, colorB: color.b,
      attenuationR: attenuation.r, attenuationG: attenuation.g, attenuationB: attenuation.b,
      dispersion: config.dispersion || 0,
    };
    const proxy = {
      ...Object.fromEntries(Object.keys(numeric).map(key => [key, Number(this.material[key]) || 0])),
      colorR: this.material.color.r, colorG: this.material.color.g, colorB: this.material.color.b,
      attenuationR: this.material.attenuationColor.r, attenuationG: this.material.attenuationColor.g, attenuationB: this.material.attenuationColor.b,
      dispersion: this.material.dispersion || 0,
    };
    const apply = () => {
      Object.keys(numeric).forEach(key => { this.material[key] = proxy[key]; });
      this.material.color.setRGB(proxy.colorR, proxy.colorG, proxy.colorB);
      this.material.attenuationColor.setRGB(proxy.attenuationR, proxy.attenuationG, proxy.attenuationB);
      injectDispersion(this.material, proxy.dispersion);
    };
    if (!duration || matchMedia('(prefers-reduced-motion: reduce)').matches) { Object.assign(proxy, target); apply(); return; }
    this.activeTween = gsap.to(proxy, { ...target, duration, ease: 'power2.out', onUpdate: apply });
  }

  dispose() { this.activeTween?.kill(); this.material.dispose(); }
}
