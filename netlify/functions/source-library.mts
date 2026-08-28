import { createSourceLibraryHandler } from './_shared/source-library-runtime.mjs';

export default async (request, context) => {
  const env = { get: (name) => Netlify.env.get(name) };
  return createSourceLibraryHandler({ env })(request, context.params);
};

export const config = {
  path: '/api/v1/library/:action',
};
