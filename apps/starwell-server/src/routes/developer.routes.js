import { Router } from 'express';

export const developerRouter = Router();

const schemaVersion = '0.1.0';

const commandRegistry = Object.freeze([
  { name: '/commands', category: 'Adapters', status: 'available', level: 0, review: false },
  { name: '/witness', category: 'Memory', status: 'available', level: 0, review: false },
  { name: '/save', category: 'Memory', status: 'locked', level: 2, review: true },
  { name: '/recall', category: 'Memory', status: 'available', level: 1, review: false },
  { name: '/route', category: 'Routing', status: 'available', level: 1, review: false },
  { name: '/door', category: 'Routing', status: 'available', level: 0, review: false },
  { name: '/adapter-status', category: 'Adapters', status: 'available', level: 0, review: false },
  { name: '/draft', category: 'Agentic', status: 'available', level: 2, review: true },
  { name: '/test', category: 'Agentic', status: 'partial', level: 2, review: true },
  { name: '/log', category: 'Ledger', status: 'available', level: 1, review: false },
]);

const adapters = Object.freeze([
  { id: 'ollama-local', title: 'Ollama Local', status: 'planned', scope: 'Local Yggdrasil model calls', fallback: 'Ollama bridge is not reachable yet.' },
  { id: 'supabase-private', title: 'Supabase Private Records', status: 'available', scope: 'Private project records and snapshots', fallback: 'Supabase bridge is not available right now.' },
  { id: 'github-workbench', title: 'GitHub Workbench', status: 'available', scope: 'Branch and PR work, no autonomous merge', fallback: 'GitHub bridge can prepare work, not merge it.' },
  { id: 'google-drive-docs', title: 'Google Drive Docs', status: 'available', scope: 'Docs and review surfaces through approved connector', fallback: 'Google Drive bridge is not available right now.' },
  { id: 'mail-adapter', title: 'Steward Mail Adapter', status: 'draft-only', scope: 'Outbox queue and reviewed email drafts', fallback: 'Mail bridge is draft-only until Rowan enables sending.' },
]);

function buildRoutePreview() {
  return {
    channel: 'starwell-dev',
    speaker: 'rowan-falka',
    addressed: ['yggdrasil-local'],
    mode: 'developer-chat',
    write_allowed: false,
    ledger_required: true,
    review_required: false,
    autonomy_level: 0,
    door_status: 'backend-stubs-live',
  };
}

developerRouter.get('/schema', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ok: true,
    schemaVersion,
    source: 'starwell-server/developer.schema.mock',
    commands: commandRegistry,
    adapters,
    routePreview: buildRoutePreview(),
    guardrails: {
      clientAuthorityAccepted: false,
      secretsInResponse: false,
      writeActionsFromChat: false,
      hiddenPersistence: false,
    },
  });
});

developerRouter.get('/commands', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ ok: true, schemaVersion, commands: commandRegistry });
});

developerRouter.get('/adapters', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ ok: true, schemaVersion, adapters });
});
