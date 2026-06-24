import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CANONICAL_MEMORY_ROOT = path.resolve(__dirname, '..', 'memory', 'canonical');
const CONTEXT_PATH = path.join(CANONICAL_MEMORY_ROOT, 'context.md');
const TIMELINE_PATH = path.join(CANONICAL_MEMORY_ROOT, 'timeline.md');

const allowedSignalTypes = new Set([
  'note',
  'build',
  'test',
  'blocked',
  'decision',
  'review',
  'memory',
  'kernel',
]);

function safeSignalType(signalType) {
  const normalized = String(signalType ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

  if (!normalized || !allowedSignalTypes.has(normalized)) {
    return null;
  }

  return normalized;
}

function sanitizeMarkdownLine(value) {
  return String(value ?? '')
    .replace(/\r?\n/g, ' ')
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*\*/g, '')
    .trim()
    .slice(0, 1000);
}

function buildTimelineEntry({ signalType, note }) {
  const safeType = safeSignalType(signalType);
  const safeNote = sanitizeMarkdownLine(note);

  if (!safeType || !safeNote) {
    return { error: 'Invalid signal tracking parameters.' };
  }

  const exactTimestamp = new Date().toISOString();
  const markdownLine = [
    '',
    `### [${exactTimestamp}] — SIG_${safeType.toUpperCase()}`,
    `- Context: ${safeNote}`,
    '- State: Staged to workbench review panel.',
    '',
  ].join('\n');

  return {
    exactTimestamp,
    signalType: safeType,
    markdownLine,
  };
}

function hasValidHumanCommitToken(req) {
  const expectedToken = process.env.HUMAN_COMMIT_TOKEN;
  const suppliedToken = req.get('x-human-commit-token');

  return Boolean(expectedToken && suppliedToken && suppliedToken === expectedToken);
}

export const memoryController = {
  getContext: async (req, res, next) => {
    try {
      const data = await fs.readFile(CONTEXT_PATH, 'utf-8');
      const modeMatch = data.match(/- Interface Mode:\s*([^\n\r]+)/);
      const securityMatch = data.match(/- Security Strategy:\s*([^\n\r]+)/);
      const constraintMatch = data.match(/- Strict Constraint:\s*([^\n\r]+)/);

      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({
        ok: true,
        source: 'starwell-server/memory/context.md',
        rawText: data,
        parsedMetadata: {
          interfaceMode: modeMatch ? modeMatch[1].trim() : 'unknown',
          securityStrategy: securityMatch ? securityMatch[1].trim() : 'unknown',
          strictConstraint: constraintMatch ? constraintMatch[1].trim() : 'unknown',
        },
      });
    } catch (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ ok: false, error: 'Canonical memory file template missing.' });
      }
      next(err);
    }
  },

  getTimeline: async (req, res, next) => {
    try {
      const data = await fs.readFile(TIMELINE_PATH, 'utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({
        ok: true,
        source: 'starwell-server/memory/timeline.md',
        rawText: data,
      });
    } catch (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ ok: false, error: 'Canonical timeline file template missing.' });
      }
      next(err);
    }
  },

  stageSessionSignal: async (req, res) => {
    const result = buildTimelineEntry(req.body);

    if (result.error) {
      return res.status(400).json({ ok: false, error: result.error });
    }

    return res.status(200).json({
      ok: true,
      message: 'Timeline signal staged. No file was written.',
      staged: {
        signalType: result.signalType,
        exactTimestamp: result.exactTimestamp,
        markdownLine: result.markdownLine,
      },
    });
  },

  commitSessionSignal: async (req, res, next) => {
    if (!hasValidHumanCommitToken(req)) {
      return res.status(403).json({
        ok: false,
        error: 'Human commit token required before appending to canonical timeline.',
      });
    }

    const result = buildTimelineEntry(req.body);

    if (result.error) {
      return res.status(400).json({ ok: false, error: result.error });
    }

    try {
      await fs.appendFile(TIMELINE_PATH, result.markdownLine, 'utf-8');
      console.log('[🌲 MEMORY SYNCHRONIZED]: Logged signal token to text timeline.');

      return res.status(201).json({
        ok: true,
        message: 'Timeline signal appended with human commit token.',
        signalType: result.signalType,
        exactTimestamp: result.exactTimestamp,
      });
    } catch (err) {
      next(err);
    }
  },
};
