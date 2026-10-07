import { listWayglassOrgans } from '../organ-registry.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function shortName(id) {
  return String(id).replace('wayglass.organ.', '').split('-').map(word => word[0]?.toUpperCase() + word.slice(1)).join(' ');
}

export async function mountWayglassSystemsSurface(root) {
  const organs = listWayglassOrgans();
  root.innerHTML = [
    '<section class="wg-surface wg-systems" data-surface="wayglass-systems">',
      '<header class="wg-surface-head glass-panel">',
        '<div><p class="eyebrow">Wayglass · ship systems</p><h1>Organs</h1>',
        '<p class="lede">Installed machinery serving the voyage. An organ may observe, carry, render or replay within its declared ceiling. It does not become the traveller.</p></div>',
        '<div class="systems-vitals" aria-label="Ship organ status">',
          '<span><strong>' + organs.length + '</strong> mounted</span>',
          '<span><strong>0</strong> authority escalations</span>',
          '<span><strong>1</strong> registry contract</span>',
        '</div>',
      '</header>',
      '<nav class="wg-deck-nav glass-panel" aria-label="Wayglass rooms">',
        '<button type="button" class="glass-chip" data-wayglass-room="arcsweep:writing-room">Writing Room</button>',
        '<button type="button" class="glass-chip active" aria-current="page">Organs</button>',
      '</nav>',
      '<section class="organ-bay" aria-label="Mounted Wayglass organs">',
        organs.map((organ, index) => [
          '<article class="organ-vessel glass-panel" tabindex="0" data-organ="' + escapeHtml(organ.organ_id) + '" style="--organ-index:' + index + '">',
            '<div class="organ-core" aria-hidden="true"><i></i><b></b><span></span></div>',
            '<div class="organ-copy">',
              '<div class="organ-title"><p class="eyebrow">' + escapeHtml(organ.maturity) + '</p><h2>' + escapeHtml(shortName(organ.organ_id)) + '</h2></div>',
              '<p class="organ-lineage">Lineage · ' + organ.lineage.map(escapeHtml).join(' · ') + '</p>',
              '<div class="organ-tags">' + organ.capabilities.map(cap => '<span>' + escapeHtml(cap) + '</span>').join('') + '</div>',
              '<details><summary>Authority ceiling & evidence</summary>',
                '<p><strong>Ceiling:</strong> ' + organ.authority_ceiling.map(escapeHtml).join(' · ') + '</p>',
                '<p><strong>Receipts:</strong> ' + organ.receipt_schemas.map(escapeHtml).join(' · ') + '</p>',
                '<p><strong>Evidence:</strong> ' + organ.evidence.map(escapeHtml).join(' · ') + '</p>',
              '</details>',
            '</div>',
          '</article>'
        ].join('')).join(''),
      '</section>',
      '<footer class="wg-receipt tiny">Wayglass is the ship. These are mounted organs, not identities, worlds, or canon authorities.</footer>',
    '</section>'
  ].join('');

  root.querySelectorAll('[data-wayglass-room]').forEach(button => {
    button.addEventListener('click', () => globalThis.__wayglassOS?.mount(button.dataset.wayglassRoom));
  });
  root.querySelectorAll('.organ-vessel').forEach(card => {
    const wake = () => globalThis.dispatchEvent?.(new CustomEvent('wayglass:material-wake', { detail: { strength: .62, intent: .45 } }));
    card.addEventListener('pointerenter', wake);
    card.addEventListener('focus', wake);
  });
}
