'use strict';

// Canonical keyboard map for writing room tones.
// The Electron main process can register these as globalShortcut entries.
// The renderer uses apps/starwell/src/components/writer/tone-keyboard-bind.js
// which mirrors this contract and owns the Web Audio playback.

const TONE_PATCHES = [
  { id: 'dreaming', label: 'Between the Dreaming', key: 'Ctrl+Alt+1', electronKey: 'CmdOrCtrl+Alt+1' },
  { id: 'loch',     label: 'Lochflame',            key: 'Ctrl+Alt+2', electronKey: 'CmdOrCtrl+Alt+2' },
  { id: 'hearth',   label: 'Hearthfire',           key: 'Ctrl+Alt+3', electronKey: 'CmdOrCtrl+Alt+3' },
  { id: 'starfall', label: 'Starfall',             key: 'Ctrl+Alt+4', electronKey: 'CmdOrCtrl+Alt+4' },
  { id: 'obsidian', label: 'Black Glass',          key: 'Ctrl+Alt+5', electronKey: 'CmdOrCtrl+Alt+5' },
];

const TONE_CONTROLS = [
  { id: 'stop',       label: 'Stop tone',    key: 'Ctrl+Alt+0', electronKey: 'CmdOrCtrl+Alt+0' },
  { id: 'feather',    label: 'Feather fade', key: 'Ctrl+Alt+F', electronKey: 'CmdOrCtrl+Alt+F' },
  { id: 'volumeUp',   label: 'Volume +',     key: 'Ctrl+Alt+]', electronKey: 'CmdOrCtrl+Alt+]' },
  { id: 'volumeDown', label: 'Volume -',     key: 'Ctrl+Alt+[', electronKey: 'CmdOrCtrl+Alt+[' },
];

module.exports = { TONE_PATCHES, TONE_CONTROLS };
