# House Chat runtime roster authority

The visible House Chat participant selector is runtime-driven. `house-chat-runtime-roster-ui.js` reads `currentModelPresence()` and derives the visible roster through `runtimeHouseVoices()`.

The legacy fieldset remains in the DOM only as a compatibility transport for v5 submit handling. It is visually hidden and synchronised from the live runtime selector. Runtime voices not present in the legacy static markup receive hidden compatibility inputs dynamically, so newly present voices such as OA can be routed without waiting for the old static list to be edited.
