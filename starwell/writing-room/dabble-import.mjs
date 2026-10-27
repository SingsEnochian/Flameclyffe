// Dabble export bridge: local-only, read-only, no Dabble API calls.
// A scene index is derived from headings; source bytes/text are never rewritten.
export const BRIDGE_SCHEMA = 'wayglass.dabble-export/v1';
export function indexMarkdown(text) {
  if (typeof text !== 'string') throw new TypeError('Expected Markdown text');
  const lineRe = /^#{1,6}[ \t]+(.+?)[ \t]*#*[ \t]*$/gm;
  const parts = [];
  let match;
  while ((match = lineRe.exec(text)) !== null) {
    parts.push({ title: match[1], offset: match.index, line: text.slice(0, match.index).split(/\r\n|\r|\n/).length });
  }
  return parts.map((entry, index) => ({
    ...entry, endOffset: index + 1 < parts.length ? parts[index + 1].offset : text.length
  }));
}
export async function importMarkdown({ name, text, maxBytes = 2_000_000 }) {
  if (typeof name !== 'string' || !/\.(md|markdown|txt)$/i.test(name)) throw new Error('Choose a .md, .markdown, or .txt export');
  if (typeof text !== 'string') throw new TypeError('Expected text export');
  const bytes = new TextEncoder().encode(text);
  if (!bytes.length || bytes.length > maxBytes) throw new Error('Export must be non-empty and at most 2 MB');
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const sha256 = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  return {
    schema: BRIDGE_SCHEMA, source: 'user-supplied-dabble-export', filename: name,
    sha256, byteLength: bytes.length, importedAt: new Date().toISOString(),
    sections: indexMarkdown(text), content: text, mode: 'read-only', authorisedWriteBack: false
  };
}
