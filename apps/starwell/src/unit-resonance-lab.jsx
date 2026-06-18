import React, { useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import {
  buildResonanceGraph,
  projectToPlane,
  selectResonanceWindow,
  vectorToRecord,
} from './math-kernels/unit-resonance/index.js';
import {
  unitResonanceLabMetric,
  unitResonanceLabNodes,
  unitResonanceLabProjection,
  unitResonanceLabView,
} from './configs/resonance/unit-resonance-lab-demo.js';
import './unit-resonance-lab.css';

function makeEdgePath(source, target) {
  const dx = target.position.x - source.position.x;
  const dy = target.position.y - source.position.y;
  const curve = Math.max(24, Math.min(96, Math.hypot(dx, dy) * 0.22));
  const controlA = {
    x: source.position.x + dx * 0.35,
    y: source.position.y + dy * 0.35 - curve,
  };
  const controlB = {
    x: source.position.x + dx * 0.65,
    y: source.position.y + dy * 0.65 + curve,
  };

  return `M ${source.position.x} ${source.position.y} C ${controlA.x} ${controlA.y}, ${controlB.x} ${controlB.y}, ${target.position.x} ${target.position.y}`;
}

function UnitResonanceLab() {
  const graph = useMemo(() => {
    const visibleNodes = selectResonanceWindow(unitResonanceLabNodes, { requireConsent: true, requireVisible: true });
    const projectedNodes = projectToPlane(visibleNodes, unitResonanceLabProjection, unitResonanceLabMetric.dimensions);
    return buildResonanceGraph(projectedNodes, unitResonanceLabMetric);
  }, []);

  const nodeMap = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);
  const unitEdgeCount = graph.edges.filter((edge) => edge.kind === 'unit').length;

  return (
    <main className="unit-resonance-shell">
      <section className="unit-resonance-hero" aria-labelledby="unit-resonance-title">
        <p className="unit-resonance-eyebrow">STARWELL math kernel</p>
        <h1 id="unit-resonance-title">{unitResonanceLabView.title}</h1>
        <p>{unitResonanceLabView.subtitle}</p>
      </section>

      <section className="unit-resonance-board" aria-label="Projected resonance graph">
        <svg viewBox={unitResonanceLabView.svg.viewBox} role="img" aria-labelledby="unit-resonance-svg-title unit-resonance-svg-desc">
          <title id="unit-resonance-svg-title">Unit resonance lattice projection</title>
          <desc id="unit-resonance-svg-desc">
            Eight STARWELL nodes are embedded in a hidden resonance vector space, then projected to a two dimensional interface with unit-distance strands.
          </desc>
          <g className="unit-resonance-grid" aria-hidden="true">
            <circle cx="360" cy="260" r="216" />
            <circle cx="360" cy="260" r="144" />
            <circle cx="360" cy="260" r="72" />
          </g>
          <g className="unit-resonance-edges">
            {graph.edges.map((edge) => {
              const source = nodeMap.get(edge.source);
              const target = nodeMap.get(edge.target);
              if (!source || !target) return null;

              return (
                <path
                  key={`${edge.source}-${edge.target}`}
                  d={makeEdgePath(source, target)}
                  style={{ '--edge-strength': edge.strength }}
                />
              );
            })}
          </g>
          <g className="unit-resonance-nodes">
            {graph.nodes.map((node) => (
              <g key={node.id} transform={`translate(${node.position.x} ${node.position.y})`}>
                <circle r="20" />
                <text y="42">{node.meta?.label || node.id}</text>
              </g>
            ))}
          </g>
        </svg>
      </section>

      <section className="unit-resonance-readout" aria-label="Kernel readout">
        <article>
          <span>Metric</span>
          <strong>{graph.metricId}</strong>
        </article>
        <article>
          <span>Visible nodes</span>
          <strong>{graph.nodes.length}</strong>
        </article>
        <article>
          <span>Unit strands</span>
          <strong>{unitEdgeCount}</strong>
        </article>
        <article>
          <span>Distance rule</span>
          <strong>{unitResonanceLabMetric.unitDistance} ± {unitResonanceLabMetric.tolerance}</strong>
        </article>
      </section>

      <section className="unit-resonance-node-list" aria-label="Projected node vectors">
        {graph.nodes.map((node) => {
          const vectorRecord = vectorToRecord(node.vector, graph.dimensions);
          return (
            <article key={node.id}>
              <h2>{node.meta?.label || node.id}</h2>
              <p>{node.kind}</p>
              <dl>
                {graph.dimensions.map((dimension) => (
                  <div key={dimension}>
                    <dt>{dimension}</dt>
                    <dd>{vectorRecord[dimension]}</dd>
                  </div>
                ))}
              </dl>
            </article>
          );
        })}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<UnitResonanceLab />);
