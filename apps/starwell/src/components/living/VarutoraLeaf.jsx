import React, { useMemo, useState } from 'react';
import { kelyranTerms, varutoraNode } from '../../language/kelyranTerms';
import './living-manuscript.css';

const revealOrder = ['dormant', 'stirring', 'unfurling', 'translating', 'reading'];

function getNextState(current) {
  const index = revealOrder.indexOf(current);
  return revealOrder[Math.min(index + 1, revealOrder.length - 1)] || 'stirring';
}

function RootBreakdown({ roots, visible }) {
  if (!visible) return null;

  return (
    <div className="root-breakdown" aria-label="Kelyran root breakdown">
      {roots.map((root) => (
        <button className="root-chip" type="button" key={root.term}>
          <span>{root.term}</span>
          <em>{root.meaning}</em>
        </button>
      ))}
    </div>
  );
}

function LinkedGrowthHints({ linkedNodes, visible }) {
  if (!visible) return null;

  return (
    <div className="linked-growth-hints" aria-label="Linked story nodes">
      {linkedNodes.map((node) => (
        <span key={node}>{node.replace('-', ' ')}</span>
      ))}
    </div>
  );
}

export function VarutoraLeaf({ node = varutoraNode }) {
  const term = useMemo(() => kelyranTerms[node.termId], [node.termId]);
  const [state, setState] = useState('dormant');
  const [showRoots, setShowRoots] = useState(false);

  const isUnfurled = ['unfurling', 'translating', 'reading'].includes(state);
  const isTranslated = ['translating', 'reading'].includes(state);
  const isReading = state === 'reading';

  function advance() {
    setState((current) => getNextState(current));
  }

  function handlePointerEnter() {
    setState((current) => (current === 'dormant' ? 'stirring' : current));
  }

  function handleLongPress(event) {
    event.preventDefault();
    setShowRoots((current) => !current);
    setState((current) => (current === 'dormant' || current === 'stirring' ? 'translating' : current));
  }

  return (
    <section
      className={`living-leaf varutora-leaf state-${state}`}
      aria-label="Varutóra living manuscript leaf"
      onPointerEnter={handlePointerEnter}
    >
      <button
        className="seed-node"
        type="button"
        aria-label={`Touch ${term.kelyran}, ${term.english}`}
        onClick={advance}
        onContextMenu={handleLongPress}
      >
        <span className="seed-core" />
        <span className="seed-label">{term.kelyran}</span>
      </button>

      <svg className="vein-path" viewBox="0 0 320 140" aria-hidden="true">
        <path className="vein-main" d="M 22 72 C 72 18, 132 28, 168 62 S 258 118, 300 54" />
        <path className="vein-branch" d="M 156 58 C 176 34, 194 28, 218 22" />
        <path className="vein-branch soft" d="M 204 90 C 224 110, 250 118, 280 112" />
      </svg>

      <article className={`leaf-shell ${isUnfurled ? 'visible' : ''}`} aria-live="polite">
        <div className="leaf-inscription">
          <p className="kelyran-register">{term.register}</p>
          <h3>{term.kelyran}</h3>
          <span>{term.pronunciation}</span>
        </div>

        {isTranslated && (
          <div className="translation-layer">
            <p>{term.english}</p>
            <strong>{term.literal}</strong>
            <span>{term.notes}</span>
          </div>
        )}

        <RootBreakdown roots={term.roots} visible={showRoots || isReading} />

        {isReading && (
          <div className="narrative-fragment">
            <p className="fragment-meta">{node.mode} · {node.timeline} · {node.pov} POV</p>
            <blockquote>
              <p>{node.fragment}</p>
              <p>{node.extendedFragment}</p>
            </blockquote>
          </div>
        )}

        <LinkedGrowthHints linkedNodes={node.linkedNodes} visible={isReading} />
      </article>
    </section>
  );
}

export default VarutoraLeaf;
