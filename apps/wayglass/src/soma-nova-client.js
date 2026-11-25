export async function previewSomaNovaMorphogenesis({
  base, target, environmentRequirements = [], accessibilityRequirements = [],
  fetchImpl = fetch, signal,
} = {}) {
  if (!base || typeof base !== 'object' || Array.isArray(base) ||
      !target || typeof target !== 'object' || Array.isArray(target)) {
    throw new TypeError('Soma Nova requires a base form and a derived target form.');
  }
  const response = await fetchImpl('/api/v1/wayglass/wyrdrune/morphogenesis/preview', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      base,
      target,
      environment_requirements: environmentRequirements,
      accessibility_requirements: accessibilityRequirements,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Soma Nova preview is unavailable.');
  if (data.schema !== 'wayglass.soma-nova-morphogenesis-preview/v1' ||
      data.authority !== 'authenticated-house-steward' ||
      data.dispatch !== 'none' || !Array.isArray(data.external_effects) ||
      data.external_effects.length !== 0 || data.persistence !== 'none' ||
      data.preview?.state !== 'preview-only' || data.preview?.persisted !== false ||
      data.preview?.externalEffects !== 'none' ||
      data.plan?.identity_ref !== base.identity_ref ||
      data.report?.plan_id !== data.plan?.plan_id) {
    throw new TypeError('The Soma Nova preview receipt does not match the native morphogenesis contract.');
  }
  return Object.freeze(data);
}
