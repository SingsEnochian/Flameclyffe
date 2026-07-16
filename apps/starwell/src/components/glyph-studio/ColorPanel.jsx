import React, { useMemo, useState } from 'react';

const TABS = ['Disc', 'Classic', 'Harmony', 'Value', 'Palettes', 'Profiles'];
const HARMONIES = ['complementary', 'split', 'analogous', 'triadic', 'tetradic'];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex) {
  const clean = String(hex || '#000000').replace('#', '').padEnd(6, '0').slice(0, 6);
  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0')).join('')}`;
}

function rgbToHsl({ r, g, b }) {
  const values = [r, g, b].map((value) => value / 255);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const delta = max - min;
  let h = 0;
  if (delta) {
    if (max === values[0]) h = 60 * (((values[1] - values[2]) / delta) % 6);
    else if (max === values[1]) h = 60 * (((values[2] - values[0]) / delta) + 2);
    else h = 60 * (((values[0] - values[1]) / delta) + 4);
  }
  if (h < 0) h += 360;
  const l = (max + min) / 2;
  const s = delta ? delta / (1 - Math.abs(2 * l - 1)) : 0;
  return { h, s: s * 100, l: l * 100 };
}

function hslToRgb({ h, s, l }) {
  const saturation = clamp(s, 0, 100) / 100;
  const lightness = clamp(l, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lightness - chroma / 2;
  let values = [0, 0, 0];
  if (h < 60) values = [chroma, x, 0];
  else if (h < 120) values = [x, chroma, 0];
  else if (h < 180) values = [0, chroma, x];
  else if (h < 240) values = [0, x, chroma];
  else if (h < 300) values = [x, 0, chroma];
  else values = [chroma, 0, x];
  return { r: (values[0] + m) * 255, g: (values[1] + m) * 255, b: (values[2] + m) * 255 };
}

function harmonyOffsets(mode) {
  if (mode === 'complementary') return [0, 180];
  if (mode === 'split') return [0, 150, 210];
  if (mode === 'analogous') return [-30, 0, 30];
  if (mode === 'triadic') return [0, 120, 240];
  return [0, 90, 180, 270];
}

function Range({ label, value, min, max, onChange }) {
  return (
    <label className="range-field">
      <span>{label}<output>{Math.round(value)}</output></span>
      <input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

export default function ColorPanel({ colourState, onChangeColourState, onApplyColour }) {
  const [tab, setTab] = useState('Disc');
  const [harmonyMode, setHarmonyMode] = useState('complementary');
  const primaryRgb = hexToRgb(colourState.primary);
  const primaryHsl = rgbToHsl(primaryRgb);
  const harmony = useMemo(() => harmonyOffsets(harmonyMode).map((offset) => rgbToHex(hslToRgb({
    h: (primaryHsl.h + offset + 360) % 360,
    s: primaryHsl.s,
    l: primaryHsl.l,
  }))), [harmonyMode, primaryHsl.h, primaryHsl.s, primaryHsl.l]);

  function setPrimary(value, remember = true) {
    const clean = /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : colourState.primary;
    onChangeColourState({
      ...colourState,
      primary: clean,
      history: remember ? [clean, ...colourState.history.filter((entry) => entry !== clean)].slice(0, 12) : colourState.history,
    });
    onApplyColour(clean);
  }

  function setHsl(patch) {
    setPrimary(rgbToHex(hslToRgb({ ...primaryHsl, ...patch })));
  }

  function setRgb(patch) {
    setPrimary(rgbToHex({ ...primaryRgb, ...patch }));
  }

  function addPaletteColour() {
    const palettes = colourState.palettes.map((palette, index) => index === colourState.activePalette
      ? { ...palette, colours: [...palette.colours, colourState.primary].slice(-30) }
      : palette);
    onChangeColourState({ ...colourState, palettes });
  }

  const activePalette = colourState.palettes[colourState.activePalette];

  return (
    <section className="colour-panel" aria-label="Colour Studio">
      <div className="panel-heading">
        <div><span>Shared service</span><h2>Colour Studio</h2></div>
        <button className="colour-pair" onClick={() => onChangeColourState({ ...colourState, primary: colourState.secondary, secondary: colourState.primary })} title="Swap primary and secondary colours">
          <span style={{ background: colourState.primary }} /><span style={{ background: colourState.secondary }} />
        </button>
      </div>

      <nav className="colour-tabs" aria-label="Colour modes">
        {TABS.map((name) => <button key={name} className={tab === name ? 'pressed' : ''} onClick={() => setTab(name)}>{name}</button>)}
      </nav>

      {(tab === 'Disc' || tab === 'Classic') && <div className="colour-picker-card">
        <input className="large-colour-input" type="color" value={colourState.primary} onChange={(event) => setPrimary(event.target.value)} />
        <div className="colour-values-compact">
          <Range label="Hue" min={0} max={359} value={primaryHsl.h} onChange={(h) => setHsl({ h })} />
          <Range label="Saturation" min={0} max={100} value={primaryHsl.s} onChange={(s) => setHsl({ s })} />
          <Range label="Brightness" min={0} max={100} value={primaryHsl.l} onChange={(l) => setHsl({ l })} />
        </div>
      </div>}

      {tab === 'Harmony' && <div className="harmony-card">
        <label className="field-label">Harmony
          <select value={harmonyMode} onChange={(event) => setHarmonyMode(event.target.value)}>
            {HARMONIES.map((mode) => <option key={mode}>{mode}</option>)}
          </select>
        </label>
        <div className="harmony-swatches">
          {harmony.map((colour) => <button key={colour} style={{ background: colour }} onClick={() => setPrimary(colour)} title={colour} />)}
        </div>
      </div>}

      {tab === 'Value' && <div className="value-grid">
        <label className="field-label">Hex<input value={colourState.primary} onChange={(event) => setPrimary(event.target.value)} /></label>
        <Range label="Red" min={0} max={255} value={primaryRgb.r} onChange={(r) => setRgb({ r })} />
        <Range label="Green" min={0} max={255} value={primaryRgb.g} onChange={(g) => setRgb({ g })} />
        <Range label="Blue" min={0} max={255} value={primaryRgb.b} onChange={(b) => setRgb({ b })} />
      </div>}

      {tab === 'Palettes' && <div className="palette-card">
        <div className="field-pair">
          <label className="field-label">Palette
            <select value={colourState.activePalette} onChange={(event) => onChangeColourState({ ...colourState, activePalette: Number(event.target.value) })}>
              {colourState.palettes.map((palette, index) => <option key={palette.id} value={index}>{palette.name}</option>)}
            </select>
          </label>
          <button onClick={addPaletteColour}>Add Current</button>
        </div>
        <div className="palette-swatches">
          {activePalette.colours.map((colour, index) => <button key={`${colour}-${index}`} style={{ background: colour }} onClick={() => setPrimary(colour)} title={colour} />)}
        </div>
      </div>}

      {tab === 'Profiles' && <div className="profile-card">
        <label className="field-label">Authoring colour profile
          <select value={colourState.profile} onChange={(event) => onChangeColourState({ ...colourState, profile: event.target.value })}>
            <option value="srgb">sRGB IEC61966-2.1</option>
            <option value="display-p3">Display P3</option>
            <option value="generic-cmyk">Generic CMYK target</option>
          </select>
        </label>
        <p>STARWELL records the intended profile in project metadata. Browser preview conversion and print-proof conversion remain separate validation tasks.</p>
      </div>}

      <div className="colour-history">
        <span>History</span>
        <div>{colourState.history.map((colour, index) => <button key={`${colour}-${index}`} style={{ background: colour }} onClick={() => setPrimary(colour, false)} title={colour} />)}</div>
      </div>
      <p className="panel-footnote">Primary colour is applied to the active brush or selected text layer. Secondary colour is preserved for future blend and gesture tools.</p>
    </section>
  );
}
