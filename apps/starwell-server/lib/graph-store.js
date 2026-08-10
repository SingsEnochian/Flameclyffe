'use strict';

const path = require('path');
const Database = require('better-sqlite3');

function createGraphStore({ dataDir }) {
  const dbPath = path.join(dataDir, 'hearthfire-graph.sqlite3');
  let db = null;

  function open() {
    if (db) return db;
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.exec(`
      CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        label TEXT NOT NULL,
        world_id TEXT NOT NULL DEFAULT 'earth',
        canonical_status TEXT NOT NULL DEFAULT 'working',
        epistemic_status TEXT NOT NULL DEFAULT 'established-science',
        properties TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS nodes_type ON nodes(type);
      CREATE INDEX IF NOT EXISTS nodes_world ON nodes(world_id);

      CREATE TABLE IF NOT EXISTS edges (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        type TEXT NOT NULL,
        weight REAL NOT NULL DEFAULT 1.0,
        properties TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY(source_id) REFERENCES nodes(id),
        FOREIGN KEY(target_id) REFERENCES nodes(id)
      );
      CREATE INDEX IF NOT EXISTS edges_source ON edges(source_id);
      CREATE INDEX IF NOT EXISTS edges_target ON edges(target_id);
      CREATE INDEX IF NOT EXISTS edges_type ON edges(type);

      CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(
        node_id UNINDEXED,
        label,
        type,
        world_id,
        body
      );
    `);
    return db;
  }

  function parseNode(row) {
    if (!row) return null;
    return { ...row, properties: JSON.parse(row.properties || '{}') };
  }

  function upsertNode({ id, type, label, world_id = 'earth', canonical_status = 'working', epistemic_status = 'established-science', properties = {} }) {
    const d = open();
    const props = JSON.stringify(properties);
    const body = [label, type, ...Object.values(properties).map(String)].join(' ');
    const exists = d.prepare('SELECT 1 FROM nodes WHERE id = ?').get(id);
    if (exists) {
      d.prepare(`UPDATE nodes SET type=?,label=?,world_id=?,canonical_status=?,epistemic_status=?,properties=?,updated_at=datetime('now') WHERE id=?`)
        .run(type, label, world_id, canonical_status, epistemic_status, props, id);
      d.prepare(`DELETE FROM nodes_fts WHERE node_id=?`).run(id);
    } else {
      d.prepare(`INSERT INTO nodes(id,type,label,world_id,canonical_status,epistemic_status,properties) VALUES(?,?,?,?,?,?,?)`)
        .run(id, type, label, world_id, canonical_status, epistemic_status, props);
    }
    d.prepare(`INSERT INTO nodes_fts(node_id,label,type,world_id,body) VALUES(?,?,?,?,?)`).run(id, label, type, world_id, body);
    return getNode(id);
  }

  function getNode(id) {
    return parseNode(open().prepare('SELECT * FROM nodes WHERE id=?').get(id));
  }

  function deleteNode(id) {
    const d = open();
    d.prepare('DELETE FROM nodes_fts WHERE node_id=?').run(id);
    d.prepare('DELETE FROM edges WHERE source_id=? OR target_id=?').run(id, id);
    const info = d.prepare('DELETE FROM nodes WHERE id=?').run(id);
    return info.changes > 0;
  }

  function addEdge({ source_id, target_id, type, weight = 1.0, properties = {} }) {
    const d = open();
    const id = `${source_id}--${type}--${target_id}`;
    d.prepare(`INSERT OR REPLACE INTO edges(id,source_id,target_id,type,weight,properties) VALUES(?,?,?,?,?,?)`)
      .run(id, source_id, target_id, type, weight, JSON.stringify(properties));
    return { id, source_id, target_id, type, weight };
  }

  function queryNodes({ type, world_id, ids, limit = 20 } = {}) {
    let sql = 'SELECT * FROM nodes WHERE 1=1';
    const params = [];
    if (type) { sql += ' AND type=?'; params.push(type); }
    if (world_id) { sql += ' AND world_id=?'; params.push(world_id); }
    if (ids?.length) { sql += ` AND id IN (${ids.map(() => '?').join(',')})`; params.push(...ids); }
    sql += ' ORDER BY updated_at DESC LIMIT ?';
    params.push(Math.min(limit, 200));
    return open().prepare(sql).all(...params).map(parseNode);
  }

  function bm25Search({ query, world_id, type, limit = 20 }) {
    if (!query?.trim()) return [];
    const d = open();
    let fts = 'SELECT node_id, bm25(nodes_fts) AS score FROM nodes_fts WHERE nodes_fts MATCH ? ORDER BY rank LIMIT ?';
    let rows;
    try {
      rows = d.prepare(fts).all(query, Math.min(limit * 3, 200));
    } catch {
      return [];
    }
    const nodeIds = rows.map(r => r.node_id);
    if (!nodeIds.length) return [];
    let sql = `SELECT * FROM nodes WHERE id IN (${nodeIds.map(() => '?').join(',')})`;
    const params = [...nodeIds];
    if (world_id) { sql += ' AND world_id=?'; params.push(world_id); }
    if (type) { sql += ' AND type=?'; params.push(type); }
    const nodes = d.prepare(sql).all(...params).map(parseNode);
    const scoreMap = Object.fromEntries(rows.map(r => [r.node_id, r.score]));
    return nodes.sort((a, b) => (scoreMap[a.id] || 0) - (scoreMap[b.id] || 0)).slice(0, limit);
  }

  function getEdges({ node_id, direction = 'both', types, limit = 50 }) {
    const d = open();
    const params = [];
    let sql;
    if (direction === 'out') {
      sql = 'SELECT * FROM edges WHERE source_id=?'; params.push(node_id);
    } else if (direction === 'in') {
      sql = 'SELECT * FROM edges WHERE target_id=?'; params.push(node_id);
    } else {
      sql = 'SELECT * FROM edges WHERE source_id=? OR target_id=?'; params.push(node_id, node_id);
    }
    if (types?.length) { sql += ` AND type IN (${types.map(() => '?').join(',')})`; params.push(...types); }
    sql += ' LIMIT ?'; params.push(Math.min(limit, 500));
    return d.prepare(sql).all(...params).map(r => ({ ...r, properties: JSON.parse(r.properties || '{}') }));
  }

  function traverse({ start_id, edge_types, max_hops = 4, direction = 'out', limit = 50 }) {
    const visited = new Set();
    const results = [];
    const queue = [{ id: start_id, depth: 0 }];
    while (queue.length && results.length < limit) {
      const { id, depth } = queue.shift();
      if (visited.has(id)) continue;
      visited.add(id);
      const node = getNode(id);
      if (node) results.push({ ...node, depth });
      if (depth < max_hops) {
        const edges = getEdges({ node_id: id, direction, types: edge_types, limit: 100 });
        for (const e of edges) {
          const next = direction === 'in' ? e.source_id : e.target_id;
          if (!visited.has(next)) queue.push({ id: next, depth: depth + 1 });
        }
      }
    }
    return results;
  }

  function stats() {
    const d = open();
    return {
      nodeCount: d.prepare('SELECT COUNT(*) as c FROM nodes').get().c,
      edgeCount: d.prepare('SELECT COUNT(*) as c FROM edges').get().c,
      worldBreakdown: d.prepare('SELECT world_id, COUNT(*) as count FROM nodes GROUP BY world_id ORDER BY count DESC').all(),
      typeBreakdown: d.prepare('SELECT type, COUNT(*) as count FROM nodes GROUP BY type ORDER BY count DESC LIMIT 20').all(),
    };
  }

  return { upsertNode, getNode, deleteNode, addEdge, queryNodes, bm25Search, getEdges, traverse, stats };
}

module.exports = { createGraphStore };
