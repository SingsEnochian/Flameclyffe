export const ECHO_INDEX_SCHEMA = 'arcsweep.echo-index/v1';

const STORES = Object.freeze([
  ['world','worlds','world-registry'],
  ['script','scripts','canon-studio'],
  ['record','records','records-room'],
  ['continuity','continuity','continuity'],
  ['manifestation','manifestations','continuity'],
  ['feedback','feedbackCycles','feedback-ledger'],
]);

function text(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(text).join(' ');
  if (typeof value === 'object') return Object.entries(value).map(([k,v]) => `${k} ${text(v)}`).join(' ');
  return '';
}

function flattenRecords(records, path = []) {
  if (!records || typeof records !== 'object') return [];
  const out = [];
  for (const [key,value] of Object.entries(records)) {
    if (Array.isArray(value)) {
      value.forEach((item,index) => out.push({ item, path:[...path,key,index] }));
    } else if (value && typeof value === 'object') {
      out.push(...flattenRecords(value,[...path,key]));
    }
  }
  return out;
}

function authorityFor(kind, item) {
  if (kind === 'script') return item?.status?.toLowerCase?.().includes('canon') ? 'canon-candidate' : 'authored-draft';
  if (kind === 'world') return 'world-registry';
  if (kind === 'record') return item?.canonCarry ? 'canon-carry' : 'record';
  if (kind === 'continuity' || kind === 'manifestation') return 'continuity-evidence';
  if (kind === 'feedback') return 'review-evidence';
  return 'descriptive';
}

function entry(kind, store, item, index, extra = {}) {
  const id = item?.id || item?.key || `${kind}-${index}`;
  const label = item?.name || item?.title || item?.label || item?.kind || id;
  return Object.freeze({
    schema:ECHO_INDEX_SCHEMA,
    kind,
    store,
    id:String(id),
    label:String(label),
    world_id:item?.worldId || item?.world_id || null,
    authority_class:extra.authority_class || authorityFor(kind,item),
    provenance:extra.provenance || item?.provenance || null,
    path:extra.path || null,
    searchable:text(item).toLowerCase(),
    raw:item,
  });
}

export function buildEchoIndex(state = {}, externalEntries = []) {
  const rows = [];
  for (const [kind,key,store] of STORES) {
    if (key === 'records') {
      flattenRecords(state.records).forEach(({item,path},index) => rows.push(entry(kind,store,item,index,{path})));
      continue;
    }
    const list = Array.isArray(state[key]) ? state[key] : [];
    list.forEach((item,index) => rows.push(entry(kind,store,item,index)));
  }

  const deep = state?.observatory?.deep_time_records;
  if (Array.isArray(deep)) deep.forEach((item,index) => rows.push(entry('deep-time','observer/deep-time',item,index,{authority_class:'reviewed-temporal-evidence'})));

  for (const supplied of externalEntries || []) {
    if (!supplied || typeof supplied !== 'object') continue;
    const kind = supplied.kind || 'external';
    const store = supplied.store || 'external-adapter';
    rows.push(entry(kind,store,supplied.raw || supplied,rows.length,{
      authority_class:supplied.authority_class || 'external-descriptive',
      provenance:supplied.provenance || null,
      path:supplied.path || null,
    }));
  }
  return Object.freeze(rows);
}

export function resolveEchoIndex(state, query, options = {}) {
  const needle = String(query || '').trim().toLowerCase();
  const limit = Math.max(1, Math.min(Number(options.limit || 80), 250));
  const rows = buildEchoIndex(state, options.externalEntries || []);
  if (!needle) return rows.slice(0,limit);
  const tokens = needle.split(/\s+/).filter(Boolean);
  return rows
    .map((row) => ({ row, score:tokens.reduce((n,t) => n + (row.searchable.includes(t) ? 1 : 0),0) }))
    .filter(({score}) => score > 0)
    .sort((a,b) => b.score - a.score || a.row.label.localeCompare(b.row.label))
    .slice(0,limit)
    .map(({row}) => row);
}
