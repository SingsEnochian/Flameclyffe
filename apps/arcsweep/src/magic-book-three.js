import * as THREE from 'three';
import { createArtifact, sealOriginReceipt, sealEncounterReceipt, createCrossingReceipt } from './temporal-action-channel.js';

export const MAGIC_BOOK_VERSION = 'arcsweep.magic-book-three/v1';
const RECEIPT_EVENT = 'arcsweep:magic-book-receipt';
const STORAGE_KEY = 'hearthgate.arcsweep.magic-book.v1';
const WITNESS_KEY = 'hearthgate.arcsweep.magic-book.witness.v1';
const PAGE_OBJECT_ID = 'arcsweep:magic-book:page:starsong-001';
const CROSSING_SCHEMA = 'arcsweep.magic-book-crossing/1';
const PAGE_SIGNATURE = Object.freeze({
  kind: 'magic-book-page',
  book_id: 'arcsweep:magic-book',
  page_id: PAGE_OBJECT_ID,
  world: 'starsong',
  continuity: 'identity-before-form',
});

const now = () => new Date().toISOString();
const id = () => crypto.randomUUID?.() || `book-${Date.now()}-${Math.random().toString(16).slice(2)}`;

function emitReceipt(action, detail = {}, objectId = 'arcsweep:magic-book') {
  const receipt = Object.freeze({
    schema: 'arcsweep.magic-book-receipt/1',
    receipt_id: id(),
    occurred_at: now(),
    object_id: objectId,
    renderer: 'three',
    version: MAGIC_BOOK_VERSION,
    action,
    ...detail,
  });
  window.dispatchEvent(new CustomEvent(RECEIPT_EVENT, { detail: receipt }));
  return receipt;
}

function readState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}

function writeState(next) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
}

function readWitnesses() {
  try {
    const value = JSON.parse(localStorage.getItem(WITNESS_KEY));
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function appendWitness(record) {
  const records = readWitnesses();
  records.push(record);
  const bounded = records.slice(-100);
  try { localStorage.setItem(WITNESS_KEY, JSON.stringify(bounded)); } catch {}
  return bounded;
}

function makePage(material, x) {
  const geometry = new THREE.PlaneGeometry(1.38, 1.84, 24, 6);
  geometry.userData.rest = Float32Array.from(geometry.attributes.position.array);
  const page = new THREE.Mesh(geometry, material);
  page.position.set(x, 0, 0.035);
  return page;
}

function pageRepresentation(progress) {
  if (progress <= .02) return 'resting-page';
  if (progress >= .98) return 'turned-page';
  return 'deforming-page';
}

function snapshotPage(progress) {
  return Object.freeze({
    object_id: PAGE_OBJECT_ID,
    continuity_signature: PAGE_SIGNATURE,
    representation: pageRepresentation(progress),
    transform_progress: Number(THREE.MathUtils.clamp(progress, 0, 1).toFixed(4)),
    observed_at: now(),
  });
}

function compareCrossing(origin, encounter) {
  const sameIdentity = origin.object_id === encounter.object_id;
  const sameSignature = JSON.stringify(origin.continuity_signature) === JSON.stringify(encounter.continuity_signature);
  return Object.freeze({
    schema: CROSSING_SCHEMA,
    crossing_id: id(),
    observed_at: now(),
    origin,
    encounter,
    observer: 'arcsweep:observer:magic-book',
    continuity_preserved: sameIdentity && sameSignature,
    representation_changed: origin.representation !== encounter.representation,
    delta: {
      representation: [origin.representation, encounter.representation],
      transform_progress: encounter.transform_progress - origin.transform_progress,
    },
  });
}

function pageReceipt(action, progress, detail = {}) {
  return emitReceipt(action, {
    continuity_signature: PAGE_SIGNATURE,
    representation: pageRepresentation(progress),
    transform_progress: Number(THREE.MathUtils.clamp(progress, 0, 1).toFixed(4)),
    ...detail,
  }, PAGE_OBJECT_ID);
}

function curlPage(page, progress) {
  const position = page.geometry.attributes.position;
  const rest = page.geometry.userData.rest;
  const p = THREE.MathUtils.clamp(progress, 0, 1);
  for (let i = 0; i < position.count; i += 1) {
    const offset = i * 3;
    const x = rest[offset];
    const y = rest[offset + 1];
    const u = (x + .69) / 1.38;
    const fold = Math.sin(u * Math.PI) * p;
    position.setXYZ(i, x - .13 * fold * u, y, rest[offset + 2] + .34 * fold);
  }
  position.needsUpdate = true;
  page.geometry.computeVertexNormals();
}

export function mountMagicBook({ host = document.body } = {}) {
  if (!host || document.getElementById('arcsweep-magic-book-three')) return null;

  const shell = document.createElement('section');
  shell.id = 'arcsweep-magic-book-three';
  shell.setAttribute('aria-label', 'Arcsweep Magic Book');
  shell.innerHTML = `
    <canvas aria-label="Interactive Magic Book"></canvas>
    <div class="magic-book-copy">
      <small>STARSONG · ARCSWEEP</small>
      <strong>The Book is the bridge.</strong>
      <span data-book-status>Touch the cover to open.</span>
    </div>
    <aside class="magic-book-observatory" aria-label="Magic Book Observatory" hidden>
      <small>OBSERVER · TAC CROSSING</small>
      <strong data-observer-object>Waiting for a crossing…</strong>
      <dl>
        <div><dt>Continuity</dt><dd data-observer-continuity>unknown</dd></div>
        <div><dt>Representation</dt><dd data-observer-representation>unknown</dd></div>
        <div><dt>Evidence</dt><dd data-observer-evidence>unknown</dd></div>
        <div><dt>Origin</dt><dd data-observer-origin>—</dd></div>
        <div><dt>Encounter</dt><dd data-observer-encounter>—</dd></div>
        <div><dt>Observer</dt><dd data-observer-join>—</dd></div>
      </dl>
      <div class="magic-book-witness-nav">
        <button type="button" data-witness-prev aria-label="Previous crossing">←</button>
        <span data-witness-index>live</span>
        <button type="button" data-witness-next aria-label="Next crossing">→</button>
      </div>
      <div class="magic-book-witness-nav" aria-label="Replay edge">
        <button type="button" data-witness-origin>Origin</button>
        <button type="button" data-witness-encounter>Encounter</button>
      </div>
      <label class="magic-book-time-scrubber">
        <span>TIME ROOM</span>
        <input type="range" min="0" max="1000" value="1000" step="1" data-witness-scrubber aria-label="Scrub witnessed crossing through time">
        <output data-witness-scrub-output>100%</output>
      </label>
    </aside>`;
  host.prepend(shell);

  const style = document.createElement('style');
  style.textContent = `
    #arcsweep-magic-book-three{position:fixed;inset:0;z-index:2;display:grid;place-items:center;overflow:hidden;background:radial-gradient(circle at 50% 35%,#243b35 0,#0b100f 68%);transition:opacity .45s ease}
    #arcsweep-magic-book-three canvas{width:100%;height:100%;touch-action:none}
    .magic-book-copy{position:absolute;bottom:max(1.25rem,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);display:grid;gap:.2rem;text-align:center;color:#eadfbf;pointer-events:none;text-shadow:0 2px 16px #000}
    .magic-book-copy small{letter-spacing:.18em}.magic-book-copy strong{font:600 clamp(1.15rem,3vw,1.7rem)/1.2 Georgia,serif}.magic-book-copy span{opacity:.72;font-size:.82rem}
    .magic-book-observatory{position:absolute;top:max(1rem,env(safe-area-inset-top));right:1rem;width:min(24rem,calc(100vw - 2rem));padding:1rem;border:1px solid #8d7647;border-radius:.8rem;background:rgba(8,14,12,.9);color:#e8dfc8;font:500 .78rem/1.35 system-ui,sans-serif;box-shadow:0 12px 48px #0008}
    .magic-book-observatory small{letter-spacing:.14em;opacity:.68}.magic-book-observatory strong{display:block;margin:.3rem 0 .7rem;font-family:ui-monospace,monospace}.magic-book-observatory dl{margin:0;display:grid;gap:.35rem}.magic-book-observatory dl div{display:grid;grid-template-columns:7rem 1fr;gap:.5rem}.magic-book-observatory dt{opacity:.62}.magic-book-observatory dd{margin:0;overflow-wrap:anywhere;font-family:ui-monospace,monospace}
    #arcsweep-magic-book-three[data-open="true"]{background:transparent;pointer-events:none}
    #arcsweep-magic-book-three[data-open="true"] canvas{opacity:.16;pointer-events:none}
    #arcsweep-magic-book-three[data-open="true"] .magic-book-copy{opacity:.16}
    #arcsweep-magic-book-three[data-open="true"] .magic-book-observatory{pointer-events:auto}
    @media(prefers-reduced-motion:reduce){#arcsweep-magic-book-three{transition:none}}
  `;
  document.head.append(style);

  const canvas = shell.querySelector('canvas');
  const status = shell.querySelector('[data-book-status]');
  const observatory = shell.querySelector('.magic-book-observatory');
  const observerField = (name) => shell.querySelector(`[data-observer-${name}]`);
  const shortHash = (value) => value ? `${value.slice(0, 10)}…${value.slice(-6)}` : '—';
  let witnesses = readWitnesses();
  let witnessIndex = witnesses.length ? witnesses.length - 1 : -1;
  const witnessIndexNode = shell.querySelector('[data-witness-index]');
  const showCrossing = (comparison, label = 'live') => {
    const tac = comparison?.tac;
    if (!observatory || !tac) return;
    observatory.hidden = false;
    observerField('object').textContent = PAGE_OBJECT_ID;
    observerField('continuity').textContent = comparison.continuity_preserved ? 'PRESERVED' : 'BREAK';
    observerField('representation').textContent = comparison.representation_changed
      ? comparison.delta.representation.join(' → ')
      : 'unchanged';
    observerField('evidence').textContent = tac.evidence_state || 'unknown';
    observerField('origin').textContent = shortHash(tac.origin_receipt_hash);
    observerField('encounter').textContent = shortHash(tac.encounter_receipt_hash);
    observerField('join').textContent = shortHash(tac.observer_receipt_hash);
    if (witnessIndexNode) witnessIndexNode.textContent = label;
  };
  const reconstructWitness = (witness, edge = 'encounter') => {
    const snapshot = edge === 'origin' ? witness.origin_snapshot : witness.encounter_snapshot;
    if (!snapshot) return null;
    const progress = THREE.MathUtils.clamp(snapshot.transform_progress ?? 0, 0, 1);
    curlPage(rightPage, progress);
    pageRepresentationState = pageRepresentation(progress);
    status.textContent = `Time Room replay · ${edge} · ${pageRepresentationState}`;
    return snapshot;
  };
  const replayWitness = (index, edge = 'encounter') => {
    if (!witnesses.length) return;
    witnessIndex = THREE.MathUtils.clamp(index, 0, witnesses.length - 1);
    const witness = witnesses[witnessIndex];
    const snapshot = reconstructWitness(witness, edge);
    showCrossing(witness.comparison, `${witnessIndex + 1}/${witnesses.length}`);
    emitReceipt('witness-replayed', {
      witness_id: witness.witness_id,
      recorded_at: witness.recorded_at,
      replay_index: witnessIndex,
      replay_edge: edge,
      reconstructed_representation: snapshot?.representation ?? null,
      reconstructed_progress: snapshot?.transform_progress ?? null,
    }, PAGE_OBJECT_ID);
  };
  shell.querySelector('[data-witness-prev]')?.addEventListener('click', () => replayWitness(witnessIndex - 1));
  shell.querySelector('[data-witness-next]')?.addEventListener('click', () => replayWitness(witnessIndex + 1));
  shell.querySelector('[data-witness-origin]')?.addEventListener('click', () => replayWitness(witnessIndex, 'origin'));
  shell.querySelector('[data-witness-encounter]')?.addEventListener('click', () => replayWitness(witnessIndex, 'encounter'));
  const scrubber = shell.querySelector('[data-witness-scrubber]');
  const scrubOutput = shell.querySelector('[data-witness-scrub-output]');
  const scrubWitness = (value, receipt = false) => {
    if (!witnesses.length) return;
    const witness = witnesses[witnessIndex < 0 ? witnesses.length - 1 : witnessIndex];
    const t = THREE.MathUtils.clamp(Number(value) / 1000, 0, 1);
    const from = witness.origin_snapshot?.transform_progress ?? 0;
    const to = witness.encounter_snapshot?.transform_progress ?? from;
    const progress = THREE.MathUtils.lerp(from, to, t);
    curlPage(rightPage, progress);
    pageRepresentationState = pageRepresentation(progress);
    status.textContent = `Time Room scrub · ${Math.round(t * 100)}% · ${pageRepresentationState}`;
    if (scrubOutput) scrubOutput.value = `${Math.round(t * 100)}%`;
    if (receipt) emitReceipt('witness-scrubbed', {
      witness_id: witness.witness_id,
      temporal_position: Number(t.toFixed(3)),
      reconstructed_progress: Number(progress.toFixed(4)),
      reconstructed_representation: pageRepresentationState,
    }, PAGE_OBJECT_ID);
  };
  scrubber?.addEventListener('input', (event) => scrubWitness(event.target.value));
  scrubber?.addEventListener('change', (event) => scrubWitness(event.target.value, true));
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
  camera.position.set(0, .05, 5.2);

  scene.add(new THREE.HemisphereLight(0xf3d9a0, 0x10201c, 2.2));
  const warm = new THREE.PointLight(0xe9b55f, 18, 8);
  warm.position.set(-2, 2.4, 3);
  scene.add(warm);

  const book = new THREE.Group();
  book.rotation.x = -.08;
  scene.add(book);

  const coverMat = new THREE.MeshStandardMaterial({ color: 0x3b1714, roughness: .72, metalness: .08 });
  const pageMat = new THREE.MeshStandardMaterial({ color: 0xe7d6aa, roughness: .92, side: THREE.DoubleSide });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xc49a4b, roughness: .38, metalness: .7 });

  const back = new THREE.Mesh(new THREE.BoxGeometry(3.08, 2.08, .12), coverMat);
  back.position.z = -.08;
  book.add(back);

  const leftPage = makePage(pageMat, -.72);
  const rightPage = makePage(pageMat, .72);
  book.add(leftPage, rightPage);

  const frontPivot = new THREE.Group();
  frontPivot.position.x = -1.54;
  const front = new THREE.Mesh(new THREE.BoxGeometry(3.08, 2.08, .1), coverMat);
  front.position.x = 1.54;
  frontPivot.add(front);
  book.add(frontPivot);

  const sigil = new THREE.Mesh(new THREE.TorusGeometry(.36, .025, 12, 64), goldMat);
  sigil.position.set(0, 0, .08);
  front.add(sigil);

  let state = readState();
  let phase = state.open ? 'open' : 'closed';
  const restoredAngle = Number(state.coverAngle);
  let target = Number.isFinite(restoredAngle)
    ? THREE.MathUtils.clamp(restoredAngle, 0, Math.PI)
    : (state.open ? Math.PI * .985 : 0);
  let coverAngle = target;
  let dragging = false;
  let startX = 0;
  let startAngle = 0;
  let pageRepresentationState = pageRepresentation(0);
  let crossingOrigin = null;
  let tacCrossing = null;
  const reducedMotion = matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

  const persist = (action) => {
    state = { ...state, open: phase === 'open', phase, coverAngle, updated_at: now() };
    writeState(state);
    emitReceipt(action, { phase, open: state.open, cover_angle: Number(coverAngle.toFixed(4)) });
  };

  const setPhase = (next, action) => {
    if (phase === next) return;
    phase = next;
    shell.dataset.open = String(next === 'open');
    status.textContent = next === 'open' ? 'Book open · ArcSweep continues beneath the page.' : 'Touch the cover to open.';
    persist(action);
  };

  let renderedWidth = 0;
  let renderedHeight = 0;
  function resize() {
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    if (width === renderedWidth && height === renderedHeight) return;
    renderedWidth = width;
    renderedHeight = height;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  const pointerX = (event) => event.clientX / Math.max(1, innerWidth);
  canvas.addEventListener('pointerdown', async (event) => {
    canvas.setPointerCapture(event.pointerId);
    dragging = true;
    if (status.textContent.startsWith('Time Room')) status.textContent = phase === 'open' ? 'Book open · ArcSweep continues beneath the page.' : 'Touch the cover to open.';
    startX = pointerX(event);
    startAngle = coverAngle;
    emitReceipt('interaction-started', { phase, pointer_type: event.pointerType });
    crossingOrigin = snapshotPage(Math.sin(Math.min(1, coverAngle / Math.PI) * Math.PI));
    const crossingId = id();
    const artifact = await createArtifact({
      crossing_id: crossingId,
      payload: crossingOrigin,
      provenance: { object_id: PAGE_OBJECT_ID, surface: 'magic-book-three' },
    });
    const origin = await sealOriginReceipt({
      crossing_id: crossingId,
      context_id: 'magic-book:pre-transform',
      artifact_hash: artifact.artifact_hash,
      anticipated_recipient: 'magic-book:post-transform',
      anticipated_effect: 'representation may change while continuity survives',
      reason_for_persisting: 'prove page identity across representation change',
      knowledge_available: crossingOrigin,
    });
    tacCrossing = { artifact, origin };
    pageReceipt('crossing-origin-sealed', crossingOrigin.transform_progress, {
      crossing_role: 'origin',
      snapshot: crossingOrigin,
      tac_receipt_hash: origin.receipt_hash,
    });
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const delta = (pointerX(event) - startX) * Math.PI * 1.5;
    coverAngle = THREE.MathUtils.clamp(startAngle + delta, 0, Math.PI);
    target = coverAngle;
  });
  const release = async () => {
    if (!dragging) return;
    dragging = false;
    target = coverAngle > Math.PI * .32 ? Math.PI * .985 : 0;
    emitReceipt('interaction-released', { target: target > 1 ? 'open' : 'closed' });
    if (crossingOrigin) {
      const encounter = snapshotPage(Math.sin(Math.min(1, coverAngle / Math.PI) * Math.PI));
      pageReceipt('crossing-encounter-sealed', encounter.transform_progress, {
        crossing_role: 'encounter',
        snapshot: encounter,
      });
      const comparison = compareCrossing(crossingOrigin, encounter);
      if (tacCrossing) {
        const encounterReceipt = await sealEncounterReceipt({
          crossing_id: tacCrossing.artifact.crossing_id,
          context_id: 'magic-book:post-transform',
          artifact_hash_seen: tacCrossing.artifact.artifact_hash,
          perceived_origin: PAGE_OBJECT_ID,
          interpretation: encounter,
          action_taken: 'render transformed page representation',
          knowledge_available: encounter,
          resulting_state_hash: null,
        });
        const observerReceipt = await createCrossingReceipt({
          origin: tacCrossing.origin,
          encounter: encounterReceipt,
          behavioural_delta: comparison.delta,
        });
        comparison.tac = {
          artifact_hash: tacCrossing.artifact.artifact_hash,
          origin_receipt_hash: tacCrossing.origin.receipt_hash,
          encounter_receipt_hash: encounterReceipt.receipt_hash,
          observer_receipt_hash: observerReceipt.receipt_hash,
          evidence_state: observerReceipt.body.evidence_state,
        };
      }
      const witness = Object.freeze({
        schema: 'arcsweep.temporal-witness.magic-book/1',
        witness_id: id(),
        recorded_at: now(),
        object_id: PAGE_OBJECT_ID,
        origin_snapshot: crossingOrigin,
        encounter_snapshot: encounter,
        comparison,
      });
      witnesses = appendWitness(witness);
      witnessIndex = witnesses.length - 1;
      showCrossing(comparison, `${witnesses.length}/${witnesses.length}`);
      emitReceipt('witness-recorded', {
        witness_id: witness.witness_id,
        recorded_at: witness.recorded_at,
        witness_count: witnesses.length,
      }, PAGE_OBJECT_ID);
      emitReceipt('crossing-observed', {
        crossing: comparison,
        continuity_preserved: comparison.continuity_preserved,
        representation_changed: comparison.representation_changed,
      }, PAGE_OBJECT_ID);
      crossingOrigin = null;
      tacCrossing = null;
    }
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  const clock = new THREE.Clock();
  let frameId = 0;
  let destroyed = false;
  function frame() {
    if (destroyed) return;
    resize();
    if (!dragging) {
      const step = reducedMotion ? 1 : 1 - Math.exp(-clock.getDelta() * 8);
      coverAngle = THREE.MathUtils.lerp(coverAngle, target, step);
      if (target > 1 && coverAngle > Math.PI * .94) setPhase('open', 'opened');
      if (target === 0 && coverAngle < .04) setPhase('closed', 'closed');
    } else clock.getDelta();
    frontPivot.rotation.y = -coverAngle;
    const pageProgress = Math.sin(Math.min(1, coverAngle / Math.PI) * Math.PI);
    if (!status.textContent.startsWith('Time Room')) curlPage(rightPage, pageProgress);
    const nextRepresentation = pageRepresentation(pageProgress);
    if (nextRepresentation !== pageRepresentationState) {
      pageReceipt('representation-changed', pageProgress, {
        from: pageRepresentationState,
        to: nextRepresentation,
        continuity_preserved: true,
      });
      pageRepresentationState = nextRepresentation;
    }
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(frame);
  }

  shell.dataset.open = String(phase === 'open');
  emitReceipt('mounted', { restored_phase: phase, restored: Boolean(state.updated_at) });
  pageReceipt('object-observed', 0, { continuity_preserved: true });
  frame();

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(frameId);
    scene.traverse((node) => {
      node.geometry?.dispose?.();
      if (Array.isArray(node.material)) node.material.forEach((material) => material?.dispose?.());
      else node.material?.dispose?.();
    });
    renderer.dispose();
    style.remove();
    shell.remove();
    emitReceipt('destroyed', { phase, cover_angle: Number(coverAngle.toFixed(4)) });
  };

  return { shell, scene, book, renderer, destroy, getState: () => ({ phase, coverAngle }) };
}
