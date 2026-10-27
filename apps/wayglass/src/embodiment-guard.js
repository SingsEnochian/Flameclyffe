/**
 * Wayglass N-017 embodied access boundary.
 *
 * We piggyback on the user's ordinary OS-selected audio destination and
 * browser-mediated inputs. We NEVER seek or control implanted devices.
 * A Bluetooth-connected implant is not a Web Bluetooth accessory for Wayglass.
 */
export const EMBODIMENT_GUARD_SCHEMA='wayglass.embodied-access/v1';
export const HARDWARE_BOUNDARY=Object.freeze({
  osia_audio:'os-routed-audio-only',
  neurostimulator:'manufacturer-controller-only',
  implant_pairing:false,
  bluetooth_scan:false,
  gatt_read:false,
  gatt_write:false,
  neurostimulation_control:false,
  audio_autoplay:false,
  camera_without_permission:false,
  microphone_without_permission:false,
  user_can_stop:true,
});
export function detectEmbodiedAccess(host=globalThis) {
  const nav=host.navigator||{};
  const Audio=host.AudioContext||host.webkitAudioContext;
  return Object.freeze({
    schema:EMBODIMENT_GUARD_SCHEMA,
    audio_playback:typeof Audio==='function',
    output:'operating-system-selected-default-device',
    osia_link_verified:false,
    touchscreen:Number(nav.maxTouchPoints||0)>0,
    ordinary_vibration:typeof nav.vibrate==='function',
    xr_presence:Boolean(nav.xr),
    user_gesture_required:true,
    implant_access:'unsupported-and-intentionally-not-requested',
    boundary:HARDWARE_BOUNDARY,
  });
}
export function formatEmbodimentDescription(profile) {
  if(profile?.schema!==EMBODIMENT_GUARD_SCHEMA)
    throw new TypeError('Expected a valid Wayglass embodied access profile');
  const audio=profile.audio_playback?'Audio through your operating system’s selected device':'Audio output unavailable in this browser';
  const touch=profile.touchscreen?'Touch available':'Keyboard and pointer remain available';
  const haptics=profile.ordinary_vibration?'Ordinary device vibration available on request':'Ordinary vibration unavailable';
  return Object.freeze([audio,touch,haptics,'Implant controllers remain separate from Wayglass']);
}
