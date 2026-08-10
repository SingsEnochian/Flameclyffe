/**
 * Apply wavelength separation to a Three.js MeshPhysicalMaterial.
 * Three r179 has a native physical-material dispersion uniform, so use it
 * instead of patching private shader chunk variable names that change between
 * releases. The retained userData handle gives the UI a stable runtime control.
 */
export function injectDispersion(material, dispersionAmount = 0.02) {
  const value = Math.max(0, Math.min(1, Number(dispersionAmount) || 0));
  material.userData ||= {};
  material.userData.uDispersion ||= { value };
  material.userData.uDispersion.value = value;
  if ('dispersion' in material) material.dispersion = value;
  material.needsUpdate = true;
  return material;
}
