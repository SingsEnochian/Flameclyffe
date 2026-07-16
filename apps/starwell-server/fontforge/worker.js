'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const JOB_SCHEMA = 'starwell.fontforge.job.v0.2';
const RECEIPT_SCHEMA = 'starwell.fontforge.receipt.v0.2';
const EM_SIZE = 1000;
const ASCENT = 760;
const DESCENT = 240;
const MAX_GLYPHS = 2048;
const MAX_POINTS = 1_000_000;
const ALLOWED_FORMATS = new Set(['ttf', 'otf', 'woff', 'woff2']);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value)));
}

function safeFileName(value, fallback = 'starwell-font') {
  return String(value || fallback)
    .trim()
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96) || fallback;
}

function safeFontName(value, fallback = 'STARWELLFont') {
  const cleaned = String(value || fallback).replace(/[^a-z0-9]+/gi, '').slice(0, 63);
  return cleaned || fallback;
}

function escapeXml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function pointWidth(stroke, point, index) {
  const brush = stroke.brush || {};
  const points = Array.isArray(stroke.points) ? stroke.points : [];
  const pressure = clamp(point?.pressure ?? 0.5, brush.minPressure ?? 0.08, 1);
  const response = clamp(brush.pressureSize ?? 0, 0, 1);
  const base = clamp(brush.size ?? 20, 1, 800);
  const progress = points.length > 1 ? index / (points.length - 1) : 0.5;
  const start = clamp(brush.taperStart ?? 0, 0, 1);
  const end = clamp(brush.taperEnd ?? 0, 0, 1);
  const startScale = start > 0 ? clamp(progress / start, 0.08, 1) : 1;
  const endScale = end > 0 ? clamp((1 - progress) / end, 0.08, 1) : 1;
  return Math.max(1, base * ((1 - response) + response * pressure) * Math.min(startScale, endScale));
}

function eligibleLayer(layer) {
  return Boolean(
    layer
    && layer.kind === 'vector'
    && layer.visible !== false
    && !layer.private
    && !layer.reference
    && !layer.maskOf
    && !layer.clippingMask
    && (layer.blendMode || 'normal') === 'normal'
    && Number(layer.opacity ?? 1) > 0,
  );
}

function excludedLayerReason(layer) {
  if (layer.kind !== 'vector') return `${layer.kind || 'unknown'} layers are art-only`;
  if (layer.visible === false) return 'layer is hidden';
  if (layer.private) return 'layer is private';
  if (layer.reference) return 'layer is a reference';
  if (layer.maskOf) return 'layer is a mask';
  if (layer.clippingMask) return 'layer is a clipping mask';
  if ((layer.blendMode || 'normal') !== 'normal') return 'non-normal blend mode requires flattening';
  if (Number(layer.opacity ?? 1) <= 0) return 'layer opacity is zero';
  return 'layer is not eligible for outline compilation';
}

function circleMarkup(point, radius) {
  return `<circle cx="${Number(point.x).toFixed(3)}" cy="${Number(point.y).toFixed(3)}" r="${Number(radius).toFixed(3)}" />`;
}

function segmentPolygon(previous, point, startWidth, endWidth) {
  const dx = Number(point.x) - Number(previous.x);
  const dy = Number(point.y) - Number(previous.y);
  const length = Math.hypot(dx, dy);
  if (!Number.isFinite(length) || length < 0.001) return null;
  const nx = -dy / length;
  const ny = dx / length;
  const a = { x: Number(previous.x) + nx * startWidth / 2, y: Number(previous.y) + ny * startWidth / 2 };
  const b = { x: Number(point.x) + nx * endWidth / 2, y: Number(point.y) + ny * endWidth / 2 };
  const c = { x: Number(point.x) - nx * endWidth / 2, y: Number(point.y) - ny * endWidth / 2 };
  const d = { x: Number(previous.x) - nx * startWidth / 2, y: Number(previous.y) - ny * startWidth / 2 };
  return `<polygon points="${[a, b, c, d].map((entry) => `${entry.x.toFixed(3)},${entry.y.toFixed(3)}`).join(' ')}" />`;
}

function glyphOutlineSvg(glyph) {
  const layers = Array.isArray(glyph?.layers) ? glyph.layers : [];
  const eligibleIds = new Set(layers.filter(eligibleLayer).map((layer) => layer.id));
  const strokes = (Array.isArray(glyph?.strokes) ? glyph.strokes : [])
    .filter((stroke) => eligibleIds.has(stroke.layerId) && Array.isArray(stroke.points) && stroke.points.length);
  const shapes = [];

  for (const stroke of strokes) {
    if (stroke.points.length === 1) {
      const width = pointWidth(stroke, stroke.points[0], 0);
      shapes.push(circleMarkup(stroke.points[0], width / 2));
      continue;
    }

    stroke.points.forEach((point, index) => {
      const width = pointWidth(stroke, point, index);
      shapes.push(circleMarkup(point, width / 2));
      if (index === 0) return;
      const previous = stroke.points[index - 1];
      const previousWidth = pointWidth(stroke, previous, index - 1);
      const polygon = segmentPolygon(previous, point, previousWidth, width);
      if (polygon) shapes.push(polygon);
    });
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${EM_SIZE}" height="${EM_SIZE}" viewBox="0 -${DESCENT} ${EM_SIZE} ${EM_SIZE}">\n  <title>${escapeXml(glyph?.name || 'STARWELL glyph')}</title>\n  <metadata>${escapeXml(JSON.stringify({ schemaVersion: JOB_SCHEMA, glyphId: glyph?.id, codepoint: glyph?.codepoint, baseline: ASCENT }))}</metadata>\n  <g fill="#000000" fill-rule="nonzero" transform="translate(0 ${ASCENT}) scale(1 -1)">\n    ${shapes.join('\n    ')}\n  </g>\n</svg>\n`;
}

function parseCodepoint(value) {
  const normalized = String(value || '').replace(/^U\+/i, '').trim();
  if (!/^[0-9a-f]{1,6}$/i.test(normalized)) throw new Error(`Invalid Unicode codepoint: ${value}`);
  const codepoint = Number.parseInt(normalized, 16);
  if (codepoint > 0x10ffff || (codepoint >= 0xd800 && codepoint <= 0xdfff)) {
    throw new Error(`Unicode codepoint is outside the scalar range: ${value}`);
  }
  return { number: codepoint, hex: codepoint.toString(16).toUpperCase() };
}

function buildFontJob(project, options = {}) {
  if (!project || !Array.isArray(project.glyphs) || !project.glyphs.length) {
    throw new Error('A STARWELL glyph project with at least one glyph is required.');
  }
  if (project.glyphs.length > MAX_GLYPHS) throw new Error(`Projects are limited to ${MAX_GLYPHS} glyphs per compile job.`);

  const familyName = String(options.familyName || project.name || 'STARWELL Script').trim().slice(0, 96) || 'STARWELL Script';
  const fontName = safeFontName(options.fontName || familyName);
  const formats = [...new Set((Array.isArray(options.formats) ? options.formats : ['ttf', 'otf'])
    .map((format) => String(format).toLowerCase())
    .filter((format) => ALLOWED_FORMATS.has(format)))];
  if (!formats.length) formats.push('ttf');

  const seenCodepoints = new Set();
  let totalPoints = 0;
  const glyphs = project.glyphs.map((glyph, index) => {
    const codepoint = parseCodepoint(glyph.codepoint || (0xe000 + index).toString(16));
    if (seenCodepoints.has(codepoint.number)) throw new Error(`Duplicate codepoint U+${codepoint.hex}.`);
    seenCodepoints.add(codepoint.number);

    const layers = Array.isArray(glyph.layers) ? glyph.layers : [];
    const eligibleIds = new Set(layers.filter(eligibleLayer).map((layer) => layer.id));
    const strokes = (Array.isArray(glyph.strokes) ? glyph.strokes : []).filter((stroke) => eligibleIds.has(stroke.layerId));
    const pointCount = strokes.reduce((sum, stroke) => sum + (Array.isArray(stroke.points) ? stroke.points.length : 0), 0);
    totalPoints += pointCount;
    const glyphName = codepoint.number <= 0xffff
      ? `uni${codepoint.hex.padStart(4, '0')}`
      : `u${codepoint.hex}`;

    return {
      id: String(glyph.id || `glyph-${index + 1}`),
      name: String(glyph.name || glyphName),
      glyphName,
      character: String(glyph.character || ''),
      codepoint: codepoint.hex,
      codepointNumber: codepoint.number,
      advanceWidth: clamp(glyph.advanceWidth || EM_SIZE, 0, 4000),
      leftBearing: clamp(glyph.leftBearing || 0, -2000, 2000),
      rightBearing: clamp(glyph.rightBearing || 0, -2000, 2000),
      outlineFile: `${String(index + 1).padStart(4, '0')}-${glyphName}.svg`,
      eligibleVectorLayers: layers.filter(eligibleLayer).map((layer) => ({ id: layer.id, name: layer.name })),
      excludedLayers: layers.filter((layer) => !eligibleLayer(layer)).map((layer) => ({
        id: layer.id,
        name: layer.name,
        kind: layer.kind,
        reason: excludedLayerReason(layer),
      })),
      strokeCount: strokes.length,
      pointCount,
    };
  });

  if (totalPoints > MAX_POINTS) throw new Error(`Compile jobs are limited to ${MAX_POINTS.toLocaleString()} captured points.`);

  return {
    schemaVersion: JOB_SCHEMA,
    projectId: String(project.id || ''),
    projectName: String(project.name || familyName),
    familyName,
    fontName,
    fullName: String(options.fullName || familyName).slice(0, 128),
    version: String(options.version || '1.000').slice(0, 32),
    copyright: String(options.copyright || 'Hearthweave').slice(0, 256),
    em: EM_SIZE,
    ascent: ASCENT,
    descent: DESCENT,
    formats,
    glyphs,
    totalPoints,
    createdAt: new Date().toISOString(),
  };
}

function fontForgeCandidates(env = process.env, platform = process.platform) {
  const candidates = [];
  if (env.FONTFORGE_PATH) candidates.push(env.FONTFORGE_PATH);
  if (platform === 'win32') {
    candidates.push(
      'C:\\Program Files\\FontForgeBuilds\\bin\\fontforge.exe',
      'C:\\Program Files (x86)\\FontForgeBuilds\\bin\\fontforge.exe',
      'C:\\Program Files\\FontForge\\bin\\fontforge.exe',
      'fontforge.exe',
      'fontforge',
    );
  } else if (platform === 'darwin') {
    candidates.push(
      '/Applications/FontForge.app/Contents/MacOS/FontForge',
      '/opt/homebrew/bin/fontforge',
      '/usr/local/bin/fontforge',
      '/usr/bin/fontforge',
      'fontforge',
    );
  } else {
    candidates.push('/usr/bin/fontforge', '/usr/local/bin/fontforge', '/snap/bin/fontforge', 'fontforge');
  }
  return [...new Set(candidates.filter(Boolean))];
}

function probeFontForge(executable) {
  try {
    const result = spawnSync(executable, ['-version'], {
      encoding: 'utf8',
      timeout: 5000,
      windowsHide: true,
      env: { ...process.env, FONTFORGE_LOADPREFS: 'Never' },
    });
    if (result.error || result.status !== 0) return null;
    const version = `${result.stdout || ''}\n${result.stderr || ''}`.trim().split(/\r?\n/).filter(Boolean)[0] || 'FontForge';
    return { available: true, executable, version };
  } catch {
    return null;
  }
}

function detectFontForge() {
  for (const candidate of fontForgeCandidates()) {
    const status = probeFontForge(candidate);
    if (status) return status;
  }
  return {
    available: false,
    executable: null,
    version: null,
    reason: 'FontForge was not found. Install it or set FONTFORGE_PATH to the local executable.',
  };
}

const FONTFORGE_PYTHON = String.raw`import hashlib
import json
import os
import sys
import traceback

import fontforge

job_path = os.path.abspath(sys.argv[1])
job_dir = os.path.dirname(job_path)
with open(job_path, "r", encoding="utf-8") as handle:
    job = json.load(handle)

receipt = {
    "schemaVersion": "starwell.fontforge.receipt.v0.2",
    "jobId": job.get("jobId"),
    "status": "running",
    "fontForgeVersion": getattr(fontforge, "version", lambda: "unknown")(),
    "outputs": [],
    "errors": [],
    "warnings": [],
}

try:
    font = fontforge.font()
    font.encoding = "UnicodeFull"
    font.em = int(job.get("em", 1000))
    font.ascent = int(job.get("ascent", 760))
    font.descent = int(job.get("descent", 240))
    font.familyname = job["familyName"]
    font.fontname = job["fontName"]
    font.fullname = job["fullName"]
    font.version = job.get("version", "1.000")
    font.copyright = job.get("copyright", "Hearthweave")

    notdef = font.createChar(-1, ".notdef")
    notdef.width = 500

    codepoints = set()
    for record in job["glyphs"]:
        codepoint = int(record["codepoint"], 16)
        codepoints.add(codepoint)
        glyph = font.createChar(codepoint, record["glyphName"])
        outline_path = os.path.join(job_dir, record["outlineFile"])
        if record.get("strokeCount", 0) > 0:
            glyph.importOutlines(outline_path, scale=False, simplify=True, accuracy=0.25)
            glyph.removeOverlap()
            glyph.correctDirection()
            glyph.round()
        else:
            receipt["warnings"].append("U+%s has no eligible vector strokes and was compiled as a blank glyph." % record["codepoint"])
        glyph.width = int(record.get("advanceWidth", 1000))

    if 0x20 not in codepoints:
        space = font.createChar(0x20, "space")
        space.width = 500

    sfd_name = job["fontName"] + ".sfd"
    sfd_path = os.path.join(job_dir, sfd_name)
    font.save(sfd_path)
    receipt["outputs"].append({"name": sfd_name, "format": "sfd", "status": "generated"})

    for format_name in job.get("formats", ["ttf", "otf"]):
        output_name = job["fontName"] + "." + format_name
        output_path = os.path.join(job_dir, output_name)
        try:
            font.generate(output_path)
            receipt["outputs"].append({"name": output_name, "format": format_name, "status": "generated"})
        except Exception as error:
            receipt["outputs"].append({"name": output_name, "format": format_name, "status": "failed", "error": str(error)})
            receipt["warnings"].append("%s export failed: %s" % (format_name, error))

    font.close()
    generated = [item for item in receipt["outputs"] if item["status"] == "generated" and item["format"] != "sfd"]
    receipt["status"] = "compiled" if generated else "failed"
except Exception as error:
    receipt["status"] = "failed"
    receipt["errors"].append(str(error))
    receipt["traceback"] = traceback.format_exc()

receipt_path = os.path.join(job_dir, "fontforge-receipt.json")
with open(receipt_path, "w", encoding="utf-8") as handle:
    json.dump(receipt, handle, indent=2, ensure_ascii=False)

if receipt["status"] != "compiled":
    sys.exit(2)
`;

function runProcess(executable, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: options.cwd,
      env: options.env,
      windowsHide: true,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`FontForge exceeded the ${options.timeoutMs || 120000}ms compile timeout.`));
    }, options.timeoutMs || 120000);
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

async function hashFile(filePath) {
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(filePath);
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest('hex');
}

async function compileFontProject({ project, options = {}, dataDir, workerStatus = null }) {
  const job = buildFontJob(project, options);
  const jobId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomUUID()}`;
  const workspaceRoot = path.resolve(dataDir || path.join(os.tmpdir(), 'hearthgate-data'), 'fontforge-jobs');
  const jobDir = path.join(workspaceRoot, jobId);
  await fs.promises.mkdir(jobDir, { recursive: true });

  job.jobId = jobId;
  job.status = 'prepared';
  job.worker = workerStatus || detectFontForge();
  for (let index = 0; index < job.glyphs.length; index += 1) {
    const record = job.glyphs[index];
    const sourceGlyph = project.glyphs[index];
    await fs.promises.writeFile(path.join(jobDir, record.outlineFile), glyphOutlineSvg(sourceGlyph), 'utf8');
  }
  const jobPath = path.join(jobDir, 'fontforge-job.json');
  const scriptPath = path.join(jobDir, 'compile-font.py');
  await fs.promises.writeFile(jobPath, JSON.stringify(job, null, 2), 'utf8');
  await fs.promises.writeFile(scriptPath, FONTFORGE_PYTHON, 'utf8');

  if (!job.worker.available) {
    const receipt = {
      schemaVersion: RECEIPT_SCHEMA,
      jobId,
      status: 'worker-unavailable',
      worker: job.worker,
      glyphCount: job.glyphs.length,
      totalPoints: job.totalPoints,
      outputs: [],
      warnings: [job.worker.reason],
      createdAt: new Date().toISOString(),
    };
    await fs.promises.writeFile(path.join(jobDir, 'fontforge-receipt.json'), JSON.stringify(receipt, null, 2), 'utf8');
    return { ok: false, jobId, job, receipt, jobDir };
  }

  const processResult = await runProcess(job.worker.executable, [
    '-skippyfile',
    '-skippyplug',
    '-lang=py',
    '-script',
    scriptPath,
    jobPath,
  ], {
    cwd: jobDir,
    timeoutMs: clamp(options.timeoutMs || 120000, 10000, 300000),
    env: { ...process.env, FONTFORGE_LOADPREFS: 'Never' },
  });

  const receiptPath = path.join(jobDir, 'fontforge-receipt.json');
  let receipt;
  try {
    receipt = JSON.parse(await fs.promises.readFile(receiptPath, 'utf8'));
  } catch {
    receipt = {
      schemaVersion: RECEIPT_SCHEMA,
      jobId,
      status: 'failed',
      outputs: [],
      errors: ['FontForge exited without writing a receipt.'],
    };
  }
  receipt.worker = job.worker;
  receipt.process = {
    exitCode: processResult.code,
    stdout: processResult.stdout.slice(-12000),
    stderr: processResult.stderr.slice(-12000),
  };

  const files = [];
  for (const output of receipt.outputs || []) {
    if (output.status !== 'generated') continue;
    const filePath = path.join(jobDir, path.basename(output.name));
    try {
      const stat = await fs.promises.stat(filePath);
      files.push({
        name: path.basename(output.name),
        format: output.format,
        bytes: stat.size,
        sha256: await hashFile(filePath),
      });
    } catch (error) {
      receipt.warnings = [...(receipt.warnings || []), `${output.name} was reported but could not be read: ${error.message}`];
    }
  }
  receipt.files = files;
  receipt.completedAt = new Date().toISOString();
  await fs.promises.writeFile(receiptPath, JSON.stringify(receipt, null, 2), 'utf8');
  return { ok: receipt.status === 'compiled', jobId, job, receipt, files, jobDir };
}

module.exports = {
  ALLOWED_FORMATS,
  ASCENT,
  DESCENT,
  EM_SIZE,
  FONTFORGE_PYTHON,
  JOB_SCHEMA,
  RECEIPT_SCHEMA,
  buildFontJob,
  compileFontProject,
  detectFontForge,
  eligibleLayer,
  fontForgeCandidates,
  glyphOutlineSvg,
  parseCodepoint,
  safeFileName,
};
