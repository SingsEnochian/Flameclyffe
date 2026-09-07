import { getDeployStore, getStore } from '@netlify/blobs';
import { createTelegramHouseBridgeHandler } from './_shared/telegram-house-bridge-runtime.mjs';

export default async (request, context) => {
  const store = context.deploy?.context === 'production'
    ? getStore('house-commons', { consistency: 'strong' })
    : getDeployStore('house-commons', { consistency: 'strong' });
  const env = { get: (name) => Netlify.env.get(name) };
  return createTelegramHouseBridgeHandler({ env, store })(request);
};

export const config = { path: '/api/v1/telegram/house' };
