import { publishSocketEnvelope } from './projectZeroSocket.js';

export const PROJECT_ZERO_THEME_SCHEMA = 'flameclyffe.project-zero-companion.theme/v1';
export const PROJECT_ZERO_THEME_STORAGE_KEY = 'flameclyffe:project-zero-companion:theme/v1';

export const DEFAULT_PROJECT_ZERO_THEME = Object.freeze({
  schema: PROJECT_ZERO_THEME_SCHEMA,
  id: 'hearthglass',
  name: 'Hearthglass',
  tokens: {
    bg: '#080b12',
    bgAlt: '#111827',
    panel: '#151923',
    panelRaised: '#1d2230',
    input: '#0d1119',
    line: '#3d4353',
    text: '#f5eadf',
    muted: '#b7aea8',
    accent: '#f6c453',
    accentSecondary: '#2d7a5f',
    accentCool: '#6bb5d4',
    accentViolet: '#bd8cff',
    danger: '#df7b7b',
    success: '#7fd5a4',
    radiusPanel: 22,
    radiusControl: 12,
    density: 1,
    blur: 16,
    fontUi: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontReading: 'Cormorant Garamond, Georgia, serif',
    fontMono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  custom_css: '',
});

const TOKEN_CSS = Object.freeze({
  bg: '--pz-bg', bgAlt: '--pz-bg-alt', panel: '--pz-panel', panelRaised: '--pz-panel-raised', input: '--pz-input', line: '--pz-line', text: '--pz-text', muted: '--pz-muted', accent: '--pz-accent', accentSecondary: '--pz-accent-secondary', accentCool: '--pz-accent-cool', accentViolet: '--pz-accent-violet', danger: '--pz-danger', success: '--pz-success', radiusPanel: '--pz-radius-panel', radiusControl: '--pz-radius-control', density: '--pz-density', blur: '--pz-blur', fontUi: '--pz-font-ui', fontReading: '--pz-font-reading', fontMono: '--pz-font-mono',
});

export function normaliseProjectZeroTheme(value = {}) {
  const source = value && typeof value === 'object' ? value : {};
  const tokens = { ...DEFAULT_PROJECT_ZERO_THEME.tokens, ...(source.tokens || {}) };
  for (const key of ['radiusPanel', 'radiusControl', 'density', 'blur']) {
    const n = Number(tokens[key]);
    tokens[key] = Number.isFinite(n) ? n : DEFAULT_PROJECT_ZERO_THEME.tokens[key];
  }
  return { schema: PROJECT_ZERO_THEME_SCHEMA, id: String(source.id || DEFAULT_PROJECT_ZERO_THEME.id), name: String(source.name || DEFAULT_PROJECT_ZERO_THEME.name), tokens, custom_css: String(source.custom_css || '') };
}

export function loadProjectZeroTheme(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(PROJECT_ZERO_THEME_STORAGE_KEY);
    return raw ? normaliseProjectZeroTheme(JSON.parse(raw)) : normaliseProjectZeroTheme();
  } catch { return normaliseProjectZeroTheme(); }
}

export function saveProjectZeroTheme(theme, storage = globalThis.localStorage) {
  const value = normaliseProjectZeroTheme(theme);
  try { storage?.setItem(PROJECT_ZERO_THEME_STORAGE_KEY, JSON.stringify(value)); } catch {}
  applyProjectZeroTheme(value);
  publishSocketEnvelope({ pluginId: 'project-zero-companion-theme-bridge', channel: 'theme', type: 'theme.changed', payload: { id: value.id, name: value.name, schema: value.schema } });
  return value;
}

export function applyProjectZeroTheme(theme, root = globalThis.document?.documentElement) {
  if (!root) return normaliseProjectZeroTheme(theme);
  const value = normaliseProjectZeroTheme(theme);
  for (const [token, cssVar] of Object.entries(TOKEN_CSS)) {
    let tokenValue = value.tokens[token];
    if (token === 'radiusPanel' || token === 'radiusControl' || token === 'blur') tokenValue = `${tokenValue}px`;
    root.style.setProperty(cssVar, String(tokenValue));
  }
  let custom = globalThis.document?.getElementById('project-zero-companion-custom-theme');
  if (!custom && globalThis.document) {
    custom = globalThis.document.createElement('style');
    custom.id = 'project-zero-companion-custom-theme';
    globalThis.document.head.append(custom);
  }
  if (custom) custom.textContent = value.custom_css;
  root.dataset.projectZeroCompanionTheme = value.id;
  return value;
}

export function exportProjectZeroTheme(theme) { return JSON.stringify(normaliseProjectZeroTheme(theme), null, 2); }

export function importProjectZeroTheme(text) {
  const parsed = JSON.parse(String(text || ''));
  if (parsed?.schema && parsed.schema !== PROJECT_ZERO_THEME_SCHEMA) throw new Error(`Unsupported Project Zero Companion theme schema: ${parsed.schema}`);
  return normaliseProjectZeroTheme(parsed);
}
