'use strict';

const DEFAULT_ALLOWED_ORIGINS = Object.freeze([
  'http://localhost:3841',
  'http://127.0.0.1:3841',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]);

const KEEP_EXISTING_SECRET = '__HEARTHGATE_KEEP_EXISTING_SECRET__';

const PROTECTED_ENV_NAMES = new Set([
  'APPDATA',
  'ARCSWEEP_RUNTIME_TOKEN',
  'COMSPEC',
  'DYLD_INSERT_LIBRARIES',
  'ELECTRON_RUN_AS_NODE',
  'FONTFORGE_PORT',
  'HEARTHGATE_ALLOWED_ORIGINS',
  'HEARTHGATE_DATA_DIR',
  'HOME',
  'LD_PRELOAD',
  'LOCALAPPDATA',
  'NODE_OPTIONS',
  'NODE_PATH',
  'PATH',
  'PATHEXT',
  'PORT',
  'SYSTEMROOT',
  'TEMP',
  'TMP',
  'USERPROFILE',
  'WINDIR',
]);

const SAFE_CUSTOM_ENV_NAME = /^[A-Z][A-Z0-9_]{1,63}$/;
const SAFE_CUSTOM_ENV_SUFFIX = /(?:_API_KEY|_TOKEN|_SECRET|_ENDPOINT|_HOST|_URL)$/;
const PRESERVED_KEY_FIELDS = Object.freeze([
  'runtime',
  'anthropic',
  'openai',
  'exa',
  'deepseek_blue',
  'deepseek_veth',
  'ollama',
]);

function cleanString(value, field, maxLength, { required = false } = {}) {
  if (value == null || value === '') {
    if (required) throw new TypeError(`${field} is required.`);
    return '';
  }
  if (typeof value !== 'string') throw new TypeError(`${field} must be a string.`);
  const cleaned = value.trim();
  if (required && !cleaned) throw new TypeError(`${field} is required.`);
  if (cleaned.includes('\0')) throw new TypeError(`${field} contains a null byte.`);
  if (cleaned.length > maxLength) throw new TypeError(`${field} exceeds ${maxLength} characters.`);
  return cleaned;
}

function configuredAllowedOrigins(environment = process.env) {
  const configured = cleanString(environment.HEARTHGATE_ALLOWED_ORIGINS, 'HEARTHGATE_ALLOWED_ORIGINS', 4096)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...configured]);
}

function isAllowedLocalOrigin(origin, environment = process.env) {
  if (!origin) return true;
  return configuredAllowedOrigins(environment).has(origin);
}

function localCorsOptions(environment = process.env) {
  return {
    origin(origin, callback) {
      if (isAllowedLocalOrigin(origin, environment)) return callback(null, true);
      const error = new Error('Origin is outside the Hearthgate local boundary.');
      error.code = 'HEARTHGATE_ORIGIN_DENIED';
      return callback(error);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition', 'Content-Length'],
    credentials: false,
    maxAge: 600,
  };
}

function sanitiseCustomEnvironment(entries) {
  if (entries == null) return [];
  if (!Array.isArray(entries)) throw new TypeError('keys.custom must be an array.');
  if (entries.length > 24) throw new TypeError('keys.custom may contain at most 24 entries.');

  const seen = new Set();
  return entries.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new TypeError(`keys.custom[${index}] must be an object.`);
    }
    const name = cleanString(entry.name, `keys.custom[${index}].name`, 64, { required: true }).toUpperCase();
    const value = cleanString(entry.value, `keys.custom[${index}].value`, 8192, { required: true });
    if (!SAFE_CUSTOM_ENV_NAME.test(name) || !SAFE_CUSTOM_ENV_SUFFIX.test(name)) {
      throw new TypeError(`${name} is not an allowed provider variable name.`);
    }
    if (PROTECTED_ENV_NAMES.has(name)) {
      throw new TypeError(`${name} is reserved by the Hearthgate runtime.`);
    }
    if (seen.has(name)) throw new TypeError(`${name} is duplicated.`);
    seen.add(name);
    return Object.freeze({ name, value });
  });
}

function sanitiseHearthgateConfig(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Hearthgate configuration must be an object.');
  }
  const keys = input.keys && typeof input.keys === 'object' && !Array.isArray(input.keys)
    ? input.keys
    : {};

  return {
    schema: 'hearthgate.config/v1',
    name: cleanString(input.name, 'name', 48, { required: true }),
    steward: cleanString(input.steward, 'steward', 32, { required: true }),
    theme: cleanString(input.theme, 'theme', 64) || 'grove',
    keys: {
      runtime: cleanString(keys.runtime, 'keys.runtime', 8192),
      anthropic: cleanString(keys.anthropic, 'keys.anthropic', 8192),
      openai: cleanString(keys.openai, 'keys.openai', 8192),
      exa: cleanString(keys.exa, 'keys.exa', 8192),
      deepseek_blue: cleanString(keys.deepseek_blue, 'keys.deepseek_blue', 8192),
      deepseek_veth: cleanString(keys.deepseek_veth, 'keys.deepseek_veth', 8192),
      ollama: cleanString(keys.ollama, 'keys.ollama', 2048),
      custom: sanitiseCustomEnvironment(keys.custom),
    },
  };
}

function mergeHearthgateConfigSecrets(input, existingInput) {
  const next = sanitiseHearthgateConfig(input);
  const existing = existingInput ? sanitiseHearthgateConfig(existingInput) : null;

  for (const field of PRESERVED_KEY_FIELDS) {
    if (next.keys[field] === KEEP_EXISTING_SECRET) {
      next.keys[field] = existing?.keys[field] || '';
    } else if (!next.keys[field] && existing?.keys[field]) {
      next.keys[field] = existing.keys[field];
    }
  }

  if (!existing) return next;

  const customByName = new Map(existing.keys.custom.map((entry) => [entry.name, entry]));
  for (const entry of next.keys.custom) customByName.set(entry.name, entry);
  next.keys.custom = [...customByName.values()];
  if (next.keys.custom.length > 24) {
    throw new TypeError('Merged keys.custom may contain at most 24 entries.');
  }
  return next;
}

function redactHearthgateConfig(input) {
  if (!input) return null;
  const config = sanitiseHearthgateConfig(input);
  return {
    schema: config.schema,
    name: config.name,
    steward: config.steward,
    theme: config.theme,
    keys: {
      runtime: Boolean(config.keys.runtime),
      anthropic: Boolean(config.keys.anthropic),
      openai: Boolean(config.keys.openai),
      exa: Boolean(config.keys.exa),
      deepseek_blue: Boolean(config.keys.deepseek_blue),
      deepseek_veth: Boolean(config.keys.deepseek_veth),
      ollama: config.keys.ollama || null,
      custom: config.keys.custom.map(({ name }) => ({ name, configured: true })),
    },
  };
}

module.exports = {
  DEFAULT_ALLOWED_ORIGINS,
  KEEP_EXISTING_SECRET,
  PROTECTED_ENV_NAMES,
  PRESERVED_KEY_FIELDS,
  configuredAllowedOrigins,
  isAllowedLocalOrigin,
  localCorsOptions,
  mergeHearthgateConfigSecrets,
  redactHearthgateConfig,
  sanitiseCustomEnvironment,
  sanitiseHearthgateConfig,
};
