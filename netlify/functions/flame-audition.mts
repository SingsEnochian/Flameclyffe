import { createWebModelAuditionHandler } from './_shared/web-model-audition.mjs';

export default (request, context) => createWebModelAuditionHandler({
  env: { get: (name) => Netlify.env.get(name) },
})(request, context);

export const config = {
  path: '/api/v1/flames/:flame_id/audition/:candidate_id',
};
