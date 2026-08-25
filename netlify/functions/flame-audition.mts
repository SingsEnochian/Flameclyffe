import { createHostedModelAuditionHandler } from './_shared/model-audition-runtime.mjs';

export default async (request, context) => {
  const env = { get: (name) => Netlify.env.get(name) };
  const handle = createHostedModelAuditionHandler({ env });
  return handle(request, {
    flame_id: String(context?.params?.flame_id || ''),
    candidate_id: String(context?.params?.candidate_id || ''),
  });
};

export const config = {
  path: '/api/v1/flames/:flame_id/audition/:candidate_id',
};
