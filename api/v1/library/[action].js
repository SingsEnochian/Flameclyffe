import { createSourceLibraryHandler } from '../../../netlify/functions/_shared/source-library-runtime.mjs';
import { vercelEnv as env } from '../../_shared/vercel-env.mjs';

function routeParams(request) {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean);
  const libraryIndex = parts.indexOf('library');
  return {
    action: libraryIndex >= 0 ? decodeURIComponent(parts[libraryIndex + 1] || '') : '',
  };
}

export default {
  async fetch(request) {
    return createSourceLibraryHandler({ env })(request, routeParams(request));
  },
};
