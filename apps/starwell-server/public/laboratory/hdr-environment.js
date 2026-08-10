import * as THREE from '/vendor/three/three.module.min.js';
import { RGBELoader } from '/vendor/three-examples/loaders/RGBELoader.js';

export async function loadHDREnvironment(renderer, scene, source) {
  const url=source instanceof File?URL.createObjectURL(source):source;
  const generator=new THREE.PMREMGenerator(renderer);generator.compileEquirectangularShader();
  try {const texture=await new RGBELoader().setDataType(THREE.HalfFloatType).loadAsync(url);const target=generator.fromEquirectangular(texture);texture.dispose();scene.environment=target.texture;return target;}
  finally {generator.dispose();if(source instanceof File)URL.revokeObjectURL(url)}
}
