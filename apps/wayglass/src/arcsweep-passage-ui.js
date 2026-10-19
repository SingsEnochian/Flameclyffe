import {
  ARCSWEEP_WAYGLASS_PASSAGE_SCHEMA,
  WAYGLASS_SOURCE_AS_OF,
  WAYGLASS_SOURCE_NOTES,
  buildArcSweepReturnUrl,
  readArcSweepArrival,
} from '../../../lib/arcsweep-wayglass-passage.js';
import { findWayglassWorldSeat } from './world-seats.js';

const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

export function renderArcSweepPassagePanel(currentHref, search = '') {
  const arrival = readArcSweepArrival(search);
  const matchingWorld = arrival?.source_world_id ? findWayglassWorldSeat(arrival.source_world_id) : null;
  const sourceMessage = arrival?.source_world_id
    ? 'Unverified navigation hint for ArcSweep world ' + arrival.source_world_id
    : arrival ? 'ArcSweep arrival without a world identifier' : 'ArcSweep connection available';
  const matchMarkup = matchingWorld
    ? '<button type="button" class="glass-chip" id="wg-passage-match-world">Select matching Wayglass world</button>'
    : '';
  const detail = arrival?.source_world_id && !matchingWorld
    ? '<span class="wg-passage-caution">No matching Wayglass world seat. Keep the ArcSweep world separate until explicitly mapped.</span>'
    : '<span class="wg-passage-caution">No memories, credentials, relationships or canon were imported.</span>';
  return [
    '<section class="wg-passage-board glass-panel" aria-labelledby="wg-passage-heading" data-passage-schema="' + ARCSWEEP_WAYGLASS_PASSAGE_SCHEMA + '">',
      '<div class="wg-passage-intro">',
        '<div><p class="eyebrow">ARC SWEEP ↔ WAYGLASS · NAVIGATION ONLY</p>',
        '<h2 id="wg-passage-heading">The Passage</h2>',
        '<p class="wg-passage-source" role="status">' + escapeHtml(sourceMessage) + '</p>',
        '<p class="tiny">Source hint only. The Writing Room remains private until you explicitly choose a world and author a turn.</p>',
        detail, matchMarkup, '</div>',
        '<a class="wg-passage-return" href="' + escapeHtml(buildArcSweepReturnUrl(currentHref)) + '">↶ Return to ArcSweep</a>',
      '</div>',
      '<details class="wg-passage-notes">',
        '<summary>Latest source & verification notes <span class="wg-passage-date">as of ' + WAYGLASS_SOURCE_AS_OF + ' · not a live feed</span></summary>',
        '<ul>',
          WAYGLASS_SOURCE_NOTES.map(note =>
            '<li><a href="' + escapeHtml(note.url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(note.label) + ' ↗</a><small>' + escapeHtml(note.status) + '</small></li>'
          ).join(''),
        '</ul>',
        '<p class="tiny">Open PRs are proposals, not deployed functions. Authentication, browser/device and real provider replies require separate evidence.</p>',
      '</details>',
    '</section>',
  ].join('');
}

export function installArcSweepPassageWorldAction(root, search = '') {
  const button = root?.querySelector?.('#wg-passage-match-world');
  const arrival = readArcSweepArrival(search);
  const matchingWorld = findWayglassWorldSeat(arrival?.source_world_id);
  if (!button || !matchingWorld) return false;
  button.addEventListener('click', () => {
    const select = root.querySelector('#wg-world-seat');
    if (!select || !Array.from(select.options).some(item => item.value === matchingWorld.world_id)) return;
    select.value = matchingWorld.world_id;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    button.textContent = 'World selected';
    button.disabled = true;
  });
  return true;
}
