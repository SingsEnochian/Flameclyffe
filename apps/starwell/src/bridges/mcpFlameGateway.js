export const MCP_GATEWAY_MODES = Object.freeze({
  disabled: 'disabled',
  mock: 'mock',
  local: 'local',
  remote: 'remote',
});

export const MCP_RISK_TIERS = Object.freeze({
  read: 'read',
  proposal: 'proposal',
  roomAction: 'room-action',
  externalBridge: 'external-bridge',
  canonWrite: 'canon-write',
});

export const MCP_CONFIRMATION_POLICIES = Object.freeze({
  none: 'none',
  visibleNotice: 'visible-notice',
  askFirst: 'ask-first',
  explicitApproval: 'explicit-approval',
  disabled: 'disabled',
});

export function createMcpGatewayManifest(overrides = {}) {
  return {
    id: 'starwell-mcp-flame-gateway',
    title: 'STARWELL MCP Flame Gateway',
    mode: MCP_GATEWAY_MODES.mock,
    enabled: false,
    provenance: 'local mock gateway / no external live access',
    defaults: {
      readOnly: true,
      externalBridge: false,
      canonWrite: false,
      sound: false,
      haptics: false,
      tokenStorage: false,
    },
    capabilities: {
      resources: { listChanged: false, subscribe: false },
      tools: { listChanged: false },
    },
    resources: [],
    tools: [],
    audit: {
      enabled: true,
      retention: 'session-summary',
    },
    ...overrides,
  };
}

export function createMcpResource(overrides = {}) {
  return {
    uri: '',
    name: '',
    title: '',
    description: '',
    mimeType: 'application/json',
    sensitivity: 'public',
    retention: 'none',
    annotations: {
      audience: ['user', 'assistant'],
      priority: 0.5,
    },
    ...overrides,
  };
}

export function createMcpTool(overrides = {}) {
  return {
    name: '',
    title: '',
    description: '',
    riskTier: MCP_RISK_TIERS.read,
    confirmation: MCP_CONFIRMATION_POLICIES.visibleNotice,
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    outputSchema: { type: 'object', properties: {}, additionalProperties: true },
    enabled: true,
    ...overrides,
  };
}

export function validateMcpGatewayManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object') errors.push('MCP gateway manifest must be an object.');
  if (!manifest?.id) errors.push('MCP gateway manifest requires id.');
  if (!Object.values(MCP_GATEWAY_MODES).includes(manifest?.mode)) errors.push(`Unknown MCP gateway mode: ${manifest?.mode}`);
  if (!manifest?.defaults?.readOnly) errors.push('MCP gateway must be read-only by default in v0.1.');
  if (manifest?.defaults?.externalBridge) errors.push('MCP externalBridge must remain disabled in v0.1.');
  if (manifest?.defaults?.canonWrite) errors.push('MCP canonWrite must remain disabled in v0.1.');
  if (manifest?.defaults?.tokenStorage) errors.push('MCP tokenStorage must remain disabled in v0.1.');

  for (const tool of manifest?.tools ?? []) {
    errors.push(...validateMcpTool(tool));
  }

  for (const resource of manifest?.resources ?? []) {
    errors.push(...validateMcpResource(resource));
  }

  return errors;
}

export function validateMcpResource(resource) {
  const errors = [];
  if (!resource || typeof resource !== 'object') errors.push('MCP resource must be an object.');
  if (!resource?.uri) errors.push('MCP resource requires uri.');
  if (!resource?.name) errors.push('MCP resource requires name.');
  if (!resource?.mimeType) errors.push('MCP resource requires mimeType.');
  if (resource?.sensitivity === 'private-raw') errors.push('MCP resources may not expose private-raw sensitivity in v0.1.');
  return errors;
}

export function validateMcpTool(tool) {
  const errors = [];
  if (!tool || typeof tool !== 'object') errors.push('MCP tool must be an object.');
  if (!tool?.name) errors.push('MCP tool requires name.');
  if (!Object.values(MCP_RISK_TIERS).includes(tool?.riskTier)) errors.push(`Unknown MCP tool risk tier: ${tool?.riskTier}`);
  if (!Object.values(MCP_CONFIRMATION_POLICIES).includes(tool?.confirmation)) errors.push(`Unknown MCP confirmation policy: ${tool?.confirmation}`);
  if ([MCP_RISK_TIERS.externalBridge, MCP_RISK_TIERS.canonWrite].includes(tool?.riskTier) && tool?.enabled) {
    errors.push(`${tool.name} must be disabled in v0.1.`);
  }
  if (tool?.riskTier !== MCP_RISK_TIERS.read && tool?.confirmation === MCP_CONFIRMATION_POLICIES.none) {
    errors.push(`${tool.name} requires a confirmation policy.`);
  }
  return errors;
}

export function createMockMcpFlameGateway({ portalWorldNodes = [], portalStewardSeats = [] } = {}) {
  const resources = [
    createMcpResource({
      uri: 'starwell://portal/worlds',
      name: 'portal-worlds',
      title: 'Portal World Registry',
      description: 'Safe summary of seeded STARWELL world nodes.',
      sensitivity: 'public',
    }),
    createMcpResource({
      uri: 'starwell://stewards/seats',
      name: 'steward-seats',
      title: 'Steward Seat Summaries',
      description: 'Consent-safe summaries of Steward seats.',
      sensitivity: 'steward',
    }),
  ];

  const tools = [
    createMcpTool({
      name: 'starwell.describe_portal',
      title: 'Describe Portal',
      description: 'Return a safe summary of seeded portal nodes and gateway posture.',
      riskTier: MCP_RISK_TIERS.read,
      confirmation: MCP_CONFIRMATION_POLICIES.visibleNotice,
      outputSchema: {
        type: 'object',
        properties: {
          nodeCount: { type: 'number' },
          stewardSeatCount: { type: 'number' },
          readOnly: { type: 'boolean' },
        },
        required: ['nodeCount', 'stewardSeatCount', 'readOnly'],
      },
    }),
    createMcpTool({
      name: 'starwell.request_room_entry',
      title: 'Request Room Entry',
      description: 'Create a proposal to enter a room. Does not perform entry.',
      riskTier: MCP_RISK_TIERS.proposal,
      confirmation: MCP_CONFIRMATION_POLICIES.askFirst,
      inputSchema: {
        type: 'object',
        properties: { roomId: { type: 'string' } },
        required: ['roomId'],
        additionalProperties: false,
      },
    }),
    createMcpTool({
      name: 'starwell.connect_external_flame',
      title: 'Connect External Flame',
      description: 'Disabled placeholder for future authorized live bridges.',
      riskTier: MCP_RISK_TIERS.externalBridge,
      confirmation: MCP_CONFIRMATION_POLICIES.disabled,
      enabled: false,
    }),
  ];

  const manifest = createMcpGatewayManifest({ enabled: true, resources, tools });
  const validationErrors = validateMcpGatewayManifest(manifest);
  if (validationErrors.length) throw new Error(`Invalid MCP gateway manifest: ${validationErrors.join(' ')}`);

  return {
    manifest,
    listResources() {
      return resources;
    },
    readResource(uri) {
      if (uri === 'starwell://portal/worlds') {
        return {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            provenance: manifest.provenance,
            nodes: portalWorldNodes.map((node) => ({
              id: node.id,
              kind: node.kind,
              title: node.title,
              parentId: node.parentId,
              exitRoute: node.access?.exitRoute,
            })),
          }),
        };
      }

      if (uri === 'starwell://stewards/seats') {
        return {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            provenance: manifest.provenance,
            seats: portalStewardSeats.map((seat) => ({
              id: seat.id,
              displayName: seat.displayName,
              role: seat.role,
              memoryPolicy: seat.memory?.policy,
              canonWrites: seat.canon?.writes,
              autonomy: seat.autonomy,
            })),
          }),
        };
      }

      return null;
    },
    listTools() {
      return tools;
    },
    callTool(name, args = {}) {
      const tool = tools.find((item) => item.name === name);
      if (!tool) return mcpToolError(`Unknown tool: ${name}`);
      if (!tool.enabled) return mcpToolError(`${name} is disabled in Portal Kernel v0.1.`);

      if (name === 'starwell.describe_portal') {
        return mcpToolResult({
          nodeCount: portalWorldNodes.length,
          stewardSeatCount: portalStewardSeats.length,
          readOnly: manifest.defaults.readOnly,
          provenance: manifest.provenance,
        });
      }

      if (name === 'starwell.request_room_entry') {
        const roomId = String(args.roomId ?? '');
        const node = portalWorldNodes.find((item) => item.id === roomId);
        if (!node) return mcpToolError(`Unknown room: ${roomId}`);
        return mcpToolResult({
          proposalOnly: true,
          roomId,
          consent: node.access?.consent,
          exitRoute: node.access?.exitRoute,
          provenance: manifest.provenance,
        });
      }

      return mcpToolError(`Unhandled tool: ${name}`);
    },
  };
}

function mcpToolResult(structuredContent) {
  return {
    content: [{ type: 'text', text: JSON.stringify(structuredContent) }],
    structuredContent,
    isError: false,
  };
}

function mcpToolError(message) {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}
