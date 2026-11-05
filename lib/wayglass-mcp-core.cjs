'use strict';

// Transport-neutral MCP protocol core. Authentication and HTTP transport belong
// to the hosting adapter; never mount this handler directly on a public route.
const PROTOCOL_VERSION = '2025-03-26';
const TOOLS = Object.freeze([{
  name: 'wayglass_routes',
  description: 'List the available Wayglass model routes.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
}]);

function rpcError(id, code, message) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } };
}

function handleMcpMessage(message, { authenticated = false, listRoutes } = {}) {
  if (!message || typeof message !== 'object' || Array.isArray(message)
      || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
    return rpcError(message?.id, -32600, 'Invalid Request');
  }
  if (!authenticated) return rpcError(message.id, -32001, 'Authentication required');
  if (message.method === 'notifications/initialized') return null;
  if (message.id === undefined || message.id === null) {
    return rpcError(null, -32600, 'Requests require an id');
  }
  if (message.method === 'initialize') {
    return { jsonrpc: '2.0', id: message.id, result: {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'wayglass', version: '0.1.0' },
    } };
  }
  if (message.method === 'tools/list') {
    return { jsonrpc: '2.0', id: message.id, result: { tools: TOOLS } };
  }
  if (message.method === 'tools/call') {
    if (message.params?.name !== 'wayglass_routes') {
      return rpcError(message.id, -32602, 'Unknown or unsupported tool');
    }
    if (typeof listRoutes !== 'function') {
      return rpcError(message.id, -32603, 'Route service unavailable');
    }
    let routes;
    try {
      routes = listRoutes();
    } catch {
      // Never disclose provider errors or throw through the MCP HTTP boundary.
      return rpcError(message.id, -32603, 'Route service unavailable');
    }
    // Preserve synchronous callers while allowing cloud-native asynchronous route
    // catalogues. Rejections must remain sanitized JSON-RPC errors.
    const serialize = value => Array.isArray(value)
      ? { jsonrpc: '2.0', id: message.id, result: {
        content: [{ type: 'text', text: JSON.stringify(value) }],
      } }
      : rpcError(message.id, -32603, 'Invalid route service response');
    if (routes && typeof routes.then === 'function') {
      return Promise.resolve(routes).then(serialize, () => rpcError(message.id, -32603, 'Route service unavailable'));
    }
    return serialize(routes);
  }
  return rpcError(message.id, -32601, 'Method not found');
}

module.exports = { PROTOCOL_VERSION, TOOLS, handleMcpMessage };
