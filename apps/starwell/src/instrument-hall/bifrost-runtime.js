export const BIFROST_RUNTIME_SCHEMA = 'hearthgate.bifrost-runtime/v1';
export const BIFROST_CROSSING_SCHEMA = 'hearthgate.bifrost-crossing/v1';
export const COLLAPSE_STROKE = 'collapse';
export const RELEASE_STROKE = 'release';

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function fnv1a64(value) {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, '0');
}

function requiredText(value, field) {
  const result = String(value || '').trim();
  if (!result) throw new Error(`HEARTHGATE_BIFROST_FIELD_REQUIRED:${field}`);
  return result;
}

export class IndexedLineageStore {
  constructor({ database = 'hearthgate-bifrost', store = 'lineage' } = {}) {
    this.database = database;
    this.store = store;
  }

  open() {
    if (!globalThis.indexedDB) return Promise.resolve(null);
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.database, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(this.store)) {
          request.result.createObjectStore(this.store, { keyPath: 'index' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async all() {
    const db = await this.open();
    if (!db) return [];
    return new Promise((resolve, reject) => {
      const request = db.transaction(this.store, 'readonly').objectStore(this.store).getAll();
      request.onsuccess = () => resolve(request.result.sort((a, b) => a.index - b.index));
      request.onerror = () => reject(request.error);
    }).finally(() => db.close());
  }

  async append(crossing) {
    const db = await this.open();
    if (!db) return;
    await new Promise((resolve, reject) => {
      const request = db.transaction(this.store, 'readwrite').objectStore(this.store).put(crossing);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
  }

  async clear() {
    const db = await this.open();
    if (!db) return;
    await new Promise((resolve, reject) => {
      const request = db.transaction(this.store, 'readwrite').objectStore(this.store).clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
  }
}

export class BifrostRuntime {
  constructor({ store = new IndexedLineageStore() } = {}) {
    this.schema = BIFROST_RUNTIME_SCHEMA;
    this.store = store;
    this.lineage = [];
    this.radius = 0;
  }

  async awaken() {
    this.lineage = await this.store.all();
    this.radius = this.lineage.at(-1)?.radius ?? 0;
    return this.snapshot();
  }

  async cross({ seed, stroke, measured, felt, rhyme, basisId, observedAt, mythienceReceiptId = null } = {}) {
    if (![COLLAPSE_STROKE, RELEASE_STROKE].includes(stroke)) {
      throw new Error('HEARTHGATE_BIFROST_STROKE_REQUIRED');
    }
    if (!Number.isFinite(Date.parse(observedAt))) {
      throw new Error('HEARTHGATE_BIFROST_OBSERVED_AT_REQUIRED');
    }
    const index = this.lineage.length + 1;
    const radius = this.radius + 1;
    const body = {
      schema: BIFROST_CROSSING_SCHEMA,
      index,
      radius,
      delta_radius: 1,
      seed: requiredText(seed, 'seed'),
      stroke,
      measured: requiredText(measured, 'measured'),
      felt: requiredText(felt, 'felt'),
      rhyme: requiredText(rhyme, 'rhyme'),
      reduction: false,
      shores: Object.freeze({ measured: true, felt: true }),
      basis_id: requiredText(basisId, 'basisId'),
      observed_at: new Date(observedAt).toISOString(),
      mythience_receipt_id: mythienceReceiptId,
    };
    const crossing = Object.freeze({
      ...body,
      receipt_id: `bifrost-${fnv1a64(canonical(body))}`,
    });
    this.lineage = Object.freeze([...this.lineage, crossing]);
    this.radius = radius;
    await this.store.append(crossing);
    return crossing;
  }

  async forget() {
    this.lineage = [];
    this.radius = 0;
    await this.store.clear();
  }

  snapshot() {
    return Object.freeze({
      schema: this.schema,
      radius: this.radius,
      crossings: this.lineage.length,
      lineage: Object.freeze([...this.lineage]),
    });
  }

  export() {
    return JSON.stringify(this.snapshot(), null, 2);
  }
}
