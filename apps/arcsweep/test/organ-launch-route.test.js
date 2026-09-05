import test from 'node:test';
import assert from 'node:assert/strict';
import { APPLET_CATALOGUE, appletLaunchTarget, contextualAppletLaunchTarget } from '../src/applets.js';

const vercel = { hostname: 'flameclyffe.vercel.app', origin: 'https://flameclyffe.vercel.app' };
const pages = { hostname: 'singsenochian.github.io', origin: 'https://singsenochian.github.io' };
const organIds = APPLET_CATALOGUE.filter((item) => item.pagesHref).map((item) => item.id);

test('every linked organ declares host-neutral Vercel and GitHub Pages routes', () => {
  for (const id of organIds) {
    const organ = APPLET_CATALOGUE.find((item) => item.id === id);
    assert.ok(organ.webHref, `${id} is missing its Vercel route`);
    assert.ok(organ.pagesHref, `${id} is missing its GitHub Pages route`);
  }
});

test('Vercel organ links never leak the GitHub Pages repository prefix', () => {
  for (const id of organIds) {
    const href = appletLaunchTarget(id, vercel);
    assert.ok(href.startsWith('/'), `${id} must remain same-origin`);
    assert.doesNotMatch(href, /^\/Flameclyffe\//, `${id} leaked a GitHub Pages path into Vercel`);
  }
  assert.equal(appletLaunchTarget('haptics', vercel), '/arcsweep/?soundOrgan=haptics');
  assert.equal(appletLaunchTarget('tone-lab', vercel), '/world-tone-approval/');
});

test('GitHub Pages organ links retain the repository and lab prefixes', () => {
  for (const id of organIds) assert.match(appletLaunchTarget(id, pages), /^\/Flameclyffe\//);
  assert.equal(appletLaunchTarget('haptics', pages), '/Flameclyffe/apps/arcsweep/?soundOrgan=haptics');
  assert.equal(appletLaunchTarget('tone-lab', pages), '/Flameclyffe/starwell-react-lab/world-tone-approval/');
});

test('contextual links preserve instrument and world identity on either host', () => {
  const href = contextualAppletLaunchTarget('runa', {
    worldId: 'terra-prime',
    worldName: 'Terra Prime',
    worldseedFingerprint: 'sha256:abc',
  }, vercel);
  assert.match(href, /^\/arcsweep\/\?/);
  assert.match(href, /soundOrgan=runa/);
  assert.match(href, /worldId=terra-prime/);
  assert.match(href, /worldseed=sha256%3Aabc/);
  assert.match(href, /appletId=runa/);
});
