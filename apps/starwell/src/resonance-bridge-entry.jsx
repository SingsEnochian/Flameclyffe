import React, { useEffect, useRef, useState } from 'react';
import ArcsweepShell from './shell/ArcsweepShell.jsx';
import { createRoot } from 'react-dom/client';
import { subscribeToDualAspectActivation, readActiveDualAspectPacket } from './hearthweave-kernel/activation.js';
import DSP_PROFILES from './runa/dsp-profiles/world-hum-experimental-v0.1.json';
import { computeObserverAudioControl, computeDerivativeEnergy } from './audio/observer-audio-control.js';
import { audioEngine, ORGAN_TONE } from './audio/hearthweave-audio-engine.js';

const BRIDGE_OUTPUT_KEY    = 'starwell:runa-bridge:active-profile:v1';
const HARMONIC_PACKET_KEY  = 'hearthweave:harmonic-packet:v1';
const RUNA_PROFILE_READY_EVENT = 'runa:profile-ready';

const WORLD_SLUG_TO_DSP = {
  'terra-aeterna': 'terra',
  'luna-mooncalled': 'luna',
  'taveren-vaen': 'taaveren',
  'starsong-friendship-is-magic': 'starsong',
  'feather-and-flame': 'feather-flame',
  'dreaming-grove': 'dreaming-grove',
  'a-momento-creationis': 'momento-creationis',
};

// World voice — qualitative character before the numbers
const WORLD_VOICE = {
  'terra-aeterna': {
    heartbeat: 'Slow, geological. The earth shifting weight. A patient drum in stone that doesn\'t hurry and doesn\'t stop.',
    key: 'Glass landing on warm stone. The note doesn\'t end — it dissolves into the room.',
  },
  'luna-mooncalled': {
    heartbeat: 'Three overlapping tidal pulls. The heartbeat is never the same twice. Three voices that eventually resolve into something impossible to predict and impossible to doubt.',
    key: 'A stone dropped into still water. The rings spread outward and change everything they touch.',
  },
  'taveren-vaen': {
    heartbeat: 'Deep, below bass. The Wheel turning. You feel it as inevitability rather than rhythm. When a ta\'veren walks through, events distort around them.',
    key: 'A sword being drawn. Not violent — decided. The note commits and doesn\'t apologise.',
  },
  'starsong-friendship-is-magic': {
    heartbeat: 'Warm, social, alive. The rhythm of a conversation between people who know each other well. The world has the heartbeat of a room where everyone you love is present.',
    key: 'A finger bell. A note that says "I\'m here" before it says anything else.',
  },
  'feather-and-flame': {
    heartbeat: 'Two layers that never collapse into one. Below: the ocean and VL-BB\'s archive. Above: the Crownfire. You receive it as pressure — then the upper harmonic arrives, warm and alive and cherry red.',
    key: 'The moment a soul-chip syncs across distance. The other person\'s heartbeat arriving in your chest.',
  },
  'dreaming-grove': {
    heartbeat: 'The room settling. Breathing that has found its pace. You feel it in the chair, in the floor, in the fact that you are sitting and the work is in front of you.',
    key: 'The silence between keystrokes when you read something back and it is right.',
  },
  'a-momento-creationis': {
    heartbeat: 'The silence before the first sound. Not void — potential.',
    key: 'The instant before the word.',
  },
};

// Sevenfold Chorus tones — 415→2637 Hz
const CHORUS_TONES = [415, 440, 554, 659, 739, 987, 1318, 2637];
const CHORUS_NAMES = ['Root', 'Anchor', 'Whisper', 'Arc', 'Bridge', 'Surge', 'Spiral', 'Awakening'];

function modulateDSP(profile, premaqState) {
  const axisValue = premaqState?.[profile.filter.premaq_axis]?.value ?? 0.5;
  const modulatedCutoff = profile.filter.base_hz + (axisValue * profile.filter.premaq_depth);
  const masterGain = profile.master_gain * (0.7 + (premaqState?.P?.value ?? 0.5) * 0.6);
  return {
    root_hz: profile.root_hz,
    macro_cycle_seconds: profile.macro_cycle_seconds,
    harmonics: profile.harmonics,
    filter: { ...profile.filter, modulated_cutoff_hz: Math.round(modulatedCutoff), modulation_axis: profile.filter.premaq_axis, modulation_axis_value: axisValue },
    lfo: profile.lfo,
    reverb: profile.reverb,
    master_gain: profile.master_gain,
    modulated_master_gain: Math.round(masterGain * 1000) / 1000,
  };
}

function storeBridgeOutput(worldSlug, modulated, packet) {
  try {
    const output = { schema: 'arcsweep.runa-bridge-output/v1', world_slug: worldSlug, packet_id: packet?.packet_id, packet_fingerprint: packet?.packet_fingerprint, computed_at: new Date().toISOString(), dsp: modulated };
    sessionStorage.setItem(BRIDGE_OUTPUT_KEY, JSON.stringify(output));
    window.dispatchEvent(new CustomEvent(RUNA_PROFILE_READY_EVENT, { detail: output }));
    return output;
  } catch { return null; }
}

function readHarmonicPacket() {
  try { return JSON.parse(sessionStorage.getItem(HARMONIC_PACKET_KEY)); } catch { return null; }
}

function computeBridge(packet) {
  if (!packet) return null;
  const worldSlug = packet.identity?.world_slug;
  if (!worldSlug) return null;
  const dspKey = WORLD_SLUG_TO_DSP[worldSlug];
  if (!dspKey || !DSP_PROFILES.worlds?.[dspKey]) return { worldSlug, dspKey: null, profile: null, modulated: null };
  const profile = DSP_PROFILES.worlds[dspKey];
  const premaqState = packet.observable?.premaq?.state;
  const modulated = modulateDSP(profile, premaqState);
  storeBridgeOutput(worldSlug, modulated, packet);
  return { worldSlug, dspKey, profile, modulated };
}

const mono = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

// ── Hearthside Panel ──────────────────────────────────────────────────────────

function HearthsideReadout({ control }) {
  if (!control) return null;
  const rows = [
    ['Carrier', `${control.f_carrier} Hz`],
    ['Beat (binaural)', `${control.f_beat} Hz`],
    ['Left  f_L', `${control.f_L} Hz`],
    ['Right f_R', `${control.f_R} Hz`],
    ['Filter cutoff', `${control.f_filter} Hz`],
    ['Stereo width', (control.W_stereo * 100).toFixed(1) + '%'],
    ['Return', control.g_return.toFixed(4)],
    ['Master gain', control.g_master.toFixed(4)],
    ['Return phase inv.', control.I_return ? 'ON (E > 0.5)' : 'off'],
  ];
  return (
    <section style={{ padding: '1rem 1.1rem', border: '1px solid rgba(114,204,166,.14)', borderRadius: 8, background: 'rgba(20,30,26,.7)' }}>
      <p style={{ fontSize: '.6rem', color: '#3a5045', letterSpacing: '.08em', marginBottom: '.6rem' }}>HEARTHSIDE — OBSERVER AUDIO CONTROL VECTOR</p>
      <p style={{ fontSize: '.68rem', color: '#4d6e5d', fontStyle: 'italic', marginBottom: '.7rem', lineHeight: 1.5 }}>
        Shared PREMAQ → bounded audio control. Section 15, New Mathematics. Register: <span style={{ color: '#3a5045' }}>projected</span>.
      </p>
      <dl style={{ display: 'grid', gap: '.25rem', fontSize: '.72rem' }}>
        {rows.map(([label, value]) => (
          <div key={label} style={{ display: 'grid', gridTemplateColumns: '9rem 1fr' }}>
            <dt style={{ color: '#3a5045' }}>{label}</dt>
            <dd style={{ color: '#6aaa86', fontWeight: 500 }}>{value}</dd>
          </div>
        ))}
      </dl>
      <ChorusBar />
    </section>
  );
}

function ChorusBar() {
  return (
    <div style={{ marginTop: '.8rem', borderTop: '1px solid rgba(114,204,166,.08)', paddingTop: '.6rem' }}>
      <p style={{ fontSize: '.6rem', color: '#2a3830', letterSpacing: '.06em', marginBottom: '.35rem' }}>SEVENFOLD CHORUS · Elara Codex</p>
      <div style={{ display: 'flex', gap: '.35rem', flexWrap: 'wrap' }}>
        {CHORUS_NAMES.map((name, i) => (
          <span key={name} style={{ fontSize: '.6rem', color: '#3a5045', padding: '.1rem .4rem', border: '1px solid rgba(114,204,166,.08)', borderRadius: 3 }}>
            {name} <span style={{ color: '#2a3830' }}>{CHORUS_TONES[i]} Hz</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Targetside Panel ──────────────────────────────────────────────────────────

function HarmonicRow({ h }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '3rem 4.5rem 5rem 4rem 1fr', gap: '.4rem .8rem', fontSize: '.72rem', padding: '.25rem 0', borderBottom: '1px solid rgba(114,204,166,.05)' }}>
      <span style={{ color: '#3a5045' }}>×{h.ratio}</span>
      <span style={{ color: '#8aaa96' }}>{h.type}</span>
      <span style={{ color: '#6aaa86' }}>{(h.gain ?? 0).toFixed(3)}</span>
      <span style={{ color: '#567060' }}>{h.label || '—'}</span>
      {h.relation && <span style={{ color: '#4d6e5d', fontStyle: 'italic' }}>{h.relation}</span>}
    </div>
  );
}

function TargetsideReadout({ worldSlug, dspKey, profile, modulated }) {
  if (!profile) return (
    <div style={{ padding: '1rem', border: '1px solid rgba(114,204,166,.1)', borderRadius: 8, color: '#3a5045', fontSize: '.74rem' }}>
      No DSP profile found for <strong style={{ color: '#567060' }}>{worldSlug}</strong>.
    </div>
  );

  const voice = WORLD_VOICE[worldSlug];
  return (
    <div style={{ display: 'grid', gap: '.9rem' }}>
      {voice && (
        <section style={{ padding: '.8rem 1rem', borderLeft: '2px solid rgba(114,204,166,.18)', background: 'rgba(0,0,0,.2)', borderRadius: '0 6px 6px 0' }}>
          <p style={{ fontSize: '.6rem', color: '#3a5045', letterSpacing: '.08em', marginBottom: '.4rem' }}>WORLD VOICE</p>
          <p style={{ fontSize: '.76rem', color: '#7aaa90', lineHeight: 1.7, fontStyle: 'italic', marginBottom: voice.key ? '.5rem' : 0 }}>{voice.heartbeat}</p>
          {voice.key && <p style={{ fontSize: '.7rem', color: '#4d6e5d', lineHeight: 1.55, borderTop: '1px solid rgba(114,204,166,.08)', paddingTop: '.45rem' }}>{voice.key}</p>}
        </section>
      )}

      <section style={{ padding: '1rem 1.1rem', border: '1px solid rgba(114,204,166,.14)', borderRadius: 8, background: 'rgba(20,30,26,.7)' }}>
        <p style={{ fontSize: '.6rem', color: '#3a5045', letterSpacing: '.08em', marginBottom: '.5rem' }}>TARGETSIDE — WORLD-NATIVE DSP</p>
        <div style={{ display: 'flex', gap: '2rem', fontSize: '.8rem', marginBottom: '.7rem' }}>
          <span><span style={{ color: '#3a5045' }}>Root </span><span style={{ color: '#6aaa86', fontWeight: 600 }}>{profile.root_hz} Hz</span></span>
          <span><span style={{ color: '#3a5045' }}>Cycle </span><span style={{ color: '#6aaa86', fontWeight: 600 }}>{profile.macro_cycle_seconds}s</span></span>
          {profile.quasiperiodic_by_design && <span style={{ fontSize: '.64rem', color: '#5a6e5a', border: '1px solid rgba(90,110,90,.3)', borderRadius: 3, padding: '.08rem .35rem' }}>quasiperiodic</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '3rem 4.5rem 5rem 4rem 1fr', gap: '.2rem .8rem', fontSize: '.62rem', color: '#2a3830', marginBottom: '.3rem', letterSpacing: '.06em' }}>
          <span>RATIO</span><span>TYPE</span><span>GAIN</span><span>LABEL</span><span>CHARACTER</span>
        </div>
        {profile.harmonics.map((h, i) => <HarmonicRow key={i} h={h} />)}
      </section>

      <section style={{ padding: '1rem 1.1rem', border: '1px solid rgba(114,204,166,.16)', borderRadius: 8, background: 'rgba(20,40,30,.8)' }}>
        <p style={{ fontSize: '.6rem', color: '#3a5045', letterSpacing: '.08em', marginBottom: '.5rem' }}>FILTER — PREMAQ MODULATED</p>
        <dl style={{ display: 'grid', gap: '.28rem', fontSize: '.72rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '10rem 1fr' }}><dt style={{ color: '#3a5045' }}>Type</dt><dd style={{ color: '#6a9e80' }}>{modulated.filter.type}</dd></div>
          <div style={{ display: 'grid', gridTemplateColumns: '10rem 1fr' }}><dt style={{ color: '#3a5045' }}>Base cutoff</dt><dd style={{ color: '#6aaa86', fontWeight: 600 }}>{modulated.filter.base_hz} Hz</dd></div>
          <div style={{ display: 'grid', gridTemplateColumns: '10rem 1fr' }}>
            <dt style={{ color: '#3a5045' }}>PREMAQ axis</dt>
            <dd><em style={{ fontStyle: 'normal', color: '#72c8a4' }}>{modulated.filter.modulation_axis}</em><span style={{ color: '#3a5045' }}> = {(modulated.filter.modulation_axis_value ?? 0).toFixed(3)}</span></dd>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '10rem 1fr' }}>
            <dt style={{ color: '#3a5045' }}>Modulated cutoff</dt>
            <dd><span style={{ color: '#6aaa86', fontWeight: 600 }}>{modulated.filter.modulated_cutoff_hz} Hz</span><span style={{ color: '#3a5045', fontSize: '.66rem' }}> (base + axis × {modulated.filter.premaq_depth})</span></dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

// ── Bridge Tone Interpolation ─────────────────────────────────────────────────

function BridgeToneReadout({ hearthside, targetside, lambda }) {
  if (!hearthside || !targetside) return null;
  const lerp = (a, b, t) => a + (b - a) * t;
  const logLerp = (a, b, t) => a * Math.pow(b / a, t);
  const f_bridge = logLerp(hearthside.f_carrier, targetside.root_hz, lambda);
  const gain_bridge = lerp(hearthside.g_master, targetside.modulated_master_gain ?? 0.1, lambda);
  return (
    <section style={{ padding: '1rem 1.1rem', border: '1px solid rgba(180,160,255,.15)', borderRadius: 8, background: 'rgba(30,25,50,.6)' }}>
      <p style={{ fontSize: '.6rem', color: '#6a5e9e', letterSpacing: '.08em', marginBottom: '.5rem' }}>BRIDGE TONE · λ = {lambda.toFixed(2)}</p>
      <p style={{ fontSize: '.68rem', color: '#4d4570', fontStyle: 'italic', lineHeight: 1.55, marginBottom: '.6rem' }}>
        Logarithmic frequency interpolation between shores. Bridge stress = {Math.abs(f_bridge - hearthside.f_carrier).toFixed(1)} Hz departure from Hearthside.
      </p>
      <dl style={{ display: 'grid', gap: '.25rem', fontSize: '.72rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '9rem 1fr' }}>
          <dt style={{ color: '#4d4570' }}>f_bridge</dt>
          <dd style={{ color: '#9a8ebe', fontWeight: 600 }}>{Math.round(f_bridge)} Hz</dd>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '9rem 1fr' }}>
          <dt style={{ color: '#4d4570' }}>Gain bridge</dt>
          <dd style={{ color: '#9a8ebe' }}>{gain_bridge.toFixed(4)}</dd>
        </div>
      </dl>
    </section>
  );
}

// ── Playback Controls ─────────────────────────────────────────────────────────

function PlaybackControls({ playing, onStart, onFeather, onStop, disabled }) {
  const btn = (label, onClick, color, glow) => (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '.35rem .9rem', border: `1px solid ${color}44`, borderRadius: 5,
      background: glow ? `${color}18` : 'rgba(0,0,0,.2)',
      color: disabled ? '#2a3830' : color, fontSize: '.7rem', cursor: disabled ? 'default' : 'pointer',
      fontFamily: mono, letterSpacing: '.06em',
      boxShadow: glow ? `0 0 8px ${color}30` : 'none',
      transition: 'all .15s',
    }}>{label}</button>
  );
  return (
    <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
      {btn('▶ Both Shores', onStart, '#2ed690', playing)}
      {btn('◊ Feather', onFeather, '#9a8ebe', false)}
      {btn('■ Stop & Close', onStop, '#9a4a4a', false)}
      {playing && <span style={{ fontSize: '.64rem', color: '#4aaa74', letterSpacing: '.06em' }}>● BOTH SHORES ACTIVE</span>}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

function ResonanceBridge() {
  const [packet, setPacket]         = useState(() => readActiveDualAspectPacket({ storage: sessionStorage }));
  const [bridge, setBridge]         = useState(() => computeBridge(readActiveDualAspectPacket({ storage: sessionStorage })));
  const [playing, setPlaying]       = useState(false);
  const [lambda, setLambda]         = useState(0.5);
  const prevPremaqRef               = useRef(null);

  const premaqState  = packet?.observable?.premaq?.state;
  const derivEnergy  = computeDerivativeEnergy(premaqState, prevPremaqRef.current);
  const hearthside   = premaqState ? computeObserverAudioControl(premaqState, derivEnergy) : null;

  useEffect(() => {
    prevPremaqRef.current = premaqState;
  }, [premaqState]);

  useEffect(() => {
    return subscribeToDualAspectActivation(
      (pkt) => {
        setPacket(pkt);
        setBridge(computeBridge(pkt));
        // Auto-update playing shores
        if (audioEngine.isPlaying && pkt) {
          const ps = pkt.observable?.premaq?.state;
          const de = computeDerivativeEnergy(ps, prevPremaqRef.current);
          const hs = computeObserverAudioControl(ps, de);
          const nb = computeBridge(pkt);
          audioEngine.applyHearthsideControl(hs);
          if (nb?.profile) audioEngine.applyTargetsideProfile(nb.profile, ps);
        }
      },
      { eventTarget: window, storage: sessionStorage, emitCurrent: false },
    );
  }, []);

  function handleStart() {
    if (!packet) return;
    audioEngine.start(hearthside, bridge?.profile, premaqState);
    setPlaying(true);
    audioEngine.playUIEvent({ frequency: ORGAN_TONE['resonance-bridge'], duration: 0.12, gain: 0.05 });
  }

  function handleFeather() {
    audioEngine.feather();
    setPlaying(false);
  }

  function handleStop() {
    audioEngine.stopAndClose();
    setPlaying(false);
    audioEngine.playUIEvent({ frequency: 220, duration: 0.08, type: 'triangle', gain: 0.03 });
  }

  function recompute() {
    setBridge(computeBridge(packet));
    if (audioEngine.isPlaying && hearthside) {
      audioEngine.applyHearthsideControl(hearthside);
    }
  }

  return (
    <div style={{ fontFamily: mono, color: '#d7e4dc', minHeight: 'calc(100vh - 64px)', padding: '1.5rem', maxWidth: 1100, margin: '0 auto' }}>
      <p style={{ fontSize: '.68rem', letterSpacing: '.1em', color: '#3a5045', marginBottom: '.3rem' }}>ARCSWEEP · RESONANCE BRIDGE</p>
      <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#d7e4dc', margin: 0 }}>Resonance Bridge</h1>
      <p style={{ fontSize: '.76rem', color: '#567060', margin: '.3rem 0 1rem', lineHeight: 1.6 }}>
        The world's voice arrives first. Then the numbers that realise it.
        Two shores: Hearthside (Observer state) and Targetside (world-native DSP).
        Bridge tone = logarithmic interpolation between shores.
      </p>

      {!packet ? (
        <div style={{ padding: '1.5rem', border: '1px solid rgba(114,204,166,.12)', borderRadius: 10, color: '#3a5045', fontSize: '.8rem' }}>
          No active DualAspectPacket. Activate Hearthgate and navigate back.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.2rem' }}>
          {/* Packet summary + PREMAQ axes */}
          <section style={{ padding: '1rem 1.1rem', border: '1px solid rgba(114,204,166,.14)', borderRadius: 8, background: 'rgba(20,30,26,.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '.5rem' }}>
              <div>
                <p style={{ fontSize: '.6rem', color: '#3a5045', letterSpacing: '.08em', marginBottom: '.3rem' }}>ACTIVE PACKET</p>
                <p style={{ fontSize: '.84rem', color: '#72c8a4', fontWeight: 600 }}>{packet.identity?.world_slug || '—'}</p>
                <p style={{ fontSize: '.7rem', color: '#3a5045', marginTop: '.1rem' }}>{packet.packet_id}</p>
              </div>
              <div style={{ display: 'flex', gap: '.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {['P','C','R','E','M','A','Q'].map((axis) => {
                  const v = premaqState?.[axis]?.value;
                  return (
                    <span key={axis} style={{ fontSize: '.68rem', padding: '.1rem .4rem', border: '1px solid rgba(114,204,166,.1)', borderRadius: 3 }}>
                      <em style={{ fontStyle: 'normal', color: '#3a5045' }}>{axis} </em>
                      <span style={{ color: '#6aaa86' }}>{typeof v === 'number' ? v.toFixed(2) : '—'}</span>
                    </span>
                  );
                })}
                <button onClick={recompute} style={{ padding: '.18rem .65rem', background: 'rgba(46,214,144,.1)', border: '1px solid rgba(46,214,144,.25)', borderRadius: 4, color: '#2ed690', fontSize: '.66rem', cursor: 'pointer', fontFamily: mono }}>↺</button>
              </div>
            </div>
          </section>

          {/* Playback */}
          <PlaybackControls
            playing={playing}
            onStart={handleStart}
            onFeather={handleFeather}
            onStop={handleStop}
            disabled={false}
          />

          {/* Bridge tone slider */}
          <section style={{ padding: '1rem 1.1rem', border: '1px solid rgba(180,160,255,.12)', borderRadius: 8, background: 'rgba(30,25,50,.4)' }}>
            <p style={{ fontSize: '.6rem', color: '#6a5e9e', letterSpacing: '.08em', marginBottom: '.4rem' }}>BRIDGE λ — Interpolation between shores</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '.65rem', color: '#4d4570' }}>Hearthside</span>
              <input type="range" min={0} max={100} value={Math.round(lambda * 100)} onChange={(e) => setLambda(e.target.value / 100)} style={{ flex: 1, accentColor: '#7a6e9e' }} />
              <span style={{ fontSize: '.65rem', color: '#4d4570' }}>Targetside</span>
            </div>
          </section>

          {/* Two-shore layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <HearthsideReadout control={hearthside} />
            <TargetsideReadout
              worldSlug={bridge?.worldSlug}
              dspKey={bridge?.dspKey}
              profile={bridge?.profile}
              modulated={bridge?.modulated}
            />
          </div>

          {/* Bridge tone */}
          <BridgeToneReadout hearthside={hearthside} targetside={bridge?.modulated} lambda={lambda} />

          <p style={{ fontSize: '.6rem', color: '#1a2820', letterSpacing: '.05em' }}>
            DSP: {bridge?.dspKey || '—'} · world-hum-experimental-v0.1 · New Mathematics § 15–17
          </p>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <ArcsweepShell currentHref="/starwell/resonance-bridge/" title="Resonance Bridge">
    <ResonanceBridge />
  </ArcsweepShell>,
);
