'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ASSET_WATCH_EVENT_SCHEMA = 'flameclyffe.hearthgate.asset-watch-event/v1';

function isPathInside(candidate, root) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function normaliseRoot(value) {
  const root = path.resolve(String(value || ''));
  if (!path.isAbsolute(root)) throw new Error('Asset watcher root must be an absolute path.');
  const stat = fs.statSync(root);
  if (!stat.isDirectory()) throw new Error('Asset watcher root must be a directory.');
  return root;
}

function relativeAlias(root, candidate) {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  if (!isPathInside(resolvedCandidate, resolvedRoot)) return null;
  const relative = path.relative(resolvedRoot, resolvedCandidate).split(path.sep).filter(Boolean).join('/');
  return relative || '.';
}

function metadataForPath(root, candidate, eventType = 'rename', now = new Date().toISOString()) {
  const alias = relativeAlias(root, candidate);
  if (!alias) return null;
  let stat = null;
  try { stat = fs.statSync(candidate); } catch {}
  return Object.freeze({
    schema: ASSET_WATCH_EVENT_SCHEMA,
    event_type: eventType === 'change' ? 'change' : 'rename',
    relative_path_alias: alias,
    name: path.basename(candidate),
    extension: path.extname(candidate).toLowerCase() || null,
    exists: Boolean(stat),
    is_directory: stat ? stat.isDirectory() : null,
    size_bytes: stat?.isFile() ? stat.size : null,
    modified_at: stat ? stat.mtime.toISOString() : null,
    observed_at: now,
    content_read: false,
  });
}

function startMetadataWatcher(rootInput, onEvent, { fsModule = fs } = {}) {
  const root = normaliseRoot(rootInput);
  if (typeof onEvent !== 'function') throw new Error('Asset watcher requires an event callback.');
  const watcher = fsModule.watch(root, { recursive: true, persistent: true }, (eventType, filename) => {
    if (!filename) return;
    const candidate = path.resolve(root, String(filename));
    if (!isPathInside(candidate, root)) return;
    const event = metadataForPath(root, candidate, eventType);
    if (event) onEvent(event);
  });
  return {
    root,
    close() { watcher.close(); },
  };
}

module.exports = {
  ASSET_WATCH_EVENT_SCHEMA,
  isPathInside,
  metadataForPath,
  normaliseRoot,
  relativeAlias,
  startMetadataWatcher,
};
