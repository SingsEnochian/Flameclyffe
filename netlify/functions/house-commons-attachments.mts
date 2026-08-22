import { getDeployStore, getStore } from '@netlify/blobs';
import { createHouseCommonsAttachmentHandler } from './_shared/house-commons-attachments-runtime.mjs';

export default async (request, context) => {
  const store = context.deploy?.context === 'production'
    ? getStore('house-commons-attachments', { consistency: 'strong' })
    : getDeployStore('house-commons-attachments', { consistency: 'strong' });
  return createHouseCommonsAttachmentHandler({ env: { get: (name) => Netlify.env.get(name) }, store })(request);
};

export const config = { path: '/api/v1/house/commons/attachments' };
