import {
  searchWayglassLibrary,
  listWayglassLibraryWonders,
  createWayglassLibraryWonder,
  complexifyWayglassLibraryWonder,
} from '../route-client.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function lines(value = '') {
  return String(value).split('\n').map(item => item.trim()).filter(Boolean);
}

function renderRecords(records = []) {
  if (!records.length) return '<p class="tiny">No matching Wayglass Library records.</p>';
  return records.map(record => [
    '<article class="glass-panel">',
      '<p class="eyebrow">'+escapeHtml(record.claim_type)+' · '+escapeHtml(record.domain)+'</p>',
      '<h3>'+escapeHtml(record.title)+'</h3>',
      '<p>'+escapeHtml(record.summary)+'</p>',
      '<p class="tiny">Status · '+escapeHtml(record.status)+' · '+escapeHtml(record.id)+'</p>',
    '</article>'
  ].join('')).join('');
}

function renderWonders(wonders = [], selectedId = '') {
  if (!wonders.length) return '<p class="tiny">No open Wonder branches yet.</p>';
  return wonders.map(wonder => {
    const selected = wonder.wonder_id === selectedId;
    return [
      '<button type="button" class="glass-panel" data-wayglass-library-wonder="'+escapeHtml(wonder.wonder_id)+'" aria-pressed="'+String(selected)+'">',
        '<p class="eyebrow">Counterfactual Wonder · '+escapeHtml(wonder.wonder_id)+'</p>',
        '<strong>'+escapeHtml(wonder.proposition)+'</strong>',
        '<span class="tiny">Could be false · explore as if true · '+(wonder.complexifications?.length||0)+' frame rotation(s)</span>',
      '</button>'
    ].join('');
  }).join('');
}

export async function mountWayglassLibrarySurface(root) {
  let selectedWonderId = '';
  let wonders = [];

  root.innerHTML = [
    '<section class="wg-surface" data-surface="wayglass-research-library">',
      '<nav class="wg-deck-nav glass-panel" aria-label="Wayglass rooms">',
        '<button type="button" class="glass-chip" data-wayglass-room="arcsweep:writing-room">Writing Room</button>',
        '<button type="button" class="glass-chip" data-wayglass-room="wayglass:living-observer">Living Observer</button>',
        '<button type="button" class="glass-chip active" aria-current="page">Library</button>',
        '<button type="button" class="glass-chip" data-wayglass-room="wayglass:continuity-ledger">Ledger</button>',
        '<button type="button" class="glass-chip" data-wayglass-room="wayglass:systems">Organs</button>',
      '</nav>',
      '<header class="wg-surface-head glass-panel">',
        '<div><p class="eyebrow">Wayglass OS · Wonder Window</p>',
        '<h1>The Library</h1>',
        '<p class="lede">This could be false. But what if it were true? Preserve the branch, add the missing axis, rotate the frame, then translate consequences back.</p></div>',
      '</header>',
      '<section class="glass-panel">',
        '<h2>Search the stacks</h2>',
        '<div class="composer-foot"><input id="wg-lib-search" placeholder="continuity, myth, phase, Observer…" aria-label="Search Wayglass Research Library" />',
        '<button id="wg-lib-search-button" type="button" class="glass-chip">Search</button></div>',
        '<div id="wg-lib-results"></div>',
      '</section>',
      '<section class="glass-panel">',
        '<p class="eyebrow">Counterfactual Wonder</p>',
        '<h2>Open a branch</h2>',
        '<label>Proposition<textarea id="wg-lib-proposition" rows="3" placeholder="This could be false. But what if…"></textarea></label>',
        '<label>Why is it interesting?<textarea id="wg-lib-why" rows="2"></textarea></label>',
        '<label>Implications, one per line<textarea id="wg-lib-implications" rows="2"></textarea></label>',
        '<label>Predictions, one per line<textarea id="wg-lib-predictions" rows="2"></textarea></label>',
        '<label>Discriminators, one per line<textarea id="wg-lib-discriminators" rows="2"></textarea></label>',
        '<button id="wg-lib-create-wonder" type="button" class="send-jewel">Preserve Wonder</button>',
      '</section>',
      '<section class="glass-panel">',
        '<p class="eyebrow">Open branches</p>',
        '<h2>Wonder shelf</h2>',
        '<div id="wg-lib-wonders"></div>',
      '</section>',
      '<section class="glass-panel">',
        '<p class="eyebrow">Complexify</p>',
        '<h2>Add the missing axis</h2>',
        '<p class="tiny" id="wg-lib-selected">Select a Wonder branch above.</p>',
        '<label>Current frame<textarea id="wg-lib-current-frame" rows="2" placeholder="What representation makes this look impossible?"></textarea></label>',
        '<label>Apparent impossibility<textarea id="wg-lib-impossibility" rows="2"></textarea></label>',
        '<label>Missing dimension(s), one per line<textarea id="wg-lib-missing-axis" rows="2" placeholder="phase, scale, relation, state variable…"></textarea></label>',
        '<label>Frame rotation(s), one per line<textarea id="wg-lib-rotation" rows="2" placeholder="Describe the same object in the enlarged basis."></textarea></label>',
        '<label>Invariant(s), one per line<textarea id="wg-lib-invariant" rows="2" placeholder="What survives the rotation?"></textarea></label>',
        '<label>Translate back, one per line<textarea id="wg-lib-translation" rows="2" placeholder="What new consequence appears in the ordinary frame?"></textarea></label>',
        '<label>Prediction(s), one per line<textarea id="wg-lib-complex-prediction" rows="2"></textarea></label>',
        '<label>Discriminator(s), one per line<textarea id="wg-lib-complex-discriminator" rows="2"></textarea></label>',
        '<button id="wg-lib-complexify" type="button" class="send-jewel" disabled>Complexify selected branch</button>',
        '<p id="wg-lib-status" role="status" class="tiny">Wonder first. Evidence earns jurisdiction later.</p>',
      '</section>',
      '<footer class="wg-receipt tiny">Wayglass stores the branch, frame rotations, provenance, and return state. External systems may participate only through explicit adapters.</footer>',
    '</section>',
  ].join('');

  root.querySelectorAll('[data-wayglass-room]').forEach(button => {
    button.addEventListener('click', () => globalThis.__wayglassOS?.mount(button.dataset.wayglassRoom));
  });

  const status = root.querySelector('#wg-lib-status');
  const results = root.querySelector('#wg-lib-results');
  const wonderList = root.querySelector('#wg-lib-wonders');
  const selected = root.querySelector('#wg-lib-selected');
  const complexifyButton = root.querySelector('#wg-lib-complexify');

  function refreshWonderList() {
    wonderList.innerHTML = renderWonders(wonders, selectedWonderId);
    const active = wonders.find(item => item.wonder_id === selectedWonderId);
    selected.textContent = active
      ? 'Selected · ' + active.proposition + ' · ' + active.wonder_id
      : 'Select a Wonder branch above.';
    complexifyButton.disabled = !active;
  }

  async function loadWonders() {
    try {
      const data = await listWayglassLibraryWonders();
      wonders = data.wonders || [];
      if (selectedWonderId && !wonders.some(item => item.wonder_id === selectedWonderId)) selectedWonderId = '';
      refreshWonderList();
    } catch (error) {
      status.textContent = 'Wonder shelf unavailable · ' + error.message;
    }
  }

  root.querySelector('#wg-lib-search-button').addEventListener('click', async () => {
    try {
      const data = await searchWayglassLibrary({ query: root.querySelector('#wg-lib-search').value });
      results.innerHTML = renderRecords(data.records || []);
      status.textContent = 'Found ' + data.count + ' Wayglass Library record' + (data.count === 1 ? '' : 's') + '.';
    } catch (error) {
      status.textContent = 'Search failed · ' + error.message;
    }
  });

  root.querySelector('#wg-lib-create-wonder').addEventListener('click', async () => {
    const proposition = root.querySelector('#wg-lib-proposition').value.trim();
    if (!proposition) {
      status.textContent = 'Give the Wonder branch a proposition first.';
      return;
    }
    try {
      const wonder = await createWayglassLibraryWonder({
        proposition,
        why_interesting: root.querySelector('#wg-lib-why').value,
        implications: lines(root.querySelector('#wg-lib-implications').value),
        predictions: lines(root.querySelector('#wg-lib-predictions').value),
        discriminators: lines(root.querySelector('#wg-lib-discriminators').value),
        source_refs: ['wayglass:research-library'],
        created_by: 'Wayglass participant',
      });
      selectedWonderId = wonder.wonder_id;
      status.textContent = 'Wonder preserved · ' + wonder.wonder_id + '. It has not been promoted to fact.';
      await loadWonders();
    } catch (error) {
      status.textContent = 'Could not preserve Wonder · ' + error.message;
    }
  });

  wonderList.addEventListener('click', event => {
    const button = event.target.closest('[data-wayglass-library-wonder]');
    if (!button) return;
    selectedWonderId = button.dataset.wayglassLibraryWonder;
    refreshWonderList();
    globalThis.dispatchEvent?.(new CustomEvent('wayglass:material-wake', {detail:{strength:.72,intent:.9}}));
  });

  complexifyButton.addEventListener('click', async () => {
    if (!selectedWonderId) return;
    const currentFrame = root.querySelector('#wg-lib-current-frame').value.trim();
    if (!currentFrame) {
      status.textContent = 'Name the current frame before enlarging it.';
      return;
    }
    complexifyButton.disabled = true;
    try {
      const result = await complexifyWayglassLibraryWonder({
        wonderId: selectedWonderId,
        current_frame: currentFrame,
        apparent_impossibility: root.querySelector('#wg-lib-impossibility').value,
        missing_dimensions: lines(root.querySelector('#wg-lib-missing-axis').value),
        rotations: lines(root.querySelector('#wg-lib-rotation').value),
        invariants: lines(root.querySelector('#wg-lib-invariant').value),
        translated_consequences: lines(root.querySelector('#wg-lib-translation').value),
        predictions: lines(root.querySelector('#wg-lib-complex-prediction').value),
        discriminators: lines(root.querySelector('#wg-lib-complex-discriminator').value),
        created_by: 'Wayglass participant',
      });
      status.textContent = 'Frame enlarged · ' + result.complexification.complexification_id + '. Translate back, then test what deserves testing.';
      await loadWonders();
    } catch (error) {
      status.textContent = 'Complexify failed · ' + error.message;
    } finally {
      complexifyButton.disabled = !selectedWonderId;
    }
  });

  await loadWonders();
  try {
    const data = await searchWayglassLibrary({ query: '', limit: 10 });
    results.innerHTML = renderRecords(data.records || []);
  } catch {}

  return Object.freeze({ surface_id:'wayglass:library' });
}
