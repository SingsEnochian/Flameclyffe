import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SlotText } from 'slot-text/react';
import 'slot-text/style.css';
import './city-state-motion.css';

const CITY_STATES = [
  {
    id: 'sleeping',
    label: 'SLEEPING',
    note: 'The city signal is quiet.',
    color: '#9ec9ff',
  },
  {
    id: 'stirring',
    label: 'STIRRING',
    note: 'Roots, lanterns, and listening systems are beginning to answer.',
    color: '#f0d98a',
  },
  {
    id: 'awake',
    label: 'AWAKE',
    note: 'The city is coherent enough to return a living signal.',
    color: '#78d9af',
  },
];

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(() => (
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  ));

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event) => setReducedMotion(event.matches);

    setReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener?.('change', handleChange);

    return () => mediaQuery.removeEventListener?.('change', handleChange);
  }, []);

  return reducedMotion;
}

function WakingCityStatePreview() {
  const [stateIndex, setStateIndex] = useState(0);
  const [minimised, setMinimised] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const state = CITY_STATES[stateIndex];
  const nextState = CITY_STATES[(stateIndex + 1) % CITY_STATES.length];

  const slotOptions = useMemo(() => ({
    direction: 'up',
    stagger: 34,
    duration: 270,
    exitOffset: 48,
    bounce: 0.24,
    color: state.color,
    colorFade: 320,
    interrupt: true,
  }), [state.color]);

  const advanceState = () => {
    setStateIndex((current) => (current + 1) % CITY_STATES.length);
  };

  if (minimised) {
    return (
      <button
        className="city-state-launcher"
        data-state={state.id}
        type="button"
        onClick={() => setMinimised(false)}
        aria-label={`Open Waking City State preview. Current state: ${state.label}.`}
      >
        <span>City State</span>
        <strong>{state.label}</strong>
      </button>
    );
  }

  return (
    <aside className="city-state-instrument" data-state={state.id} aria-labelledby="city-state-heading">
      <header className="city-state-header">
        <div>
          <span className="city-state-kicker">Interface prototype · not canon</span>
          <h2 id="city-state-heading">Waking City State</h2>
        </div>
        <button
          className="city-state-minimise"
          type="button"
          onClick={() => setMinimised(true)}
          aria-label="Minimise Waking City State preview"
        >
          −
        </button>
      </header>

      <span className="city-state-sr" role="status" aria-live="polite" aria-atomic="true">
        Waking city state: {state.label}. {state.note}
      </span>

      <div className="city-state-reading" aria-hidden="true">
        {reducedMotion ? (
          <span className="city-state-static">{state.label}</span>
        ) : (
          <SlotText className="city-state-slot" text={state.label} options={slotOptions} aria-hidden="true" />
        )}
      </div>

      <p>{state.note}</p>

      <button className="city-state-advance" type="button" onClick={advanceState}>
        Preview {nextState.label}
      </button>

      <small>
        Visual test only. It does not alter Atlas records, city canon, or Supabase state.
        {reducedMotion ? ' Motion is reduced, so state text changes instantly.' : ''}
      </small>
    </aside>
  );
}

const mountNode = document.getElementById('city-state-motion-root');

if (mountNode) {
  createRoot(mountNode).render(<WakingCityStatePreview />);
}
