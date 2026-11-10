// Wayglass Writing Room conversations: explicit local-browser custody, never a
// provider identity, owner grant, cloud persistence or verified Return receipt.
export const WAYGLASS_CHAT_VAULT_SCHEMA = 'wayglass.chat-vault/v1';
export const WAYGLASS_CHAT_VAULT_KEY = 'wayglass.chat-vault/v1';
export const MAX_CHAT_SESSIONS = 24;
export const MAX_CHAT_MESSAGES = 160;
export const MAX_CHAT_VAULT_BYTES = 1024 * 1024;

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const bounded = (value, limit) => typeof value === 'string' ? value.slice(0, limit) : '';
const copy = value => JSON.parse(JSON.stringify(value));
const storageBytes = value => new TextEncoder().encode(value).byteLength;

function safeMessage(value) {
  if (!isRecord(value) || !['user', 'assistant'].includes(value.role) ||
      typeof value.content !== 'string' || !value.content.trim() || value.content.length > 12000)
    throw new TypeError('Conversation contains an invalid turn');
  // A model's internal thinking is deliberately not copied into a persistent transcript.
  const result = {
    role: value.role,
    content: value.content,
    channel: value.channel === 'OOC' ? 'OOC' : 'IC',
    world_id: bounded(value.world_id, 180),
  };
  for (const key of ['route_label', 'route_id', 'provider', 'model', 'character_id',
    'emergence_question_id', 'delivery_status']) {
    if (typeof value[key] === 'string') result[key] = bounded(value[key], 240);
  }
  // HTML is presentation only and is sanitised at every editor/render boundary.
  if(typeof value.rich_text_html==='string'){
    if(value.rich_text_html.length>48000)throw new RangeError('Rich text turn exceeds its storage limit');
    result.rich_text_html=value.rich_text_html;
  }
  if (Number.isSafeInteger(value.revision_of) && value.revision_of >= 0)
    result.revision_of = value.revision_of;
  if (isRecord(value.receipt)) {
    result.receipt = {};
    for (const key of ['response_id', 'observation_id', 'completed_at', 'epistemic_register',
      'participant_id', 'continuity_id', 'candidate_id', 'requested_model', 'returned_model',
      'voice_seat_kind', 'selected_route_id']) {
      if (typeof value.receipt[key] === 'string') result.receipt[key] = bounded(value.receipt[key], 240);
    }
    result.receipt.canon_commit = value.receipt.canon_commit === true;
    result.receipt.wayglass_persisted = value.receipt.wayglass_persisted === true;
  }
  return result;
}

function safeSession(value) {
  if (!isRecord(value) || typeof value.session_id !== 'string' ||
      !/^[a-zA-Z0-9:_-]{1,160}$/.test(value.session_id) ||
      !Array.isArray(value.messages) || value.messages.length > MAX_CHAT_MESSAGES ||
      typeof value.saved_at !== 'string' || value.saved_at.length > 40 ||
      typeof value.created_at !== 'string' || value.created_at.length > 40)
    throw new TypeError('Conversation archive contains invalid session data');
  return {
    session_id: value.session_id,
    created_at: value.created_at,
    saved_at: value.saved_at,
    title: bounded(value.title, 96) || 'Untitled conversation',
    messages: value.messages.map(safeMessage),
  };
}

function parseVault(raw) {
  if (raw == null || raw === '') return {schema: WAYGLASS_CHAT_VAULT_SCHEMA, sessions: []};
  if (storageBytes(raw) > MAX_CHAT_VAULT_BYTES) throw new RangeError('Saved chat vault exceeds its byte limit');
  let value;
  try { value = JSON.parse(raw); } catch { throw new TypeError('Saved chat vault is not valid JSON; original data was not changed'); }
  if (!isRecord(value) || value.schema !== WAYGLASS_CHAT_VAULT_SCHEMA ||
      !Array.isArray(value.sessions) || value.sessions.length > MAX_CHAT_SESSIONS)
    throw new TypeError('Unrecognised saved chat vault; original data was not changed');
  const sessions = value.sessions.map(safeSession);
  if (new Set(sessions.map(item => item.session_id)).size !== sessions.length)
    throw new TypeError('Saved chat vault has duplicate sessions');
  return {schema: WAYGLASS_CHAT_VAULT_SCHEMA, sessions};
}

export function createWayglassChatVault({storage = globalThis.localStorage, key = WAYGLASS_CHAT_VAULT_KEY, now = () => new Date().toISOString()} = {}) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function')
    throw new Error('Browser conversation storage is unavailable');
  const read = () => parseVault(storage.getItem(key));
  function commit(value) {
    const raw = JSON.stringify(value);
    if (storageBytes(raw) > MAX_CHAT_VAULT_BYTES)
      throw new RangeError('Chat archive full; export a conversation before adding more');
    storage.setItem(key, raw);
    if (storage.getItem(key) !== raw) throw new Error('Browser did not confirm the saved conversation');
  }
  function save({sessionId, messages} = {}) {
    if (typeof sessionId !== 'string' || !/^[a-zA-Z0-9:_-]{1,160}$/.test(sessionId))
      throw new TypeError('A valid chat session ID is required');
    if (!Array.isArray(messages) || messages.length > MAX_CHAT_MESSAGES)
      throw new RangeError('Chat contains too many turns; export this session before continuing');
    const clean = messages.map(safeMessage);
    const vault = read();
    const previous = vault.sessions.find(item => item.session_id === sessionId);
    if (!previous && vault.sessions.length >= MAX_CHAT_SESSIONS)
      throw new RangeError('Chat archive full; export or remove a saved conversation');
    const timestamp = now();
    const first = clean.find(item => item.role === 'user')?.content.trim() || '';
    const record = safeSession({
      session_id: sessionId,
      created_at: previous?.created_at || timestamp,
      saved_at: timestamp,
      title: previous?.title || (first ? first.slice(0, 96) : 'Untitled conversation'),
      messages: clean,
    });
    vault.sessions = [record, ...vault.sessions.filter(item => item.session_id !== sessionId)];
    commit(vault);
    return Object.freeze({scope: 'local-browser', persisted: true,
      session_id: sessionId, message_count: clean.length, saved_at: timestamp});
  }
  function list() {
    return read().sessions.map(({session_id, title, saved_at, messages}) =>
      ({session_id, title, saved_at, message_count: messages.length}));
  }
  function open(sessionId) {
    const found = read().sessions.find(item => item.session_id === sessionId);
    if (!found) return null;
    return copy(found);
  }
  function remove(sessionId) {
    const vault = read();
    if (!vault.sessions.some(item => item.session_id === sessionId)) return false;
    vault.sessions = vault.sessions.filter(item => item.session_id !== sessionId);
    commit(vault);
    return true;
  }
  return Object.freeze({save, list, open, remove});
}
