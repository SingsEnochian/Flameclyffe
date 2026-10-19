import { listWayglassAtlasWorlds, importArcSweepWorldNavigationExport } from '../world-atlas.js';
import { findWayglassWorldSeat } from '../world-seats.js';
import { buildArcSweepReturnUrl } from '../../../lib/arcsweep-wayglass-passage.js';

const esc = s => String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const sourceOrder = { 'awaiting-source-reconciliation':0, 'source-linked':1, 'owner-session-only':2 };

export async function mountWayglassWorldAtlas(root) {
  const arcsweepHref = buildArcSweepReturnUrl(globalThis.location.href);
  root.innerHTML = [
    '<section class="wg-surface wg-world-atlas" data-surface="wayglass:world-atlas">',
    '<header class="wg-surface-head glass-panel"><div><p class="eyebrow">WAYGLASS · NAVIGATION DECK</p>',
      '<h1>World Atlas</h1>',
      '<p class="lede">One ship, every indexed world. ArcSweep owns the records; Wayglass provides the doorway. Choose a destination, then enter the Writing Room. World choice is not a live crossing.</p></div>',
      '<a class="wg-atlas-arcsweep-link" href="' + esc(arcsweepHref) + '">Open ArcSweep World Registry ↗</a>',
    '</header>',
    '<section class="wg-atlas-controls glass-panel" aria-label="World navigation controls">',
      '<label for="wg-atlas-search">Find a world or related canon</label>',
      '<input type="search" id="wg-atlas-search" placeholder="Stargate, Steins;Gate, Terra Aeterna…" autocomplete="off" />',
      '<p class="tiny" id="wg-atlas-summary" role="status"></p>',
      '<details class="wg-atlas-intake"><summary>Bring in additional worlds from my ArcSweep export</summary>',
        '<p>Choose your own local JSON export. Wayglass reads only the world ID, name and kind into this browser session. It does not import private dossiers, relationships, canon, recordings, tokens or continuity receipts. No upload or external send occurs.</p>',
        '<label for="wg-atlas-import">Local JSON file</label>',
        '<input id="wg-atlas-import" type="file" accept=".json,application/json" />',
        '<p class="tiny" id="wg-atlas-import-status" role="status">Nothing imported.</p>',
      '</details>',
    '</section>',
    '<section class="wg-atlas-list" id="wg-atlas-list" aria-label="Indexed worlds"></section>',
    '<footer class="wg-atlas-footer glass-panel">',
      '<p><strong>Provenance rule:</strong> A source-linked entry identifies an existing ArcSweep source, not necessarily an approved canon scene or a live participant route. An awaiting-source entry is a named destination whose original world record has not yet been recovered. The Atlas never creates private memories or silently merges universes.</p>',
      '<p class="tiny">Steins;Gate 0 and Science Adventure remain related, separately attributed continuity references. Distinct Starsong world records remain distinct. A true return still requires the authenticated Wayglass kernel and a valid continuation receipt.</p>',
    '</footer>',
    '</section>',
  ].join('');
  const search = root.querySelector('#wg-atlas-search');
  const list = root.querySelector('#wg-atlas-list');
  const summary = root.querySelector('#wg-atlas-summary');
  const importStatus = root.querySelector('#wg-atlas-import-status');
  const fileControl = root.querySelector('#wg-atlas-import');
  function render() {
    const query = search.value.trim().toLocaleLowerCase();
    const all = [...listWayglassAtlasWorlds()].sort((a,b) =>
      (sourceOrder[a.source_status] ?? 5) - (sourceOrder[b.source_status] ?? 5) || a.name.localeCompare(b.name));
    const shown = all.filter(world =>
      [world.name,world.world_id,world.kind,world.summary,...world.related_canon]
        .some(field => String(field||'').toLocaleLowerCase().includes(query)));
    summary.textContent = shown.length + ' destinations shown · ' + all.length + ' indexed · ' +
      all.filter(w=>w.source_status==='awaiting-source-reconciliation').length + ' awaiting original source records. ' +
      'Browser-session world labels, when imported, are not persistent.';
    list.innerHTML = shown.length ? shown.map(world => [
      '<article class="wg-atlas-world glass-panel" data-world-id="' + esc(world.world_id) + '">',
        '<div class="wg-atlas-world-heading">',
          '<div><p class="eyebrow">' + esc(world.kind) + '</p><h2>' + esc(world.name) + '</h2></div>',
          '<span class="wg-atlas-source">' + esc(world.source_status.replaceAll('-',' ')) + '</span>',
        '</div>',
        '<p class="wg-atlas-description">' + esc(world.summary) + '</p>',
        world.related_canon.length ? '<details><summary>Related canon and alternate continuities</summary><ul>' +
          world.related_canon.map(item=>'<li>' + esc(item) + '</li>').join('') + '</ul></details>' : '',
        '<details><summary>Source and boundary</summary><p>World ID: <code>' + esc(world.world_id) + '</code></p>',
        '<p>Canon status: ' + esc(world.canon_status) + '</p>',
        '<p>Source references: ' + esc(world.source_refs.join(' · ')) + '</p>',
        '<p>No verified physical entry, private memory import, provider send, or world-identity transfer.</p></details>',
        '<button type="button" class="wg-atlas-enter glass-chip" data-atlas-enter="' + esc(world.world_id) + '">Choose in Writing Room →</button>',
      '</article>'
    ].join('')).join('') : '<p class="glass-panel wg-atlas-empty">No matching indexed world. Import another ArcSweep navigation export or try another search.</p>';
  }
  search.addEventListener('input',render);
  list.addEventListener('click', async event => {
    const enter = event.target.closest?.('[data-atlas-enter]');
    if (!enter) return;
    const world = findWayglassWorldSeat(enter.dataset.atlasEnter);
    if (!world) return;
    enter.disabled = true;
    try {
      const next = new URL(globalThis.location.href);
      next.searchParams.set('room','writing');
      next.searchParams.set('world',world.world_id);
      next.searchParams.set('from','atlas');
      globalThis.history?.replaceState?.(null,'',next);
      await globalThis.__wayglassOS?.mount('arcsweep:writing-room');
    } catch(error) {
      summary.textContent = 'Writing Room unavailable: ' + (error?.message || String(error));
      enter.disabled = false;
    }
  });
  fileControl.addEventListener('change', async () => {
    const file=fileControl.files?.[0];
    if (!file) return;
    if (file.size > 2_000_000) {importStatus.textContent='Export exceeds the 2 MB limit. Nothing imported.';return;}
    try {
      const data=JSON.parse(await file.text());
      const receipt=importArcSweepWorldNavigationExport(data);
      importStatus.textContent='Navigation labels added: ' + receipt.added + '; existing IDs left unchanged: ' +
        receipt.conflicts + '; invalid labels excluded: ' + receipt.rejected + '. No private records retained.';
      render();
    } catch(error){importStatus.textContent='Export not read: ' + (error?.message || String(error));}
    finally {fileControl.value='';}
  });
  render();
}
