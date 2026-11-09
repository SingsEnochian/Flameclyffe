'use strict';
// Permit embedding of the staged public ArcSweep tree, never a path alias or API.
function arcSweepFramePolicy(pathname) {
  const clean = typeof pathname === 'string' && !/[\\%?#]/.test(pathname) &&
    !pathname.split('/').some(segment => segment === '.' || segment === '..');
  return clean && (pathname === '/arcsweep' || pathname.startsWith('/arcsweep/')) ? 'SAMEORIGIN' : 'DENY';
}
module.exports = { arcSweepFramePolicy };
