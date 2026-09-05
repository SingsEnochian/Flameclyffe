const GITHUB_PAGES_HOST = /(?:^|\.)github\.io$/i;

function locationSnapshot(locationLike = globalThis.location) {
  return {
    hostname: String(locationLike?.hostname || ''),
    origin: String(locationLike?.origin || ''),
  };
}

export function organLaunchHref(organ, locationLike = globalThis.location) {
  if (!organ) return '';
  const { hostname } = locationSnapshot(locationLike);
  if (!hostname || GITHUB_PAGES_HOST.test(hostname)) return organ.pagesHref || organ.webHref || '';
  return organ.webHref || organ.pagesHref || '';
}

export function contextualOrganLaunchHref(organ, context = {}, locationLike = globalThis.location) {
  const href = organLaunchHref(organ, locationLike);
  if (!href) return '';
  const { origin } = locationSnapshot(locationLike);
  const base = origin || 'https://flameclyffe.vercel.app';
  const url = new URL(href, base);
  if (context.worldId) url.searchParams.set('worldId', context.worldId);
  if (context.worldName) url.searchParams.set('worldName', context.worldName);
  if (context.worldseedFingerprint) url.searchParams.set('worldseed', context.worldseedFingerprint);
  if (context.appletId) url.searchParams.set('appletId', context.appletId);
  if (context.from) url.searchParams.set('from', context.from);
  return href.startsWith('/') && url.origin === base ? `${url.pathname}${url.search}${url.hash}` : url.toString();
}
