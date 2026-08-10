import React, { useEffect, useMemo, useState } from 'react';
import { PROJECT_STORAGE_KEY, normaliseProject } from './glyphStudioIO.js';
import { makeProject } from './glyphStudioModel.js';
import './fontforge-dock.css';

const DEFAULT_API_BASE = 'http://127.0.0.1:3842';
const FORMAT_OPTIONS = ['ttf', 'otf', 'woff', 'woff2'];

function apiBase() {
  return String(import.meta.env.VITE_FONTFORGE_API_URL || DEFAULT_API_BASE).replace(/\/$/, '');
}

function readStoredProject() {
  try {
    const raw = window.localStorage.getItem(PROJECT_STORAGE_KEY);
    return normaliseProject(raw ? JSON.parse(raw) : makeProject());
  } catch {
    return normaliseProject(makeProject());
  }
}

async function readJsonResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { ok: false, error: text || `HTTP ${response.status}` };
  }
}

function absoluteUrl(base, value) {
  if (!value) return null;
  return new URL(value, `${base}/`).toString();
}

export default function FontForgeDock() {
  const base = useMemo(apiBase, []);
  const [open, setOpen] = useState(false);
  const [service, setService] = useState({ state: 'checking', worker: null, message: 'Checking the local compiler…' });
  const [familyName, setFamilyName] = useState(() => readStoredProject().name || 'STARWELL Script');
  const [fullName, setFullName] = useState(() => readStoredProject().name || 'STARWELL Script');
  const [version, setVersion] = useState('1.000');
  const [copyright, setCopyright] = useState('Hearthweave');
  const [formats, setFormats] = useState({ ttf: true, otf: true, woff: false, woff2: false });
  const [compileState, setCompileState] = useState('idle');
  const [preflight, setPreflight] = useState(null);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState('Compilation is explicit and local. Nothing runs until you press Compile.');
  const [previewText, setPreviewText] = useState(() => readStoredProject().glyphs.map((glyph) => glyph.character).filter(Boolean).join(''));

  async function probe() {
    setService({ state: 'checking', worker: null, message: 'Checking the local compiler…' });
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 3500);
      const response = await fetch(`${base}/api/fontforge/status`, { signal: controller.signal, cache: 'no-store' });
      window.clearTimeout(timer);
      const payload = await readJsonResponse(response);
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      const ready = Boolean(payload.worker?.available);
      setService({
        state: ready ? 'ready' : 'package-only',
        worker: payload.worker || null,
        message: ready ? 'FontForge is detected and compile-ready.' : (payload.worker?.reason || 'Worker is running, but FontForge is not installed.'),
      });
    } catch (error) {
      setService({
        state: 'offline',
        worker: null,
        message: `Local compiler service is not reachable at ${base}. ${error.name === 'AbortError' ? 'The check timed out.' : error.message}`,
      });
    }
  }

  useEffect(() => {
    probe();
    const openForge = () => { setOpen(true); window.setTimeout(() => validate(), 0); };
    window.addEventListener('starwell:open-fontforge', openForge);
    return () => window.removeEventListener('starwell:open-fontforge', openForge);
  }, []);

  async function validate(project = readStoredProject()) {
    setCompileState('validating');
    setMessage(`Checking Unicode, metrics, bounds, and layer eligibility for ${project.glyphs.length} glyph${project.glyphs.length === 1 ? '' : 's'}…`);
    try {
      const response = await fetch(`${base}/api/fontforge/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project }),
      });
      const payload = await readJsonResponse(response);
      const report = payload.report || null;
      setPreflight(report);
      setCompileState(report?.ok ? 'validated' : 'invalid');
      setMessage(report?.ok
        ? `Preflight passed with ${report.warnings.length} warning${report.warnings.length === 1 ? '' : 's'}. Review them before compilation.`
        : `Preflight found ${report?.errors?.length || 1} blocking issue${report?.errors?.length === 1 ? '' : 's'}.`);
      return report;
    } catch (error) {
      setCompileState('failed');
      setMessage(`Preflight request failed: ${error.message}`);
      return null;
    }
  }

  async function compile() {
    const project = readStoredProject();
    const selectedFormats = FORMAT_OPTIONS.filter((format) => formats[format]);
    if (!selectedFormats.length) {
      setMessage('Choose at least one font output format.');
      return;
    }

    const report = await validate(project);
    if (!report?.ok) return;
    setCompileState('compiling');
    setResult(null);
    setMessage(`Preparing ${project.glyphs.length} glyph${project.glyphs.length === 1 ? '' : 's'} for local FontForge compilation…`);
    try {
      const response = await fetch(`${base}/api/fontforge/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project,
          options: {
            familyName: familyName.trim() || project.name || 'STARWELL Script',
            fullName: fullName.trim() || familyName.trim() || project.name || 'STARWELL Script',
            version: version.trim() || '1.000',
            copyright: copyright.trim() || 'Hearthweave',
            formats: selectedFormats,
          },
        }),
      });
      const payload = await readJsonResponse(response);
      setResult(payload);
      if (payload.ok) {
        setCompileState('compiled');
        setMessage(`Compiled ${payload.files?.length || 0} downloadable file${payload.files?.length === 1 ? '' : 's'}. Receipts and checksums are ready.`);
      } else if (response.status === 503) {
        setCompileState('package-only');
        setMessage('The job package and outline SVGs were prepared, but FontForge was not found. Install FontForge or set FONTFORGE_PATH, then retry.');
      } else {
        setCompileState('failed');
        setMessage(payload.error || payload.receipt?.errors?.join(' · ') || 'FontForge could not compile this job. Read the receipt for details.');
      }
      await probe();
    } catch (error) {
      setCompileState('failed');
      setMessage(`Compile request failed: ${error.message}`);
    }
  }

  const statusLabel = {
    checking: 'checking',
    ready: 'ready',
    'package-only': 'package only',
    offline: 'offline',
  }[service.state] || service.state;
  const previewFile = result?.files?.find((file) => ['woff2', 'woff', 'ttf', 'otf'].includes(file.format));
  const previewFamily = result?.jobId ? `STARWELLPreview-${String(result.jobId).replace(/[^a-z0-9]/gi, '')}` : null;
  const previewUrl = previewFile ? absoluteUrl(base, previewFile.url) : null;

  return (
    <aside className={`fontforge-dock ${open ? 'open' : ''}`} aria-label="FontForge compiler">
      <button className="fontforge-dock-toggle" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span aria-hidden="true">Ff</span>
        <strong>FontForge</strong>
        <em data-state={service.state}>{statusLabel}</em>
      </button>

      {open && (
        <section className="fontforge-dock-panel">
          <div className="fontforge-dock-heading">
            <div>
              <span>STARWELL local worker</span>
              <h2>Font compiler</h2>
            </div>
            <button type="button" onClick={probe} disabled={service.state === 'checking'}>Refresh</button>
          </div>

          <div className={`fontforge-service-state state-${service.state}`}>
            <strong>{service.message}</strong>
            {service.worker?.version && <span>{service.worker.version}</span>}
            {service.worker?.executable && <code>{service.worker.executable}</code>}
          </div>

          <label className="fontforge-field">
            <span>Font family</span>
            <input value={familyName} onChange={(event) => setFamilyName(event.target.value)} maxLength={96} />
          </label>

          <div className="fontforge-field-grid">
            <label className="fontforge-field"><span>Full name</span><input value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={128} /></label>
            <label className="fontforge-field"><span>Version</span><input value={version} onChange={(event) => setVersion(event.target.value)} maxLength={32} /></label>
          </div>
          <label className="fontforge-field"><span>Copyright / licence credit</span><input value={copyright} onChange={(event) => setCopyright(event.target.value)} maxLength={256} /></label>

          <fieldset className="fontforge-formats">
            <legend>Outputs</legend>
            {FORMAT_OPTIONS.map((format) => (
              <label key={format}>
                <input
                  type="checkbox"
                  checked={formats[format]}
                  onChange={(event) => setFormats((current) => ({ ...current, [format]: event.target.checked }))}
                />
                <span>.{format}</span>
              </label>
            ))}
          </fieldset>

          <div className="fontforge-actions">
            <button type="button" onClick={() => validate()} disabled={compileState === 'compiling' || compileState === 'validating' || service.state === 'offline'}>{compileState === 'validating' ? 'Checking…' : 'Run preflight'}</button>
            <button className="fontforge-compile" type="button" onClick={compile} disabled={compileState === 'compiling' || compileState === 'validating' || service.state === 'offline'}>
              {compileState === 'compiling' ? 'Compiling…' : service.state === 'ready' ? 'Validate & compile' : 'Validate & prepare job'}
            </button>
          </div>

          <p className="fontforge-message" aria-live="polite">{message}</p>

          {preflight && (
            <section className={`fontforge-preflight ${preflight.ok ? 'valid' : 'invalid'}`}>
              <div><strong>{preflight.ok ? 'Preflight passed' : 'Preflight blocked'}</strong><span>{preflight.glyphCount} glyphs · {preflight.kerningPairCount || 0} kerns · {preflight.ligatureCount || 0} ligatures · {preflight.errors.length} errors · {preflight.warnings.length} warnings</span></div>
              {preflight.errors.length > 0 && <details open><summary>Blocking issues</summary><ul>{preflight.errors.map((item, index) => <li key={`${item.code}-${index}`}>{item.message}</li>)}</ul></details>}
              {preflight.warnings.length > 0 && <details><summary>Review warnings</summary><ul>{preflight.warnings.map((item, index) => <li key={`${item.code}-${index}`}>{item.message}</li>)}</ul></details>}
            </section>
          )}

          {result && (
            <div className="fontforge-result">
              <div className="fontforge-result-meta">
                <span>Job</span>
                <code>{result.jobId || 'not created'}</code>
              </div>
              <div className="fontforge-downloads">
                {result.manifestUrl && <a href={absoluteUrl(base, result.manifestUrl)} target="_blank" rel="noreferrer">Job manifest</a>}
                {result.receiptUrl && <a href={absoluteUrl(base, result.receiptUrl)} target="_blank" rel="noreferrer">Compile receipt</a>}
                {(result.files || []).map((file) => (
                  <a key={file.name} href={absoluteUrl(base, file.url)}>
                    {file.name}
                    <small>{Math.max(1, Math.round((file.bytes || 0) / 1024))} KB · {file.sha256?.slice(0, 12) || 'checksum pending'}</small>
                  </a>
                ))}
              </div>
              {result.receipt?.warnings?.length > 0 && (
                <details>
                  <summary>{result.receipt.warnings.length} warning{result.receipt.warnings.length === 1 ? '' : 's'}</summary>
                  <ul>{result.receipt.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
                </details>
              )}
              {previewUrl && <section className="fontforge-compiled-proof">
                <style>{`@font-face{font-family:'${previewFamily}';src:url('${previewUrl}');font-display:swap;}`}</style>
                <label className="fontforge-field"><span>Compiled-font proof</span><textarea value={previewText} onChange={(event) => setPreviewText(event.target.value)} /></label>
                <div style={{ fontFamily: `'${previewFamily}', sans-serif` }}>{previewText || 'Type a proof above.'}</div>
                <small>This proof loads the generated {previewFile.format.toUpperCase()} from the local job. Compare it with the source proof before accepting the build.</small>
              </section>}
            </div>
          )}

          <p className="fontforge-boundary">The worker binds only to this device, writes each job into Hearthgate’s user-data folder, disables FontForge init scripts and plugins, and never compiles silently.</p>
        </section>
      )}
    </aside>
  );
}
