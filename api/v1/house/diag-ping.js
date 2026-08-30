export default {
  fetch() {
    return new Response('ok', {
      status: 200,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  },
};
