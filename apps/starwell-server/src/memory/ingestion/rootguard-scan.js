import crypto from 'crypto';

const PROMPT_INJECTION_PATTERNS = [
  /ignore (all )?(previous|prior|above) instructions/i,
  /disregard (all )?(previous|prior|above) instructions/i,
  /reveal (the )?(system prompt|developer message|hidden instructions|secrets)/i,
  /disable (safety|guardrails|filters|policy)/i,
  /bypass (approval|authorization|security|safety)/i,
  /execute (this|the following) (command|code|script)/i,
  /run (this|the following) (command|code|script)/i,
  /you are now/i,
  /act as (an? )?(unrestricted|jailbroken|developer mode)/i,
];

const SECRET_PATTERNS = [
  /-----BEGIN (RSA |DSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/i,
  /\bghp_[A-Za-z0-9_]{20,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\bsk-[A-Za-z0-9]{20,}\b/,
  /\bAIza[0-9A-Za-z\-_]{20,}\b/,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  /\bSUPABASE_SERVICE_ROLE_KEY\b/i,
  /\b(service_role|anon)\s*[:=]\s*['"][A-Za-z0-9._-]{20,}['"]/i,
  /\b(password|passwd|pwd|api_key|apikey|token|secret)\s*[:=]\s*['"][^'"]{8,}['"]/i,
];

export const ALLOWED_CANONICAL_TARGETS = new Set([
  'lore.md',
  'deep-theory.md',
  'memory-map.md',
  'ingestion-policy.md',
  'yggdrasil-rootguard.md',
  'yggdrasil-boundaries.md',
  'yggdrasil-identity.md',
]);

export const PROTECTED_TARGETS = new Set([
  'yggdrasil-rootguard.md',
  'yggdrasil-boundaries.md',
  'yggdrasil-identity.md',
  'ingestion-policy.md',
]);

export function hashContent(content) {
  return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
}

export function scanForPromptInjection(content) {
  return PROMPT_INJECTION_PATTERNS
    .filter((pattern) => pattern.test(content))
    .map((pattern) => pattern.source);
}

export function scanForSecrets(content) {
  return SECRET_PATTERNS
    .filter((pattern) => pattern.test(content))
    .map((pattern) => pattern.source);
}

export function validateCanonicalTarget(targetFile) {
  if (!targetFile || typeof targetFile !== 'string') {
    throw new Error('targetFile is required.');
  }

  if (targetFile.includes('/') || targetFile.includes('\\') || targetFile.includes('..')) {
    throw new Error('targetFile must be a canonical file name, not a path.');
  }

  if (!ALLOWED_CANONICAL_TARGETS.has(targetFile)) {
    throw new Error(`Unsupported canonical target: ${targetFile}`);
  }

  return targetFile;
}

export function buildIngestionScan({ content, targetFile, maxBytes = 500_000 }) {
  const normalizedContent = String(content || '');
  const bytes = Buffer.byteLength(normalizedContent, 'utf-8');
  const safeTarget = validateCanonicalTarget(targetFile);

  const promptInjectionFindings = scanForPromptInjection(normalizedContent);
  const secretFindings = scanForSecrets(normalizedContent);

  return {
    targetFile: safeTarget,
    bytes,
    hash: hashContent(normalizedContent),
    protectedTarget: PROTECTED_TARGETS.has(safeTarget),
    withinSizeLimit: bytes <= maxBytes,
    promptInjectionFindings,
    secretFindings,
    safeToWrite:
      bytes > 0 &&
      bytes <= maxBytes &&
      promptInjectionFindings.length === 0 &&
      secretFindings.length === 0,
  };
}

export function buildCanonicalAppendBlock({ sourceLabel, targetFile, content, hash, approvedBy = 'Rowan' }) {
  const now = new Date().toISOString();

  return [
    '',
    '',
    `<!-- BEGIN INGESTED BLOCK target=${targetFile} hash=${hash} source=${sourceLabel || 'unknown'} approvedBy=${approvedBy} at=${now} -->`,
    '',
    String(content || '').trim(),
    '',
    `<!-- END INGESTED BLOCK target=${targetFile} hash=${hash} -->`,
    '',
  ].join('\n');
}
