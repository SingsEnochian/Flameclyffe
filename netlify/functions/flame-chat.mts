import { createFlameHandler } from './_shared/flame-runtime.mjs';
import {
  bindMessageToRuntimeWorld,
  normaliseRuntimeWorldContext,
  responseWithRuntimeWorld,
} from './_shared/runtime-world-context.mjs';

export default async (request, context) => {
  const env = { get: (name) => Netlify.env.get(name) };
  let runtimeWorld = null;
  let boundRequest = request;

  if (request.method === 'POST' && context.params?.action === 'chat') {
    try {
      const body = await request.clone().json();
      runtimeWorld = normaliseRuntimeWorldContext(body);
      if (runtimeWorld) {
        boundRequest = new Request(request, {
          body: JSON.stringify({
            ...body,
            message: bindMessageToRuntimeWorld(body.message, runtimeWorld),
          }),
        });
      }
    } catch (error) {
      if (/world_context|world_id/.test(error?.message || '')) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
        });
      }
    }
  }

  const response = await createFlameHandler({ env })(boundRequest, context.params);
  return runtimeWorld ? responseWithRuntimeWorld(response, runtimeWorld) : response;
};

export const config = {
  path: '/api/v1/flames/:flame_id/:action',
};
