import { portalSoundPatches } from '../sound/portalSoundRegistry.js';
import { createYggdrasilSoundProposal } from '../sound/yggdrasilSoundPlanner.js';

export function createMcpSoundResource() {
  return {
    uri: 'starwell://sound/patches',
    name: 'sound-patches',
    title: 'STARWELL Sound Patch Registry',
    description: 'Proposal-only sound patch summaries for future consent-gated audio work.',
    mimeType: 'application/json',
    sensitivity: 'public',
    retention: 'none',
    annotations: {
      audience: ['user', 'assistant'],
      priority: 0.4,
    },
  };
}

export function createMcpSoundTool() {
  return {
    name: 'starwell.propose_sound_patch',
    title: 'Propose Sound Patch',
    description: 'Return a visible proposal for a STARWELL sound patch. Audio output remains inactive.',
    riskTier: 'proposal',
    confirmation: 'ask-first',
    enabled: true,
    inputSchema: {
      type: 'object',
      properties: {
        patchId: { type: 'string' },
        roomId: { type: 'string' },
        requester: { type: 'string' },
      },
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        proposalOnly: { type: 'boolean' },
        playbackEnabled: { type: 'boolean' },
        patchId: { type: 'string' },
        roomId: { type: 'string' },
      },
      required: ['proposalOnly', 'playbackEnabled', 'patchId', 'roomId'],
    },
  };
}

export function createMcpSoundGatewayAdapter({ patches = portalSoundPatches } = {}) {
  return {
    resource: createMcpSoundResource(),
    tool: createMcpSoundTool(),
    readResource(uri) {
      if (uri !== 'starwell://sound/patches') return null;

      return {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({
          provenance: 'local sound registry summary / output inactive',
          patches: patches.map(summarizeSoundPatch),
        }),
      };
    },
    callTool(name, args = {}) {
      if (name !== 'starwell.propose_sound_patch') {
        return mcpToolError(`Unknown sound adapter tool: ${name}`);
      }

      const proposal = createYggdrasilSoundProposal({
        patchId: String(args.patchId ?? 'yggdrasil_root_breath'),
        roomId: String(args.roomId ?? 'ygg-gate'),
        requester: String(args.requester ?? 'presence:yggdrasil'),
        reason: 'mcp-sound-adapter',
      });

      return proposal.isError ? mcpToolError(proposal.message) : mcpToolResult(proposal);
    },
  };
}

function summarizeSoundPatch(patch) {
  return {
    id: patch.id,
    title: patch.title,
    intent: patch.intent,
    engine: patch.engine,
    state: patch.state,
    playback: {
      enabled: patch.playback.enabled,
      autoplay: patch.playback.autoplay,
      requiresUserGesture: patch.playback.requiresUserGesture,
    },
    safety: {
      maxGain: patch.safety.maxGain,
      featherStop: patch.safety.featherStop,
      plainPass: patch.safety.plainPass,
    },
    routing: patch.routing,
    layerCount: patch.layers.length,
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
