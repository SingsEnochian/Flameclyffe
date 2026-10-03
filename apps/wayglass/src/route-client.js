const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function jsonOrThrow(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Wayglass route request failed.');
  return data;
}

export async function listWayglassRoutes(fetchImpl = fetch) {
  const response = await fetchImpl('/api/v1/wayglass/routes', { cache: 'no-store' });
  return jsonOrThrow(response);
}

export async function invokeWayglassRoute({
  routeId = 'openai:gpt',
  input,
  history = [],
  interaction,
  sessionId,
  surfaceId = 'arcsweep:writing-room',
  maxOutputTokens = 1400,
  fetchImpl = fetch,
} = {}) {
  const response = await fetchImpl('/api/v1/wayglass/respond', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      route_id: routeId,
      input,
      history,
      interaction,
      session_id: sessionId,
      surface_id: surfaceId,
      max_output_tokens: maxOutputTokens,
    }),
  });
  return jsonOrThrow(response);
}
