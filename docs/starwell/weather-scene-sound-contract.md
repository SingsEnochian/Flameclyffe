# Weather Scene Sound Contract

Status: Portal Kernel v0.1 draft. This contract describes scene-reactive weather sound proposals only. It does not enable live playback, autoplay, haptics, external bridges, canon writes, or hidden audio.

## Purpose

Weather sound connects three signals:

- text weather: density, creation, revision, hush, and scene terms from the current text;
- interaction weather: typing cadence, pointer drift, stillness, and world response from the input-weather resolver;
- scene weather: the current room or world node, including room kind, biome, palette, and access state.

The result is a sound proposal that can say which patch, band, and future crossfade plan would fit the scene.

## Scene profiles

Initial scene mix profiles:

- Templehouse: North Star Still, hush band, 1800 ms crossfade.
- Shrine: Runa Gateway 432, shimmer band, 2400 ms crossfade.
- Ygg Gate: Yggdrasil Root Breath, root-pulse band, 2600 ms crossfade.
- Grove: Dreaming Grove Purrfield, purrfield band, 3200 ms crossfade.
- Water: Lochflame Still, tide band, 3600 ms crossfade.
- Gallery: North Star Still, shimmer band, 2200 ms crossfade.
- Lab: Yggdrasil Root Breath, root-pulse band, 1600 ms crossfade.
- Playfield: Dreaming Grove Purrfield, purrfield band, 2200 ms crossfade.

Room kind wins before palette mood. A grove with sea-blue palette remains a Grove scene unless explicitly routed to Water.

## Good crossfade

When sound is user-enabled in a later phase, scene changes should use an equal-power crossfade:

- old scene fades down;
- new scene fades up;
- density and motion ease rather than jump;
- caps keep density and motion modest;
- Plain Pass returns to hush;
- Feather Stop remains immediate.

In v0.1 this is a plan only. `futureSceneMix.activeInV0` remains false and `suggestedGain` remains 0.

## Guardrails

- Explicit sound-on required.
- No autoplay.
- No hidden playback.
- No transcript storage.
- No volume changes from LLM authority.
- No bypassing consent.
- Reduced motion and sensory quiet settings cap the mix.
