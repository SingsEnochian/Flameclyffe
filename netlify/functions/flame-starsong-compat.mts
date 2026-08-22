import flameChat from './flame-chat.mts';

const STARSONG_FLAMES = new Set(['larkshine', 'ellowind']);

export default async (request, context) => {
  const flameId = String(context.params?.flame_id || '');
  if (!STARSONG_FLAMES.has(flameId)) {
    return new Response(JSON.stringify({ error: `Unknown Starsong Flame: ${flameId}` }), {
      status: 404,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }
  return flameChat(request, context);
};

export const config = {
  path: '/api/v1/flames/starsong/:flame_id/:action',
};
