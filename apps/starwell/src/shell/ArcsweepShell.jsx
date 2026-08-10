import React, { useEffect, useState } from 'react';
import {
  subscribeToBraidPacket,
  readBraidPacket,
  PREMAQ_LABELS,
  PREMAQ_AXES,
} from '../hearthweave-kernel/braid-packet.js';
import './arcsweep-shell.css';

const IS_EMBEDDED = typeof window !== 'undefined' && window.parent !== window;

function broadcastWorld(slug) {
  if (!slug) return;
  sessionStorage.setItem('arcsweep:world', slug);
  if (IS_EMBEDDED) window.parent.postMessage({ type: 'arcsweep:world', slug }, '*');
}

function broadcastPremaq(packet) {
  if (!IS_EMBEDDED || !packet) return;
  const s = packet?.accepted_premaq_state?.state;
  if (!s) return;
  const state = {};
  PREMAQ_AXES.forEach((axis) => {
    state[axis] = typeof s[axis]?.value === 'number' ? s[axis].value : 0.5;
  });
  window.parent.postMessage({ type: 'arcsweep:premaq', state }, '*');
}

// Nav organ list — same across every page
const NAV_ORGANS = [
  { href: '/',                            label: 'Hearthgate' },
  { href: '/starwell/',                   label: 'Home' },
  { href: '/starwell/living-glyph/',      label: 'Living Glyph' },
  { href: '/starwell/echo-index/',        label: 'Echo Index' },
  { href: '/starwell/resonance-bridge/',  label: 'Resonance Bridge' },
  { href: '/starwell/glyph-studio/',      label: 'Glyph Forge' },
  { href: '/starwell/brush-foundry/',     label: 'Brush Foundry' },
  { href: '/starwell/canon-studio/',      label: 'Canon Studio' },
  { href: '/starwell/arcsweep-continuity/', label: 'Continuity Gate' },
  { href: '/starwell/arcsweep-replay/',   label: 'Replay' },
];

function NavLink({ href, label }) {
  const current = typeof window !== 'undefined' && window.location.pathname === href;
  return (
    <li>
      <a
        href={href}
        className="shell-nav__link"
        aria-current={current ? 'page' : undefined}
      >
        {label}
      </a>
    </li>
  );
}

function PremaqStrip({ premaqState }) {
  if (!premaqState) return null;
  return (
    <div className="premaq-strip" aria-label="PREMAQ state">
      {PREMAQ_AXES.map((axis) => {
        const c = premaqState[axis];
        const v = c?.value ?? 0.5;
        return (
          <div key={axis} className="premaq-axis" title={PREMAQ_LABELS[axis]}>
            <span className="premaq-axis__letter">{axis} · {PREMAQ_LABELS[axis]}</span>
            <span className="premaq-axis__value">{v.toFixed(2)}</span>
            <div className="premaq-axis__bar">
              <div className="premaq-axis__bar-fill" style={{ width: `${v * 100}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ArcsweepShell — wraps any organ page
// Props:
//   currentHref  — matches against nav links to set aria-current
//   title        — organ title string
//   children     — organ content
export default function ArcsweepShell({ currentHref, title, children }) {
  const [packet, setPacket] = useState(() => readBraidPacket());

  useEffect(() => {
    return subscribeToBraidPacket((p) => {
      setPacket(p);
      broadcastWorld(p?.world_profile?.world_slug);
      broadcastPremaq(p);
    }, { emitCurrent: true });
  }, []);

  const worldSlug = packet?.world_profile?.world_slug ?? null;
  const premaqState = packet?.accepted_premaq_state?.state ?? null;
  const fp = packet?.packet_fingerprint;
  const hasPacket = Boolean(packet);

  const phase = packet?.asking_packet
    ? 'asking'
    : packet
    ? 'observed'
    : null;

  return (
    <div
      className="arcsweep-shell"
      data-world={worldSlug || undefined}
      data-phase={phase || undefined}
    >
      {/* Navigation — hidden when loaded inside the Hearthgate shell iframe */}
      <nav className="shell-nav" aria-label="Arcsweep" style={IS_EMBEDDED ? { display: 'none' } : undefined}>
        <a href="/starwell/" className="shell-nav__wordmark">
          <strong>ARCSWEEP</strong> · STARWELL
        </a>
        <ul className="shell-nav__links" role="list">
          {NAV_ORGANS.map((o) => (
            <NavLink
              key={o.href}
              href={o.href}
              label={o.label}
            />
          ))}
        </ul>
        <div
          className="shell-nav__packet-status"
          data-active={hasPacket ? 'true' : 'false'}
          aria-label={hasPacket ? 'Braid packet active' : 'No active packet'}
        >
          {hasPacket ? 'PACKET SEALED' : 'NO PACKET'}
        </div>
      </nav>

      {/* State Ribbon */}
      <div className="shell-ribbon" role="status" aria-label="Active state">
        {phase && (
          <span
            className="shell-ribbon__class"
            data-active={phase}
          >
            {phase === 'observed' ? 'OBSERVED' : 'ASKING'}
          </span>
        )}
        {worldSlug && (
          <span className="shell-ribbon__world">
            {worldSlug}
          </span>
        )}
        {premaqState && (
          <PremaqStrip premaqState={premaqState} />
        )}
        {fp && (
          <span className="shell-ribbon__fingerprint" aria-label="Packet fingerprint">
            {fp}
          </span>
        )}
      </div>

      {/* Organ content */}
      <main className="shell-main" id="main-content">
        {children}
      </main>
    </div>
  );
}
