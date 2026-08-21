import React, { useMemo, useState } from 'react';
import {
  DEFAULT_PROJECT_ZERO_THEME,
  exportProjectZeroTheme,
  importProjectZeroTheme,
  saveProjectZeroTheme,
} from './themeEngine.js';

const COLOUR_TOKENS = [
  ['bg', 'Background'], ['bgAlt', 'Background alt'], ['panel', 'Panel'], ['panelRaised', 'Raised panel'],
  ['input', 'Input'], ['line', 'Line'], ['text', 'Text'], ['muted', 'Muted text'], ['accent', 'Accent'],
  ['accentSecondary', 'Secondary'], ['accentCool', 'Cool accent'], ['accentViolet', 'Violet'], ['danger', 'Danger'], ['success', 'Success'],
];

export default function ThemeStudio({ theme, onChange }) {
  const [jsonDraft, setJsonDraft] = useState('');
  const [message, setMessage] = useState('Theme changes apply to the Flameclyffe Project Zero Companion surfaces.');
  const tokens = theme.tokens;
  const exportText = useMemo(() => exportProjectZeroTheme(theme), [theme]);

  function patchToken(key, value) {
    const saved = saveProjectZeroTheme({ ...theme, tokens: { ...tokens, [key]: value } });
    onChange(saved);
  }
  function patchTheme(field, value) { const saved = saveProjectZeroTheme({ ...theme, [field]: value }); onChange(saved); }
  function copyTheme() { void navigator.clipboard?.writeText(exportText); setMessage('Companion theme JSON copied.'); }
  function loadTheme() {
    try {
      const saved = saveProjectZeroTheme(importProjectZeroTheme(jsonDraft));
      onChange(saved);
      setMessage(`Loaded Companion theme “${saved.name}”.`);
    } catch (error) { setMessage(`Theme import stopped: ${error.message}`); }
  }
  function resetTheme() {
    const saved = saveProjectZeroTheme(DEFAULT_PROJECT_ZERO_THEME);
    onChange(saved);
    setJsonDraft('');
    setMessage('Companion theme reset to Hearthglass.');
  }

  return (
    <section className="panel theme-studio" id="theme-studio">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Flameclyffe Companion bridge · theme interoperability</p>
          <h2>Theme Studio</h2>
          <p className="small">These tokens theme our Companion and cooperative bridge surfaces. Nocturne's Project Zero remains authoritative over its own native theme system and may consume these tokens only through an agreed connector.</p>
        </div>
        <div className="theme-name-block"><label><span>Theme name</span><input value={theme.name} onChange={(event) => patchTheme('name', event.target.value)} /></label></div>
      </div>

      <div className="theme-colour-grid">
        {COLOUR_TOKENS.map(([key, label]) => (
          <label className="colour-token" key={key}><span>{label}</span><div className="colour-control"><input type="color" value={tokens[key]} onChange={(event) => patchToken(key, event.target.value)} /><code>{tokens[key]}</code></div></label>
        ))}
      </div>

      <div className="grid three theme-measures">
        <label><span>Panel radius · {tokens.radiusPanel}px</span><input type="range" min="0" max="48" value={tokens.radiusPanel} onChange={(event) => patchToken('radiusPanel', Number(event.target.value))} /></label>
        <label><span>Control radius · {tokens.radiusControl}px</span><input type="range" min="0" max="30" value={tokens.radiusControl} onChange={(event) => patchToken('radiusControl', Number(event.target.value))} /></label>
        <label><span>Density · {Number(tokens.density).toFixed(2)}</span><input type="range" min="0.72" max="1.35" step="0.01" value={tokens.density} onChange={(event) => patchToken('density', Number(event.target.value))} /></label>
      </div>

      <div className="grid three">
        <label><span>UI font stack</span><input value={tokens.fontUi} onChange={(event) => patchToken('fontUi', event.target.value)} /></label>
        <label><span>Reading font stack</span><input value={tokens.fontReading} onChange={(event) => patchToken('fontReading', event.target.value)} /></label>
        <label><span>Mono font stack</span><input value={tokens.fontMono} onChange={(event) => patchToken('fontMono', event.target.value)} /></label>
      </div>

      <label><span>Custom CSS · advanced</span><textarea className="theme-css" value={theme.custom_css} onChange={(event) => patchTheme('custom_css', event.target.value)} placeholder="#root { ... }\n.flame-message[data-voice-id='altair'] { ... }" /></label>
      <details className="theme-json-drawer"><summary>Import / export Companion theme JSON</summary><textarea value={jsonDraft} onChange={(event) => setJsonDraft(event.target.value)} placeholder={exportText} /><div className="actions"><button type="button" onClick={loadTheme}>Load JSON</button><button type="button" onClick={copyTheme}>Copy current JSON</button><button type="button" onClick={resetTheme}>Reset theme</button></div></details>
      <p className="status">{message}</p>
    </section>
  );
}
