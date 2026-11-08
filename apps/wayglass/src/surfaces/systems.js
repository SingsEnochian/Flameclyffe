import { listWayglassOrgans } from '../organ-registry.js';
import { inspectWayglassDoubleMobius } from '../route-client.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function organKind(id) {
  if (id.includes('presence')) return 'presence';
  if (id.includes('memory')) return 'memory';
  if (id.includes('sensorium')) return 'sensorium';
  return 'system';
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
        '<button type="button" class="glass-chip active" aria-current="page">Organs</button><button type="button" class="glass-chip" data-wayglass-room="wayglass:spectral-field">Full Spectrum</button>',
        '<button type="button" class="glass-chip" data-wayglass-room="wayglass:video-atelier">Video Atelier</button><button type="button" class="glass-chip" data-wayglass-room="wayglass:living-observer">Living Observer</button><button type="button" class="glass-chip" data-wayglass-room="wayglass:toybox">Toybox</button>',
      '</nav>',
      '<section class="glass-panel" data-double-mobius-panel aria-label="Gateway double Möbius engine" style="border-radius:1.5rem;padding:1.25rem;margin-block:1rem;">',
        '<p class="eyebrow">Gateway × Wayglass · coupled engine</p>',
        '<h2>Double Möbius</h2>',
        '<p>Two rounded, reciprocal crossings: Gateway state transformation and Wayglass information-and-continuity return. One Withness centre, distinct provenance, and no automatic playback.</p>',
        '<div style="display:flex;gap:.75rem;flex-wrap:wrap;">',
          '<button type="button" class="glass-chip" data-double-mobius-inspect>Inspect installed engine</button>',
          '<button type="button" class="glass-chip" data-double-mobius-writing>Open Writing Room to speak with Wayglass</button>',
        '</div>',
        '<p role="status" data-double-mobius-status>Engine route not inspected. Live model availability is separate.</p>',
      '</section>',
      '<section class="organ-bay" aria-label="Mounted Wayglass organs">',
        organs.map((organ, index) => [
          '<article class="organ-vessel glass-panel" tabindex="0" data-organ="' + escapeHtml(organ.organ_id) + '" data-organ-kind="' + organKind(organ.organ_id) + '" aria-expanded="false" style="--organ-index:' + index + '">',
            '<div class="organ-core" aria-hidden="true"><i></i><b></b><span></span></div>',
            '<div class="organ-copy">',
              '<div class="organ-title"><p class="eyebrow">' + escapeHtml(organ.maturity) + '</p><h2>' + escapeHtml(shortName(organ.organ_id)) + '</h2></div>',
              '<p class="organ-role">' + escapeHtml(organ.authority_ceiling.slice(0,2).join(' · ')) + '</p>',
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

  const inspectButton = root.querySelector('[data-double-mobius-inspect]');
  const engineStatus = root.querySelector('[data-double-mobius-status]');
  inspectButton?.addEventListener('click', async () => {
    inspectButton.disabled = true;
    engineStatus.textContent = 'Checking the authenticated Gateway ↔ Wayglass host route…';
    try {
      const status = await inspectWayglassDoubleMobius();
      engineStatus.textContent = status.status === 'available-in-host'
        ? 'Double Möbius engine reachable · Eightfold '+ status.phases.length
          +' · Focus profiles '+ status.focus_profiles.length
          +' · host inspection only; no live model response or audio started.'
        : 'Engine returned: ' + String(status.status || 'unrecognised');
    } catch (error) {
      engineStatus.textContent = 'Engine not reachable through this session: ' + error.message;
    } finally {
      inspectButton.disabled = false;
    }
  });
  root.querySelector('[data-double-mobius-writing]')?.addEventListener('click', () => {
    globalThis.__wayglassOS?.mount('arcsweep:writing-room');
  });
  root.querySelectorAll('[data-wayglass-room]').forEach(button => {
    button.addEventListener('click', () => globalThis.__wayglassOS?.mount(button.dataset.wayglassRoom));
  });
  root.querySelectorAll('.organ-vessel').forEach(card => {
    const wake = () => globalThis.dispatchEvent?.(new CustomEvent('wayglass:material-wake', { detail: { strength: .62, intent: .45 } }));
    const setInspection = (open) => {
      card.dataset.inspecting = open ? 'true' : 'false';
      card.setAttribute('aria-expanded', String(open));
      if (open) wake();
    };
    card.addEventListener('pointerenter', () => setInspection(true));
    card.addEventListener('pointerleave', () => setInspection(false));
    card.addEventListener('focus', () => setInspection(true));
    card.addEventListener('blur', () => setInspection(false));
    card.addEventListener('click', (event) => {
      if (event.target.closest('details, summary')) return;
      setInspection(card.dataset.inspecting !== 'true');
    });
  });
}
