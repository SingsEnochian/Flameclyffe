export const YGG_AUTH_PROVIDERS = Object.freeze({
  disabled: 'disabled',
  mock: 'mock',
  supabase: 'supabase',
});

export const YGG_ACCOUNT_STATES = Object.freeze({
  contractOnly: 'contract-only',
  localPreview: 'local-preview',
  active: 'active',
  paused: 'paused',
  deleted: 'deleted',
});

export const YGG_LOGIN_METHODS = Object.freeze({
  magicLink: 'magic-link',
  emailPassword: 'email-password',
  oauth: 'oauth',
  passkey: 'passkey',
  localPreview: 'local-preview',
});

export const YGG_PRIVACY_LEVELS = Object.freeze({
  private: 'private',
  shared: 'shared',
  public: 'public',
});

export function createYggdrasilCustomization(overrides = {}) {
  const base = {
    displayName: 'Guest Seed',
    handle: '',
    avatarGlyph: '🌱',
    palette: 'velvet-twilight',
    branchStyle: 'soft-vines',
    rootAccent: 'moon-gold',
    preferredRooms: ['templehouse', 'ygg-gate'],
    accessibility: {
      reducedMotion: false,
      sensoryQuiet: false,
      captions: true,
      plainPassDefault: false,
    },
    sound: {
      defaultPatch: 'north_star_still',
      allowFuturePlayback: false,
      maxGain: 0.06,
      orbitDefault: false,
    },
    privacy: {
      profile: YGG_PRIVACY_LEVELS.private,
      customizations: YGG_PRIVACY_LEVELS.private,
      presence: YGG_PRIVACY_LEVELS.private,
    },
  };

  return {
    ...base,
    ...overrides,
    accessibility: { ...base.accessibility, ...(overrides.accessibility ?? {}) },
    sound: { ...base.sound, ...(overrides.sound ?? {}) },
    privacy: { ...base.privacy, ...(overrides.privacy ?? {}) },
    preferredRooms: overrides.preferredRooms ?? base.preferredRooms,
  };
}

export function createYggdrasilAccount(overrides = {}) {
  const base = {
    id: 'local-preview-account',
    authUserId: null,
    provider: YGG_AUTH_PROVIDERS.mock,
    state: YGG_ACCOUNT_STATES.localPreview,
    loginMethods: [YGG_LOGIN_METHODS.localPreview],
    profile: {
      displayName: 'Guest Seed',
      handle: '',
      emailVisible: false,
    },
    customization: createYggdrasilCustomization(),
    consent: {
      termsAccepted: false,
      customizeYggdrasil: true,
      storeCustomization: false,
      sharePresence: false,
      allowEmails: false,
    },
    security: {
      serviceRoleKeyPresent: false,
      storesPassword: false,
      storesAccessToken: false,
      requiresRls: true,
    },
    provenance: 'local preview account / no live auth session',
  };

  return {
    ...base,
    ...overrides,
    profile: { ...base.profile, ...(overrides.profile ?? {}) },
    customization: overrides.customization ?? base.customization,
    consent: { ...base.consent, ...(overrides.consent ?? {}) },
    security: { ...base.security, ...(overrides.security ?? {}) },
    loginMethods: overrides.loginMethods ?? base.loginMethods,
  };
}

export function createYggdrasilAuthPlan(overrides = {}) {
  const base = {
    provider: YGG_AUTH_PROVIDERS.supabase,
    state: YGG_ACCOUNT_STATES.contractOnly,
    enabledInPortalKernel: false,
    accountCreation: {
      enabled: false,
      method: YGG_LOGIN_METHODS.magicLink,
      createsPublicProfile: true,
      createsCustomizationRow: true,
      requiresEmailVerification: true,
    },
    allowedClientKeys: ['publishable', 'anon-legacy'],
    forbiddenClientSecrets: ['service_role', 'sb_secret'],
    dataTables: ['starwell_profiles', 'starwell_customizations'],
    rlsRequired: true,
    notes: ['Auth is future-facing in Portal Kernel v0.1. The lab may create mock/local preview accounts only.'],
  };

  return {
    ...base,
    ...overrides,
    accountCreation: { ...base.accountCreation, ...(overrides.accountCreation ?? {}) },
    allowedClientKeys: overrides.allowedClientKeys ?? base.allowedClientKeys,
    forbiddenClientSecrets: overrides.forbiddenClientSecrets ?? base.forbiddenClientSecrets,
    dataTables: overrides.dataTables ?? base.dataTables,
    notes: overrides.notes ?? base.notes,
  };
}

export function validateYggdrasilCustomization(customization) {
  const errors = [];
  if (!customization || typeof customization !== 'object') errors.push('Yggdrasil customization must be an object.');
  if (!customization?.displayName) errors.push('Yggdrasil customization requires displayName.');
  if (customization?.sound?.allowFuturePlayback && customization?.sound?.maxGain > 0.08) {
    errors.push('Future sound maxGain must stay at or below 0.08 for customizations.');
  }
  for (const level of Object.values(customization?.privacy ?? {})) {
    if (!Object.values(YGG_PRIVACY_LEVELS).includes(level)) errors.push(`Unknown privacy level: ${level}`);
  }
  return errors;
}

export function validateYggdrasilAccount(account) {
  const errors = [];
  if (!account || typeof account !== 'object') errors.push('Yggdrasil account must be an object.');
  if (!account?.id) errors.push('Yggdrasil account requires id.');
  if (!Object.values(YGG_AUTH_PROVIDERS).includes(account?.provider)) errors.push(`Unknown auth provider: ${account?.provider}`);
  if (!Object.values(YGG_ACCOUNT_STATES).includes(account?.state)) errors.push(`Unknown account state: ${account?.state}`);
  if (account?.security?.serviceRoleKeyPresent) errors.push('Service role keys must never be present in client account state.');
  if (account?.security?.storesPassword) errors.push('Client account state must not store passwords.');
  if (account?.security?.storesAccessToken) errors.push('Client account state must not store access tokens.');
  errors.push(...validateYggdrasilCustomization(account?.customization));
  return errors;
}

export function validateYggdrasilAuthPlan(plan) {
  const errors = [];
  if (!plan || typeof plan !== 'object') errors.push('Yggdrasil auth plan must be an object.');
  if (!Object.values(YGG_AUTH_PROVIDERS).includes(plan?.provider)) errors.push(`Unknown auth plan provider: ${plan?.provider}`);
  if (plan?.enabledInPortalKernel) errors.push('Live auth must stay disabled in Portal Kernel v0.1.');
  if (!plan?.rlsRequired) errors.push('Yggdrasil auth plan requires RLS.');
  if ((plan?.forbiddenClientSecrets ?? []).length === 0) errors.push('Yggdrasil auth plan must list forbidden client secrets.');
  return errors;
}
