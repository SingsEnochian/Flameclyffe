export const AR_LIGHT_DEFAULTS = {
  ambient: 0.38,
  bloom: 0.48,
  green: 0.42,
  rim: 0.52,
};

export const AR_LIGHT_PRESETS = {
  moonlit: {
    label: 'Moonlit',
    values: { ambient: 0.28, bloom: 0.34, green: 0.42, rim: 0.68 },
  },
  hearth: {
    label: 'Hearth',
    values: { ambient: 0.46, bloom: 0.72, green: 0.28, rim: 0.58 },
  },
  grove: {
    label: 'Grove',
    values: { ambient: 0.42, bloom: 0.44, green: 0.82, rim: 0.46 },
  },
  eclipse: {
    label: 'Eclipse',
    values: { ambient: 0.18, bloom: 0.26, green: 0.24, rim: 0.88 },
  },
};

export const AR_LIGHT_LIMITS = {
  min: 0,
  max: 1,
  step: 0.01,
};
