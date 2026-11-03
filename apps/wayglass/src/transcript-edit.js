// Correct a local Writing Room transcript without rewriting past provider delivery.
export function correctUserMessage(message, proposedText, editedAt = new Date().toISOString()) {
  if (!message || message.role !== 'user') throw new TypeError('Only Rowan’s own messages can be edited.');
  const revised = String(proposedText ?? '').trim();
  if (!revised) throw new TypeError('A message cannot be empty.');
  if (revised === message.content) return false;
  if (!Array.isArray(message.edits)) message.edits = [];
  message.edits.push({ content: message.content, edited_at: editedAt });
  message.content = revised;
  return true;
}
