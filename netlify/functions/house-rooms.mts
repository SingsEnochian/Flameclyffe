import { getDeployStore, getStore } from '@netlify/blobs';
import { createHouseRoomsHandler } from './_shared/house-rooms-runtime.mjs';

export default async (request, context) => {
  const store = context.deploy?.context === 'production'
    ? getStore('house-commons', { consistency: 'strong' })
    : getDeployStore('house-commons', { consistency: 'strong' });
  const env = { get: (name) => Netlify.env.get(name) };
  return createHouseRoomsHandler({ env, store })(request);
};

export const config = { path: '/api/v1/house/rooms' };
