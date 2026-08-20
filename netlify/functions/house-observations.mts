import { createHouseObservationRuntimeHandler } from './_shared/house-observation-runtime.mjs';

export default (request) => createHouseObservationRuntimeHandler({
  env: { get: (name) => Netlify.env.get(name) },
})(request);

export const config = { path: '/api/v1/house/observations' };
