import { createModelAuditionHandler } from './_shared/flame-runtime.mjs';

export default async (request, context) => {
  const env = { get: (name) => Netlify.env.get(name) };
  return createModelAuditionHandler({ env })(request, context.params);
};

export const config = {
  path: '/api/v1/flames/:flame_id/audition/:candidate_id',
};
