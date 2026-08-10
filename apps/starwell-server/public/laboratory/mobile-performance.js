export function isMobileDevice() {
  const mobileAgent = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const touchMac = /Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
  return (mobileAgent || touchMac) && matchMedia('(max-width: 1024px)').matches;
}

export function optimizePipelineForDevice(renderer, pipeline, glassMaterial) {
  const constrained = isMobileDevice() || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 4);
  if (constrained) {
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    pipeline.resolutionScale = 0.5;
    glassMaterial.samples = 2;
    glassMaterial.clearcoat = 0;
    if ('dispersion' in glassMaterial) glassMaterial.dispersion = 0;
    if (glassMaterial.userData.uDispersion) glassMaterial.userData.uDispersion.value = 0;
  } else {
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    pipeline.resolutionScale = 1;
  }
  pipeline.resize();
  return { constrained, resolutionScale: pipeline.resolutionScale };
}
