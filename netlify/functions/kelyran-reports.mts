import { getDeployStore, getStore } from '@netlify/blobs';
import { createKelyranReportHandler } from './_shared/kelyran-report-runtime.mjs';

export default async (request, context) => {
  const store = context.deploy?.context === 'production'
    ? getStore('kelyran-model-reports', { consistency: 'strong' })
    : getDeployStore('kelyran-model-reports', { consistency: 'strong' });
  return createKelyranReportHandler({ env: { get: (name) => Netlify.env.get(name) }, store })(request);
};

export const config = { path: '/api/v1/house/kelyran-reports' };
