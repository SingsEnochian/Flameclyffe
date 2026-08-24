import { getDeployStore, getStore } from '@netlify/blobs';
import { createHouseCommonsHandler } from './_shared/house-commons-runtime.mjs';

export default async (request, context) => {
  const store = context.deploy?.context === 'production'
    ? getStore('house-commons', { consistency: 'strong' })
    : getDeployStore('house-commons', { consistency: 'strong' });
  return createHouseCommonsHandler({ env: { get: (name) => Netlify.env.get(name) }, store })(request);
};

export const config = { path: '/api/v1/house/commons' };
