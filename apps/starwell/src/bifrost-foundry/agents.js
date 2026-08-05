import { defineAgent } from './contracts.js';

export const BIFROST_AGENTS = Object.freeze([
  defineAgent({ id:'bifrost-conductor', name:'Bifröst Conductor', owns:['apps/starwell/src/bifrost-foundry/**'], capabilities:['plan','dispatch','pause','reassign','receipt'], testCommands:['npm run starwell:test'] }),
  defineAgent({ id:'bifrost-kernel', name:'Bifröst Kernel', owns:['apps/starwell/src/hearthgate/kernel/**'], capabilities:['shared-state','event-bus','replay','provenance'], testCommands:['npm run starwell:test'] }),
  defineAgent({ id:'bifrost-tone', name:'Bifröst Tone', owns:['apps/starwell/src/**/tone*','apps/starwell/src/**/audio*','apps/starwell/src/**/haptic*'], capabilities:['runa','tone-labs','typing-tones','haptics'], testCommands:['npm run starwell:test','npm run starwell:build'] }),
  defineAgent({ id:'bifrost-arcsweep', name:'Bifröst Arcsweep', owns:['apps/starwell/src/arcsweep-*/**','apps/starwell/src/hearthgate-arcsweep.js','apps/starwell/glyph-studio/**'], capabilities:['navigation','continuity','glyphs','stylus'], testCommands:['npm run starwell:test','npm run starwell:build'] }),
  defineAgent({ id:'bifrost-observer', name:'Bifröst Observer', owns:['apps/starwell/src/deep-*/**','apps/starwell/deep-observer/**','apps/starwell/signal-well/**'], capabilities:['premaq','telemetry','signal-ledger'], testCommands:['npm run starwell:test','npm run starwell:build'] }),
  defineAgent({ id:'bifrost-houses', name:'Bifröst Houses', owns:['apps/starwell/src/stonewood-*','apps/starwell/src/**/*vestment*','apps/starwell/hearthgate/**'], capabilities:['rooms','themes','vestments','accessibility'], testCommands:['npm run starwell:test','npm run starwell:build'] }),
  defineAgent({ id:'bifrost-canon', name:'Bifröst Canon', owns:['apps/starwell/src/**/*canon*','apps/starwell/public/worlds/**'], capabilities:['world-profiles','timelines','relationships','provenance'], testCommands:['npm run starwell:test'] }),
  defineAgent({ id:'bifrost-platform', name:'Bifröst Platform', owns:['apps/starwell/vite.config.js','apps/starwell/public/manifest*','.github/workflows/**'], capabilities:['windows','android','ipad','pwa','offline'], testCommands:['npm run starwell:test','npm run starwell:build'] }),
  defineAgent({ id:'hearthfire-integration', name:'Hearthfire Integration', owns:['apps/starwell-server/**'], capabilities:['models','agents','wallet','wishes','supabase'], testCommands:['npm run starwell:test'] }),
  defineAgent({ id:'boxfire-qa', name:'Boxfire QA', owns:['apps/starwell/test/**'], capabilities:['inspect','test','reject','approve'], testCommands:['npm run starwell:test','npm run starwell:build'], canCrossOwnedPaths:true })
]);

export const getAgent = id => BIFROST_AGENTS.find(agent => agent.id === id) || null;
