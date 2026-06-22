import { createYggdrasilAccount, createYggdrasilCustomization, validateYggdrasilAccount } from './yggdrasilAccountSchema.js';

export function createYggdrasilLocalAccountAdapter(seed = {}) {
  let account = createYggdrasilAccount({
    id: seed.id ?? 'local-preview-account',
    profile: {
      displayName: seed.displayName ?? 'Guest Seed',
      handle: seed.handle ?? '',
      emailVisible: false,
    },
    customization: createYggdrasilCustomization(seed.customization ?? {}),
  });

  const validationErrors = validateYggdrasilAccount(account);
  if (validationErrors.length) {
    throw new Error(`Invalid Yggdrasil local account: ${validationErrors.join(' ')}`);
  }

  return {
    getAccount() {
      return account;
    },
    createPreviewAccount(options = {}) {
      account = createYggdrasilAccount({
        id: options.id ?? `local-preview-${Date.now()}`,
        profile: {
          displayName: options.displayName ?? account.profile.displayName,
          handle: options.handle ?? account.profile.handle,
          emailVisible: false,
        },
        customization: createYggdrasilCustomization({
          ...account.customization,
          ...(options.customization ?? {}),
        }),
        consent: {
          ...account.consent,
          customizeYggdrasil: true,
          storeCustomization: false,
        },
      });
      return account;
    },
    updateCustomization(nextCustomization = {}) {
      account = createYggdrasilAccount({
        ...account,
        customization: createYggdrasilCustomization({
          ...account.customization,
          ...nextCustomization,
          accessibility: {
            ...account.customization.accessibility,
            ...(nextCustomization.accessibility ?? {}),
          },
          sound: {
            ...account.customization.sound,
            ...(nextCustomization.sound ?? {}),
          },
          privacy: {
            ...account.customization.privacy,
            ...(nextCustomization.privacy ?? {}),
          },
        }),
      });
      return account;
    },
    reset() {
      account = createYggdrasilAccount();
      return account;
    },
  };
}
