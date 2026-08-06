'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SCHEMA = 'hearthgate.continuity/v1';
const norm = value => String(value || '').trim().replace(/\s+/g, ' ');
const keyFor = value => norm(value).toLocaleLowerCase('en-GB');
const stableId = value => `continuity-${crypto.createHash('sha256').update(value).digest('hex').slice(0, 16)}`;

function observationsFrom(project) {
  return project?.backup?.observations || project?.observations || [];
}

function parseObservation(row) {
  try { return row?.payload_json ? JSON.parse(row.payload_json) : row; }
  catch { return { ...row, parseError: true }; }
}

function createContinuityStore({ dataDir, projectPath, ingestStore, writerStore, solarWeatherStore }) {
  const root = path.join(dataDir, 'continuity');
  const catalogPath = path.join(root, 'catalog.json');

  async function readSaved() {
    try { return JSON.parse(await fs.promises.readFile(catalogPath, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; return { schema: SCHEMA, continuities: [] }; }
  }

  async function atomicWrite(value) {
    await fs.promises.mkdir(root, { recursive: true });
    const temporary = `${catalogPath}.${process.pid}.tmp`;
    await fs.promises.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.promises.rename(temporary, catalogPath);
  }

  async function inputs() {
    let project = null;
    try { project = JSON.parse(await fs.promises.readFile(projectPath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const [library, writing, solar] = await Promise.all([ingestStore.list(), writerStore.list(), solarWeatherStore ? solarWeatherStore.history(500) : { snapshots: [] }]);
    return { project, library: library.documents || [], writing: writing.documents || [], solar: solar.snapshots || [] };
  }

  function build({ project, library, writing, solar = [] }, previous = { continuities: [] }) {
    const groups = new Map();
    const oldByKey = new Map((previous.continuities || []).map(item => [keyFor(item.name), item]));
    const ensure = rawName => {
      const name = norm(rawName) || 'Unassigned continuity';
      const key = keyFor(name);
      if (!groups.has(key)) {
        const old = oldByKey.get(key) || {};
        groups.set(key, { id: old.id || stableId(key), name: old.name || name, summary: old.summary || '', privacy: old.privacy || 'private', consent: old.consent || 'not recorded', boundaries: old.boundaries || '', establishedFacts: old.establishedFacts || [], canonRecords: old.canonRecords || [], unresolvedThreads: old.unresolvedThreads || [], manualContradictions: old.manualContradictions || [], sources: [], metrics: {}, timeline: [], sourceFacts: { dates: [], mathematics: [], magicAndCorrespondence: [], entities: [], places: [], relationships: [], claims: [] }, contradictions: [] });
      }
      return groups.get(key);
    };
    const add = (name, source) => {
      const group = ensure(name);
      if (!group.sources.some(item => item.ref === source.ref)) group.sources.push(source);
    };

    observationsFrom(project).map(parseObservation).forEach((item, index) => {
      const name = item.continuity || item.world || item.place || item.locus || 'Unassigned continuity';
      const sourceId = item.id || item.observation_id || item.glyph_id || `${index}`;
      add(name, { ref: `observer:${sourceId}`, kind: 'observer', sourceId, title: norm(item.title || item.entity || `Observation ${index + 1}`), excerpt: norm(item.narrative?.text || item.note || item.summary), occurredAt: item.created_utc || item.capturedAt || null, importedAt: project?.exported_at || null, classification: 'observed-or-authored', provenance: { store: 'Observer project', path: sourceId }, rawMetrics: item.metrics || item.premaq || null, sourceFacts: item.sourceFacts || null, parseError: !!item.parseError });
    });
    library.forEach(document => (document.analysis?.continuityLinks || []).forEach((link, index) => add(link, { ref: `archive:${document.id}:continuity:${index}`, kind: 'archive-analysis', sourceId: document.id, title: document.name, excerpt: document.analysis?.summary || '', occurredAt: document.sourceDate || null, importedAt: document.importedAt || null, classification: 'derived-interpretation', provenance: { store: 'Hearthfire Archive', sha256: document.sha256, analysisProvider: document.analysis?.provider || null }, sourceFacts: { dates: document.analysis?.dates || [], mathematics: document.analysis?.mathematics || [], magicAndCorrespondence: document.analysis?.magicAndCorrespondence || [], entities: document.analysis?.entities || [], places: document.analysis?.places || [], relationships: document.analysis?.relationships || [], claims: document.analysis?.sourceClaims || [] }, uncertainty: document.analysis?.uncertainty || [] })));
    writing.filter(document => norm(document.continuity)).forEach(document => add(document.continuity, { ref: `writer:${document.id}`, kind: 'writing', sourceId: document.id, title: document.title, excerpt: norm(document.synopsis || document.content?.slice(0, 400)), occurredAt: null, importedAt: document.updatedAt || null, classification: document.documentType === 'continuity' ? 'authored-continuity' : 'narrative-treatment', provenance: { store: 'Writing Chamber', sourceDocumentId: document.sourceDocumentId || null, sourceSha256: document.sourceSha256 || null }, status: document.status }));
    solar.forEach(snapshot => {
      const measurements = Object.entries(snapshot.metrics || {}).filter(([, item]) => item?.value !== null && item?.value !== undefined);
      add('Solar activity & space weather', { ref: `solar:${snapshot.identity || snapshot.id}`, kind: 'environmental-observation', sourceId: snapshot.id, title: `NOAA SWPC snapshot · ${snapshot.retrievedAt}`, excerpt: measurements.map(([name, item]) => `${name}: ${item.value} ${item.unit || ''}`.trim()).join(' · '), occurredAt: snapshot.retrievedAt, importedAt: snapshot.retrievedAt, classification: 'direct-environmental-measurement', provenance: { store: 'Solar Observatory', identity: snapshot.identity, agency: 'NOAA Space Weather Prediction Center', sourceUrls: Object.values(snapshot.sources || {}).map(source => source.url).filter(Boolean) }, sourceFacts: { dates: measurements.map(([name, item]) => ({ label: `${name} observed`, value: item.observedAt })).filter(item => item.value), mathematics: measurements.map(([name, item]) => ({ label: name, value: `${item.value} ${item.unit || ''}`.trim(), classification: 'direct measurement' })), magicAndCorrespondence: [], entities: [], places: [], relationships: [], claims: [] } });
    });

    const continuities = [...groups.values()].map(group => {
      const factKeys = Object.keys(group.sourceFacts);
      for (const source of group.sources) {
        for (const factKind of factKeys) {
          const values = source.sourceFacts?.[factKind] || [];
          for (const rawFact of values) {
            const fact = typeof rawFact === 'string' ? { value: rawFact } : rawFact;
            group.sourceFacts[factKind].push({ ...fact, sourceRef: source.ref, sourceId: source.sourceId, sourceTitle: source.title, classification: source.classification, provenance: source.provenance });
          }
        }
        if (source.occurredAt) group.timeline.push({ label: source.title, value: source.occurredAt, context: source.excerpt, sourceRef: source.ref, classification: source.classification });
      }
      group.timeline.push(...group.sourceFacts.dates.map(fact => ({ ...fact, label: fact.label || fact.value || 'Source date' })));
      group.timeline.sort((a, b) => {
        const ad = Date.parse(a.value), bd = Date.parse(b.value);
        if (Number.isFinite(ad) && Number.isFinite(bd)) return ad - bd;
        return String(a.value || '').localeCompare(String(b.value || ''));
      });
      const comparable = new Map();
      for (const kind of ['dates', 'mathematics', 'magicAndCorrespondence']) for (const fact of group.sourceFacts[kind]) {
        const label = keyFor(fact.label || fact.system); if (!label) continue;
        const value = norm(fact.value || fact.expression); if (!value) continue;
        const key = `${kind}:${label}`; if (!comparable.has(key)) comparable.set(key, new Map());
        if (!comparable.get(key).has(value)) comparable.get(key).set(value, []);
        comparable.get(key).get(value).push(fact.sourceRef);
      }
      group.contradictions = [...comparable.entries()].filter(([, values]) => values.size > 1).map(([field, values]) => ({ field, status: 'review', variants: [...values.entries()].map(([value, sourceRefs]) => ({ value, sourceRefs })), method: 'Different source-derived values share the same normalised label; human review required.' }));
      group.contradictions.push(...group.manualContradictions.map(item => ({ ...item, status: item.status || 'review', method: 'User-authored contradiction record.' })));
      const kinds = group.sources.reduce((out, source) => ({ ...out, [source.kind]: (out[source.kind] || 0) + 1 }), {});
      const dates = group.sources.flatMap(source => [source.occurredAt, source.importedAt]).filter(Boolean).map(value => new Date(value)).filter(value => !Number.isNaN(value.valueOf())).sort((a, b) => a - b);
      const unresolvedFromAnalysis = group.sources.reduce((count, source) => count + (source.uncertainty?.length || 0) + (source.parseError ? 1 : 0), 0);
      const withProvenance = group.sources.filter(source => source.provenance && Object.values(source.provenance).some(Boolean)).length;
      group.metrics = {
        sourceCount: metric(group.sources.length, 'count', 'derived', 'Unique source references after ref-based deduplication'),
        observerCount: metric(kinds.observer || 0, 'count', 'derived', 'Observer project references'),
        archiveAnalysisCount: metric(kinds['archive-analysis'] || 0, 'count', 'derived', 'Archive continuity links produced by semantic analysis'),
        writingCount: metric(kinds.writing || 0, 'count', 'derived', 'Writing Chamber documents explicitly assigned to this continuity'),
        environmentalObservationCount: metric(kinds['environmental-observation'] || 0, 'count', 'derived', 'Sourced NOAA SWPC snapshots retained as environmental context'),
        provenanceCoverage: metric(group.sources.length ? withProvenance / group.sources.length : 0, 'ratio', 'derived', 'Sources carrying at least one provenance field'),
        unresolvedCount: metric((group.unresolvedThreads || []).length + unresolvedFromAnalysis, 'count', 'mixed', 'User-authored unresolved threads plus source-analysis uncertainty'),
        citedFactCount: metric(factKeys.reduce((count, key) => count + group.sourceFacts[key].length, 0), 'count', 'derived', 'Source-derived facts carrying a sourceRef'),
        contradictionCount: metric(group.contradictions.length, 'count', 'mixed', 'Automatically surfaced variant values plus user-authored contradiction records'),
        temporalSpan: { value: dates.length > 1 ? dates.at(-1) - dates[0] : null, unit: 'milliseconds', classification: 'derived', method: 'Newest minus oldest valid source date', first: dates[0]?.toISOString() || null, last: dates.at(-1)?.toISOString() || null },
      };
      return group;
    }).sort((a, b) => b.sources.length - a.sources.length || a.name.localeCompare(b.name));
    return { schema: SCHEMA, rebuiltAt: new Date().toISOString(), continuities, sourceSummary: { observer: observationsFrom(project).length, archive: library.length, writing: writing.length, solarWeather: solar.length }, boundary: 'Continuity links preserve source identity. Archive analysis remains interpretation; narrative treatments remain authored material; NOAA space-weather records remain environmental context. Temporal proximity is not evidence of causation.' };
  }

  function metric(value, unit, classification, method) { return { value, unit, classification, method }; }
  async function rebuild() { const catalog = build(await inputs(), await readSaved()); await atomicWrite(catalog); return catalog; }
  async function list({ refresh = false } = {}) { const saved = await readSaved(); return refresh || !saved.rebuiltAt ? rebuild() : saved; }
  async function get(id) { return (await list()).continuities.find(item => item.id === id) || null; }
  async function update(id, input = {}) {
    const catalog = await list(); const item = catalog.continuities.find(entry => entry.id === id); if (!item) return null;
    for (const field of ['name', 'summary', 'privacy', 'consent', 'boundaries']) if (input[field] !== undefined) item[field] = norm(input[field]);
    for (const field of ['establishedFacts', 'unresolvedThreads']) if (Array.isArray(input[field])) item[field] = input[field].map(norm).filter(Boolean).slice(0, 200);
    if (Array.isArray(input.canonRecords)) item.canonRecords = input.canonRecords.slice(0, 500).map(record => ({ id: record.id || crypto.randomUUID(), statement: norm(record.statement), sourceRefs: Array.isArray(record.sourceRefs) ? record.sourceRefs.map(norm).filter(Boolean).slice(0, 30) : [], status: ['established', 'provisional', 'retired'].includes(record.status) ? record.status : 'provisional', establishedAt: record.establishedAt || new Date().toISOString(), note: norm(record.note) })).filter(record => record.statement);
    if (Array.isArray(input.manualContradictions)) item.manualContradictions = input.manualContradictions.slice(0, 200).map(record => ({ id: record.id || crypto.randomUUID(), field: norm(record.field), note: norm(record.note), sourceRefs: Array.isArray(record.sourceRefs) ? record.sourceRefs.map(norm).filter(Boolean).slice(0, 30) : [], status: norm(record.status) || 'review' })).filter(record => record.field || record.note);
    if (item.metrics?.unresolvedCount) {
      const sourceUncertainty = item.sources.reduce((count, source) => count + (source.uncertainty?.length || 0) + (source.parseError ? 1 : 0), 0);
      item.metrics.unresolvedCount.value = item.unresolvedThreads.length + sourceUncertainty;
    }
    catalog.updatedAt = new Date().toISOString(); await atomicWrite(catalog); return item;
  }
  return { list, get, rebuild, update, build, catalogPath };
}

module.exports = { createContinuityStore };
