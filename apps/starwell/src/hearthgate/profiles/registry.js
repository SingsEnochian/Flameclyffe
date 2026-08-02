import { taVerenVaenProfile } from './ta-veren-vaen.js';
import { terraAeternaProfile } from './terra-aeterna.js';
import { unregisteredHouseProfile } from './unregistered-house.js';

function normaliseSlug(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[’']/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const aliases = new Map([
  ['terra-aeterna', terraAeternaProfile],
  ['ta-veren-vaen', taVerenVaenProfile],
  ['taveren-vaen', taVerenVaenProfile],
  ['ta-veren-unbound', taVerenVaenProfile],
]);

export const houseProfiles = Object.freeze([
  terraAeternaProfile,
  taVerenVaenProfile,
]);

export function resolveHouseProfile(worldSlug) {
  return aliases.get(normaliseSlug(worldSlug)) ?? unregisteredHouseProfile;
}

export function getHouseProfile(profileId) {
  const normalised = normaliseSlug(profileId);
  return houseProfiles.find((profile) => normaliseSlug(profile.id) === normalised)
    ?? unregisteredHouseProfile;
}

export { normaliseSlug as normaliseHouseSlug };
