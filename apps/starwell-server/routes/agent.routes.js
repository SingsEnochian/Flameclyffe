'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const liveTools = require('../lib/live-tools');

const REGISTRY_DIR = path.join(__dirname, '../../../registries');
const AGENT_REGISTRY_PATH = path.join(REGISTRY_DIR, 'agent-recipes.registry.yaml');
const TOOL_REGISTRY_PATH = path.join(REGISTRY_DIR, 'tool-capabilities.registry.yaml');

function loadRegistry() {
  try {
    const agentReg = yaml.load(fs.readFileSync(AGENT_REGISTRY_PATH, 'utf8'));
    const toolReg = yaml.load(fs.readFileSync(TOOL_REGISTRY_PATH, 'utf8'));
    return { recipes: agentReg?.recipes || [], tools: toolReg?.tools || [] };
  } catch (err) {
    return { recipes: [], tools: [], error: err.message };
  }
}

// Which tools are actually implemented right now
const IMPLEMENTED_TOOLS = new Set([
  'noaa-solar-wind', 'noaa-kp', 'noaa-sunspots', 'usgs-seismic',
  'gwosc-gw-catalog', 'meeus-lunar', 'arxiv-search',
  'starwell-observer-environment',
  'graph-query', 'vector-search', 'bm25-search', 'discover-tools',
]);

// Build Anthropic tool definition for a tool ID
function toolDefinition(toolId) {
  const defs = {
    'noaa-solar-wind': {
      name: 'noaa_solar_wind',
      description: 'Fetch real-time solar wind magnetic field data (NOAA DSCOVR, 1-minute cadence). Returns Bz, Bt, speed.',
      input_schema: { type: 'object', properties: {}, required: [] },
    },
    'noaa-kp': {
      name: 'noaa_kp',
      description: 'Fetch NOAA Planetary K-index (geomagnetic disturbance, 0–9). Kp≥5 = storm.',
      input_schema: { type: 'object', properties: {}, required: [] },
    },
    'noaa-sunspots': {
      name: 'noaa_sunspots',
      description: 'Fetch NOAA daily sunspot report.',
      input_schema: { type: 'object', properties: {}, required: [] },
    },
    'usgs-seismic': {
      name: 'usgs_seismic',
      description: 'Fetch USGS significant earthquakes from the past 30 days.',
      input_schema: { type: 'object', properties: {}, required: [] },
    },
    'gwosc-gw-catalog': {
      name: 'gwosc_gw_catalog',
      description: 'Fetch confirmed gravitational wave events from the GWOSC GWTC catalog.',
      input_schema: { type: 'object', properties: {}, required: [] },
    },
    'meeus-lunar': {
      name: 'meeus_lunar',
      description: 'Compute lunar phase, illumination, and elongation using Meeus (1998) algorithms. No network call.',
      input_schema: {
        type: 'object',
        properties: { date: { type: 'string', description: 'ISO date string; defaults to now.' } },
        required: [],
      },
    },
    'arxiv-search': {
      name: 'arxiv_search',
      description: 'Search arXiv for papers by keyword. Returns title, abstract, publication date.',
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search terms.' },
          max_results: { type: 'integer', description: 'Max results (1–10).' },
        },
        required: ['query'],
      },
    },
    'starwell-observer-environment': {
      name: 'starwell_observer_environment',
      description: 'Aggregate all live Earth signal channels (solar wind, Kp, seismic, lunar) into a single environment packet.',
      input_schema: { type: 'object', properties: {}, required: [] },
    },
    'graph-query': {
      name: 'graph_query',
      description: 'Query the Hearthfire knowledge graph. Supports node lookup by ID, type/world filter, and multi-hop traversal.',
      input_schema: {
        type: 'object',
        properties: {
          mode: { type: 'string', enum: ['get', 'query', 'traverse'], description: 'Operation mode.' },
          id: { type: 'string', description: 'Node ID (for get/traverse).' },
          type: { type: 'string', description: 'Node type filter.' },
          world_id: { type: 'string', description: 'World scope filter.' },
          edge_types: { type: 'array', items: { type: 'string' }, description: 'Edge types to follow (traverse).' },
          max_hops: { type: 'integer', description: 'Max traversal depth (default 4).' },
          direction: { type: 'string', enum: ['in', 'out', 'both'], description: 'Traversal direction.' },
          limit: { type: 'integer', description: 'Max results.' },
        },
        required: ['mode'],
      },
    },
    'bm25-search': {
      name: 'bm25_search',
      description: 'Keyword search over the Hearthfire graph using SQLite FTS5 BM25 ranking.',
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search terms.' },
          world_id: { type: 'string', description: 'World scope filter.' },
          type: { type: 'string', description: 'Node type filter.' },
          limit: { type: 'integer', description: 'Max results.' },
        },
        required: ['query'],
      },
    },
    'vector-search': {
      name: 'vector_search',
      description: 'Semantic similarity search over Hearthfire embedded documents using cosine similarity.',
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Natural language query.' },
          world_id: { type: 'string', description: 'World scope filter.' },
          source_type: { type: 'string', description: 'Document type filter.' },
          limit: { type: 'integer', description: 'Max results.' },
        },
        required: ['query'],
      },
    },
    'discover-tools': {
      name: 'discover_tools',
      description: 'Find relevant tools for a query using semantic similarity over tool descriptions.',
      input_schema: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Task or question to match tools against.' } },
        required: ['query'],
      },
    },
  };
  return defs[toolId] || null;
}

// Execute a tool call from Claude
async function executeTool(toolName, toolInput, { graphStore, vectorStore }) {
  switch (toolName) {
    case 'noaa_solar_wind': return liveTools.noaaSolarWind();
    case 'noaa_kp': return liveTools.noaaKp();
    case 'noaa_sunspots': return liveTools.noaaSunspots();
    case 'usgs_seismic': return liveTools.usgsSeismic();
    case 'gwosc_gw_catalog': return liveTools.gwoscCatalog();
    case 'meeus_lunar': return liveTools.meeusLunar(toolInput.date);
    case 'arxiv_search': return liveTools.arxivSearch(toolInput);
    case 'starwell_observer_environment': return liveTools.observerEnvironment();
    case 'graph_query':
      if (!graphStore) return { error: 'graph-not-available' };
      if (toolInput.mode === 'get') return { node: graphStore.getNode(toolInput.id) };
      if (toolInput.mode === 'traverse') return { nodes: graphStore.traverse({ start_id: toolInput.id, edge_types: toolInput.edge_types, max_hops: toolInput.max_hops, direction: toolInput.direction }) };
      return { nodes: graphStore.queryNodes({ type: toolInput.type, world_id: toolInput.world_id, limit: toolInput.limit }) };
    case 'bm25_search':
      if (!graphStore) return { error: 'graph-not-available' };
      return { results: graphStore.bm25Search(toolInput) };
    case 'vector_search':
      if (!vectorStore) return { error: 'vector-store-not-available' };
      return { results: await vectorStore.similaritySearch(toolInput) };
    case 'discover_tools':
      if (!vectorStore) return { error: 'vector-store-not-available' };
      return { tools: await vectorStore.discoverTools(toolInput) };
    default:
      return { error: `unknown-tool: ${toolName}` };
  }
}

function createAgentRouter({ graphStore, vectorStore }) {
  const router = express.Router();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // List all recipes with their status
  router.get('/recipes', (_req, res) => {
    const { recipes, error } = loadRegistry();
    res.json({ ok: true, count: recipes.length, recipes: recipes.map(r => ({
      recipeId: r.recipeId, version: r.version, status: r.status, purpose: r.purpose,
      allowedTools: r.allowedTools, worldScope: r.worldScope,
      toolsAvailable: (r.allowedTools || []).filter(t => IMPLEMENTED_TOOLS.has(t)),
      toolsMissing: (r.allowedTools || []).filter(t => !IMPLEMENTED_TOOLS.has(t)),
    })), error });
  });

  // List all tools with implementation status
  router.get('/tools', (_req, res) => {
    const { tools } = loadRegistry();
    res.json({ ok: true, tools: tools.map(t => ({
      ...t, implemented: IMPLEMENTED_TOOLS.has(t.id),
    })) });
  });

  // Run a recipe
  router.post('/run', async (req, res) => {
    const { recipeId, query, worldScope, options = {} } = req.body;
    if (!recipeId || !query) return res.status(400).json({ ok: false, error: 'recipeId and query required' });

    const { recipes } = loadRegistry();
    const recipe = recipes.find(r => r.recipeId === recipeId);
    if (!recipe) return res.status(404).json({ ok: false, error: `recipe ${recipeId} not found` });

    // Build tool list from recipe's allowedTools, only include implemented ones
    const toolDefs = (recipe.allowedTools || [])
      .filter(id => IMPLEMENTED_TOOLS.has(id))
      .map(id => toolDefinition(id))
      .filter(Boolean);

    const systemPrompt = `You are a Hearthfire agent executing the "${recipe.recipeId}" recipe.
Purpose: ${recipe.purpose}
${recipe.description ? `Description: ${recipe.description}` : ''}
World scope: ${(worldScope || recipe.worldScope || []).join(', ')}
Claim permissions: ${(recipe.claimPermissions || []).join(', ')}
Max active nodes: ${recipe.maxActiveNodes || 20}

Rules:
- Label every substantive claim with its epistemic status (established-science, active-research, speculative-theory, etc.)
- Do not write to any graph directly — produce patch proposals only unless explicitly authorised.
- Cross-world correspondences must be explicitly marked, never silently merged.
- When finished, produce a JSON evidence packet with fields: summary, claimsSupported, epistemicStatus, sources, patchProposals.`;

    const messages = [{ role: 'user', content: query }];
    const maxIterations = options.maxIterations || 8;
    let iterations = 0;
    let finalText = '';

    try {
      while (iterations < maxIterations) {
        iterations++;
        const response = await anthropic.messages.create({
          model: options.model || 'claude-sonnet-4-6',
          max_tokens: options.maxTokens || 4096,
          system: systemPrompt,
          tools: toolDefs.length ? toolDefs : undefined,
          messages,
        });

        messages.push({ role: 'assistant', content: response.content });

        if (response.stop_reason === 'end_turn' || !toolDefs.length) {
          finalText = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
          break;
        }

        if (response.stop_reason === 'tool_use') {
          const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
          const toolResults = await Promise.allSettled(
            toolUseBlocks.map(b => executeTool(b.name, b.input, { graphStore, vectorStore }))
          );
          messages.push({
            role: 'user',
            content: toolUseBlocks.map((b, i) => ({
              type: 'tool_result',
              tool_use_id: b.id,
              content: JSON.stringify(
                toolResults[i].status === 'fulfilled' ? toolResults[i].value : { error: toolResults[i].reason?.message }
              ),
            })),
          });
        } else {
          finalText = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
          break;
        }
      }

      res.json({ ok: true, recipeId, iterations, result: finalText, messageCount: messages.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── Graph endpoints ────────────────────────────────────────────────────────

  router.get('/graph/stats', (_req, res) => {
    try { res.json({ ok: true, ...graphStore.stats() }); }
    catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.post('/graph/nodes', (req, res) => {
    try { res.status(201).json({ ok: true, node: graphStore.upsertNode(req.body) }); }
    catch (e) { res.status(400).json({ ok: false, error: e.message }); }
  });

  router.get('/graph/nodes', (req, res) => {
    try {
      const { type, world_id, ids, limit } = req.query;
      res.json({ ok: true, nodes: graphStore.queryNodes({ type, world_id, ids: ids ? ids.split(',') : undefined, limit: limit ? parseInt(limit, 10) : 20 }) });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.get('/graph/nodes/:id', (req, res) => {
    const node = graphStore.getNode(req.params.id);
    res.status(node ? 200 : 404).json(node ? { ok: true, node } : { ok: false, error: 'not-found' });
  });

  router.delete('/graph/nodes/:id', (req, res) => {
    const deleted = graphStore.deleteNode(req.params.id);
    res.json({ ok: deleted });
  });

  router.post('/graph/edges', (req, res) => {
    try { res.status(201).json({ ok: true, edge: graphStore.addEdge(req.body) }); }
    catch (e) { res.status(400).json({ ok: false, error: e.message }); }
  });

  router.post('/graph/search', (req, res) => {
    try { res.json({ ok: true, results: graphStore.bm25Search(req.body) }); }
    catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.post('/graph/traverse', (req, res) => {
    try { res.json({ ok: true, nodes: graphStore.traverse(req.body) }); }
    catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // ── Vector endpoints ───────────────────────────────────────────────────────

  router.get('/vector/stats', (_req, res) => {
    try { res.json({ ok: true, ...vectorStore.stats() }); }
    catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.post('/vector/documents', async (req, res) => {
    try { res.status(201).json({ ok: true, ...(await vectorStore.addDocument(req.body)) }); }
    catch (e) { res.status(400).json({ ok: false, error: e.message }); }
  });

  router.post('/vector/search', async (req, res) => {
    try { res.json({ ok: true, results: await vectorStore.similaritySearch(req.body) }); }
    catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.post('/vector/discover-tools', async (req, res) => {
    try { res.json({ ok: true, tools: await vectorStore.discoverTools(req.body) }); }
    catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // ── Observer environment (for tool compatibility) ──────────────────────────

  router.get('/environment', async (_req, res) => {
    try { res.json({ ok: true, ...(await liveTools.observerEnvironment()) }); }
    catch (e) { res.status(503).json({ ok: false, error: e.message }); }
  });

  return router;
}

module.exports = { createAgentRouter };
