export const HOUSE_COMMANDS = Object.freeze([
  {
    name: 'ask',
    description: 'Invoke this Caretaker directly through their named House route.',
    dm_permission: false,
    options: [
      {
        type: 3,
        name: 'prompt',
        description: 'What you want to ask or place before this Caretaker.',
        required: true,
        max_length: 4000,
      },
      {
        type: 3,
        name: 'context',
        description: 'How much approved context the route may use.',
        required: false,
        choices: [
          { name: 'Light', value: 'light' },
          { name: 'Full approved packet', value: 'full' },
        ],
      },
      {
        type: 3,
        name: 'route',
        description: 'Yggdrasil only: local root or explicit DeepSeek fallback.',
        required: false,
        choices: [
          { name: 'Primary', value: 'primary' },
          { name: 'Local', value: 'local' },
          { name: 'DeepSeek', value: 'deepseek' },
        ],
      },
    ],
  },
  {
    name: 'report',
    description: 'Ask this Caretaker for a truth-labelled Hearthweave report.',
    dm_permission: false,
    options: [
      {
        type: 3,
        name: 'focus',
        description: 'Optional focus for the report.',
        required: false,
        max_length: 1000,
      },
    ],
  },
  {
    name: 'status',
    description: 'Show this Caretaker route, office, and current operating state.',
    dm_permission: false,
  },
  {
    name: 'hush',
    description: 'Pause this Caretaker until an allowed caller wakes the route.',
    dm_permission: false,
  },
  {
    name: 'wake',
    description: 'Wake this Caretaker after a hush.',
    dm_permission: false,
  },
]);
