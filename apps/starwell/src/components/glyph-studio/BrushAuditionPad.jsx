import React, { useMemo, useState } from 'react';
import { StrokeMarks } from './GlyphCanvas.jsx';
import {
  getBrushSensoryPreferences,
  makeBrushAuditionStroke,
  setBrushSensoryPreferences,
} from './liveBrushRuntime.js';

export default function BrushAuditionPad({ brush }) {
  const [preferences, setPreferences] = useState(() => getBrushSensoryPreferences());
  const stroke = useMemo(() => makeBrushAuditionStroke(brush), [brush]);

  function toggle(name) {
    const next = setBrushSensoryPreferences({ ...preferences, [name]: !preferences[name] });
    setPreferences(next);
  }

  return (
    <section className="brush-audition" aria-label="Live brush sensory audition">
      <div className="brush-audition-heading">
        <div>
          <span>Live relation</span>
          <strong>{brush.name}</strong>
        </div>
        <div className="brush-sensory-toggles" aria-label="Brush sensory channels">
          <button type="button" className={preferences.sound ? 'pressed' : ''} onClick={() => toggle('sound')} aria-pressed={preferences.sound}>Hear</button>
          <button type="button" className={preferences.haptic ? 'pressed' : ''} onClick={() => toggle('haptic')} aria-pressed={preferences.haptic}>Feel</button>
          <button type="button" className={preferences.observer ? 'pressed' : ''} onClick={() => toggle('observer')} aria-pressed={preferences.observer}>Observe</button>
        </div>
      </div>
      <div className="brush-live-pad" aria-label="Brush preview pad">
        <svg viewBox="0 0 1000 1000" role="img" aria-label={`Live preview of ${brush.name}`}>
          <rect width="1000" height="1000" className="brush-audition-paper" />
          <StrokeMarks stroke={stroke} />
        </svg>
      </div>
      <p className="brush-audition-note">Every implemented brush setting re-renders this same sealed test stroke. Hear / Feel / Observe use the same brush revision as the visual audition.</p>
    </section>
  );
}
