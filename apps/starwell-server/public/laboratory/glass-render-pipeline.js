import * as THREE from '/vendor/three/three.module.min.js';

export class GlassRenderPipeline {
  constructor(renderer, scene, camera, canvas) {
    this.renderer = renderer; this.scene = scene; this.camera = camera; this.canvas = canvas; this.resolutionScale = 1;
    this.transmissionTarget = new THREE.WebGLRenderTarget(1, 1, {
      format: THREE.RGBAFormat, type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      generateMipmaps: false, depthBuffer: true,
    });
  }

  resize() {
    const box = this.canvas.getBoundingClientRect();
    const scale = Math.min(devicePixelRatio || 1, 2) * this.resolutionScale;
    this.transmissionTarget.setSize(Math.max(1, Math.floor(box.width * scale)), Math.max(1, Math.floor(box.height * scale)));
  }

  render(glassMesh) {
    glassMesh.visible = false;
    this.renderer.setRenderTarget(this.transmissionTarget);
    this.renderer.clear(); this.renderer.render(this.scene, this.camera);
    glassMesh.material.transmissionMap = this.transmissionTarget.texture;
    glassMesh.visible = true;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() { this.transmissionTarget.dispose(); }
}
