'use strict';

const { WebSocketServer, WebSocket } = require('ws');
const { normaliseSource, generateGlyphMatrix } = require('./glyph-matrix');

function createGlyphLiveService({ path = '/api/v1/glyph-matrix/live' } = {}) {
  const registry = new Map();
  let socketServer = null;
  let latest = null;

  function currentSources() { return [...registry.values()]; }

  function broadcast(payload) {
    latest = payload;
    if (!socketServer) return 0;
    const message = JSON.stringify({ type: 'glyph-matrix', data: payload });
    let delivered = 0;
    for (const client of socketServer.clients) {
      if (client.readyState === WebSocket.OPEN) { client.send(message); delivered += 1; }
    }
    return delivered;
  }

  function ingest(source) {
    const clean = normaliseSource(source);
    registry.set(clean.sourceId, clean);
    const glyph = generateGlyphMatrix({ sources: currentSources() });
    broadcast(glyph);
    return glyph;
  }

  function remove(sourceId) {
    const removed = registry.delete(String(sourceId));
    if (removed && registry.size) broadcast(generateGlyphMatrix({ sources: currentSources() }));
    if (!registry.size) latest = null;
    return removed;
  }

  function attach(server) {
    if (socketServer) return socketServer;
    socketServer = new WebSocketServer({ server, path });
    socketServer.on('connection', socket => {
      socket.send(JSON.stringify({ type: 'glyph-stream-ready', schema: 'hearthgate.glyph-stream/v1', source_count: registry.size }));
      if (latest) socket.send(JSON.stringify({ type: 'glyph-matrix', data: latest }));
    });
    return socketServer;
  }

  function status() {
    return {
      schema: 'hearthgate.glyph-stream/v1', path,
      source_count: registry.size, client_count: socketServer?.clients?.size || 0,
      sources: currentSources().map(source => ({ source_id: source.sourceId, source_kind: source.sourceKind, captured_at: source.capturedAt, metrics: Object.keys(source.metrics) })),
      has_current_matrix: Boolean(latest),
    };
  }

  return { attach, ingest, remove, status, currentSources, broadcast, get latest() { return latest; } };
}

module.exports = { createGlyphLiveService };
