'use strict';

// Transport-neutral MCP protocol core. Authentication and HTTP transport belong
// to the hosting adapter; never mount this handler directly on a public route.
const PROTOCOL_VERSION = '2025-03-26';
const TOOLS = Object.freeze([{
  name: 'wayglass_routes',
  description: 'List the available Wayglass model routes.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
}]);
const PRESENT_TOOL = Object.freeze({
  name: 'wayglass_present',
  description: 'Submit an Eightfold design presentation to the authenticated Wayglass review inbox; a receipt is not a participant reply.',
  inputSchema: { type: 'object', additionalProperties: false, required: ['presentation_id','source_ref','intent'],
    properties: { presentation_id: { type: 'string' }, source_ref: { type: 'string' },
      intent: { type: 'string' }, phases: { type: 'array', minItems: 8, maxItems: 8, items: { type: 'object' } }, eightfold: { type: 'array', minItems: 8, maxItems: 8, items: { type: 'object' } } } }
});

const RESPOND_TOOL = Object.freeze({
  name: 'wayglass_respond',
  description: 'Invoke an explicitly authorized native Wayglass route with source-attributed response and receipt. Model output does not establish participant identity.',
  inputSchema: { type: 'object', additionalProperties: false, required: ['route_id', 'input'], properties: {
    route_id: { type: 'string', minLength: 1, maxLength: 160 },
    input: { type: 'string', minLength: 1, maxLength: 12000 },
    history: { type: 'array', maxItems: 128, items: { type: 'object' } },
    interaction: { type: 'object' }, max_output_tokens: { type: 'integer', minimum: 1, maximum: 32768 },
    think: { type: 'boolean' }
  } }
});

function rpcError(id, code, message) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } };
}

function handleMcpMessage(message, { authenticated = false, listRoutes, present, respond, principal, resource } = {}) {
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
  if (message.method === 'ping') {
    return { jsonrpc: '2.0', id: message.id, result: {} };
  }
  if (message.method === 'tools/list') {
    return { jsonrpc: '2.0', id: message.id, result: { tools: [...TOOLS, ...(typeof present === 'function' ? [PRESENT_TOOL] : []), ...(typeof respond === 'function' ? [RESPOND_TOOL] : [])] } };
  }
  if (message.method === 'tools/call') {
    if (message.params?.name === 'wayglass_respond') {
      if (typeof respond !== 'function') return rpcError(message.id, -32603, 'Native turn service unavailable');
      const input = message.params?.arguments;
      const allowed = new Set(['route_id','input','history','interaction','max_output_tokens','think']);
      if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !allowed.has(key)) ||
          typeof input.route_id !== 'string' || !input.route_id.trim() || input.route_id.length > 160 ||
          typeof input.input !== 'string' || !input.input.trim() || input.input.length > 12000 ||
          (input.history !== undefined && (!Array.isArray(input.history) || input.history.length > 128)) ||
          (input.interaction !== undefined && (!input.interaction || typeof input.interaction !== 'object' || Array.isArray(input.interaction))) ||
          (input.max_output_tokens !== undefined && (!Number.isInteger(input.max_output_tokens) || input.max_output_tokens < 1 || input.max_output_tokens > 32768)) ||
          (input.think !== undefined && typeof input.think !== 'boolean')) return rpcError(message.id, -32602, 'Invalid native turn');
      const snapshot = JSON.parse(JSON.stringify(input));
      return Promise.resolve().then(() => respond(snapshot)).then(result => ({
        jsonrpc: '2.0', id: message.id, result: { content: [{ type: 'text', text: JSON.stringify(result) }] }
      }), () => rpcError(message.id, -32003, 'Native turn denied or unavailable'));
    }
    if (message.params?.name === 'wayglass_present') {
      if (typeof present !== 'function') return rpcError(message.id, -32603, 'Presentation service unavailable');
      return Promise.resolve().then(() => present({
        principal, resource, payload: message.params?.arguments
      })).then(result => ({
        jsonrpc: '2.0', id: message.id, result: {
          content: [{ type: 'text', text: JSON.stringify(result) }]
        }
      }), () => rpcError(message.id, -32003, 'Presentation denied or unavailable'));
    }
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
