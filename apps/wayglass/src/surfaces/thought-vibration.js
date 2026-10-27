import {
  getThoughtVibrationOperator,
  renderThoughtVibrationSession,
  simulateThoughtVibrationQuantum,
} from '../route-client.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function sessionId() {
  return 'tv-' + (globalThis.crypto?.randomUUID?.() || Date.now()).toString().replaceAll('-', '').slice(0, 24);
}

function numberValue(input) {
  return Number.parseFloat(input.value);
}

function base64ToBlob(base64, type) {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type });
}

function pretty(value) {
  return JSON.stringify(value, null, 2);
}

export async function mountThoughtVibrationSurface(root) {
  let latestReceipt = null;
  let latestReceiptRef = null;
  let objectUrl = null;
  let receiptUrl = null;
  let renderController = null;
  let renderGeneration = 0;

  root.innerHTML = [
    '<section class="wg-surface tv-surface" data-surface="thought-vibration">',
      '<header class="wg-surface-head glass-panel">',
        '<div>',
          '<p class="eyebrow">Wayglass specialist operator</p>',
          '<h1>Thought Vibration</h1>',
          '<p class="lede">Mythiences v2.0 proving chamber. Symbolic intention may become reproducible audio or a declared quantum toy model without crossing truth domains by accident.</p>',
        '</div>',
        '<div class="tv-operator-card">',
          '<strong id="tv-operator-label">Loading operator…</strong>',
          '<span id="tv-operator-state" class="tiny">No device output. No autoplay.</span>',
        '</div>',
      '</header>',

      '<section class="tv-grid">',
        '<form id="tv-audio-form" class="glass-panel tv-panel">',
          '<div class="tv-panel-head"><div><p class="eyebrow">Runa → Möbius → Observatory</p><h2>Offline acoustic proving</h2></div><span class="truth-chip">OBSERVATION-TRUE</span></div>',
          '<label>Recipe<select id="tv-kind"><option value="separate-ear-stereo">Separate-ear stereo</option><option value="mono-am">Mono amplitude modulation</option></select></label>',
          '<div class="tv-fields two-col">',
            '<label>Duration seconds<input id="tv-duration" type="number" min="0.05" max="30" step="0.05" value="2"></label>',
            '<label>Gain linear<input id="tv-gain" type="number" min="0.001" max="0.15" step="0.001" value="0.05"></label>',
            '<label>Fade seconds<input id="tv-fade" type="number" min="0.005" max="2" step="0.005" value="0.1"></label>',
          '</div>',
          '<div id="tv-stereo-fields" class="tv-fields three-col">',
            '<label>Left Hz<input id="tv-left" type="number" min="20" max="10000" step="0.1" value="432"></label>',
            '<label>Right Hz<input id="tv-right" type="number" min="20" max="10000" step="0.1" value="437.5"></label>',
            '<label>Phase offset°<input id="tv-phase" type="number" min="-180" max="180" step="1" value="0"></label>',
          '</div>',
          '<div id="tv-mono-fields" class="tv-fields three-col" hidden>',
            '<label>Carrier Hz<input id="tv-carrier" type="number" min="20" max="10000" step="0.1" value="432"></label>',
            '<label>Modulation Hz<input id="tv-modulation" type="number" min="0.1" max="30" step="0.1" value="5.5"></label>',
            '<label>Depth<input id="tv-depth" type="number" min="0" max="1" step="0.05" value="1"></label>',
          '</div>',
          '<details class="tv-details">',
            '<summary>Mythic + continuity annotations</summary>',
            '<div class="tv-fields two-col">',
              '<label>Authored channel state<select id="tv-channel-state"><option value="">None</option><option value="open">Open</option><option value="stabilised">Stabilised</option><option value="collapsed">Collapsed</option></select></label>',
              '<label>Rhythm pattern<input id="tv-rhythm" maxlength="128" placeholder="Optional authored pattern"></label>',
            '</div>',
            '<label>Interpretation<textarea id="tv-interpretation" maxlength="512" rows="3" placeholder="Symbolic scene meaning, not a measurement."></textarea></label>',
            '<label>Stop point<input id="tv-stop-point" maxlength="256" placeholder="Optional Return Engine stop point"></label>',
            '<label>Next owner<input id="tv-next-owner" maxlength="128" placeholder="Optional named next owner"></label>',
            '<label>Unresolved questions<textarea id="tv-unresolved" rows="3" placeholder="One question per line"></textarea></label>',
          '</details>',
          '<label class="tv-consent"><input id="tv-render-intent" type="checkbox"> Render an offline diagnostic WAV only. Do not play it or activate a device.</label>',
          '<div class="tv-actions">',
            '<button id="tv-render" type="submit" class="send-jewel" disabled>Render diagnostic</button>',
            '<button id="tv-feather" type="button" class="glass-chip">Feather / clear</button>',
          '</div>',
          '<div id="tv-render-status" class="tiny">Waiting for explicit render intent.</div>',
          '<div id="tv-render-result" class="tv-result" hidden>',
            '<div class="tv-result-actions">',
              '<a id="tv-download" class="glass-chip tv-download" href="#" download>Save WAV</a>',
              '<a id="tv-save-receipt" class="glass-chip tv-download" href="#" download>Save receipt JSON</a>',
              '<button id="tv-pin" type="button" class="glass-chip">Pin receipt to next Return</button>',
            '</div>',
            '<pre id="tv-receipt"></pre>',
          '</div>',
        '</form>',

        '<form id="tv-quantum-form" class="glass-panel tv-panel">',
          '<div class="tv-panel-head"><div><p class="eyebrow">Optional Quantum Lab</p><h2>Declared toy simulation</h2></div><span class="truth-chip symbolic">SYMBOLIC</span></div>',
          '<p class="tiny">Dimensionless one-qubit reference only. No participant quantum state, hardware, consciousness effect, or acoustic entrainment is inferred.</p>',
          '<label>Operation<select id="tv-quantum-operation"><option value="avoided-crossing">Avoided crossing</option><option value="density-from-bloch">Density from Bloch vector</option><option value="measure-z">Z measurement probabilities</option><option value="evolve-bloch">Unitary Bloch evolution</option></select></label>',
          '<div class="tv-fields three-col">',
            '<label>λ<input id="tv-lambda" type="number" step="0.1" value="0"></label>',
            '<label>g<input id="tv-g" type="number" min="0" step="0.1" value="1"></label>',
            '<label>time<input id="tv-time" type="number" min="0" step="0.1" value="0.5"></label>',
            '<label>Bloch x<input id="tv-x" type="number" min="-1" max="1" step="0.1" value="0"></label>',
            '<label>Bloch y<input id="tv-y" type="number" min="-1" max="1" step="0.1" value="0"></label>',
            '<label>Bloch z<input id="tv-z" type="number" min="-1" max="1" step="0.1" value="1"></label>',
          '</div>',
          '<div class="tv-actions"><button type="submit" class="send-jewel">Run simulation</button></div>',
          '<div id="tv-quantum-status" class="tiny">No simulation run yet.</div>',
          '<pre id="tv-quantum-result" class="tv-result" hidden></pre>',
        '</form>',
      '</section>',

      '<footer class="wg-receipt tiny">Thought Vibration v2.0 · no automatic playback · specialist receipts remain provenance, not canon or identity authority.</footer>',
    '</section>',
  ].join('');

  const kind = root.querySelector('#tv-kind');
  const stereoFields = root.querySelector('#tv-stereo-fields');
  const monoFields = root.querySelector('#tv-mono-fields');
  const renderIntent = root.querySelector('#tv-render-intent');
  const renderButton = root.querySelector('#tv-render');
  const audioForm = root.querySelector('#tv-audio-form');
  const renderStatus = root.querySelector('#tv-render-status');
  const renderResult = root.querySelector('#tv-render-result');
  const receiptPre = root.querySelector('#tv-receipt');
  const download = root.querySelector('#tv-download');
  const saveReceipt = root.querySelector('#tv-save-receipt');
  const pin = root.querySelector('#tv-pin');
  const feather = root.querySelector('#tv-feather');
  const quantumForm = root.querySelector('#tv-quantum-form');
  const quantumStatus = root.querySelector('#tv-quantum-status');
  const quantumResult = root.querySelector('#tv-quantum-result');

  function clearRender() {
    renderGeneration += 1;
    renderController?.abort();
    renderController = null;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    if (receiptUrl) URL.revokeObjectURL(receiptUrl);
    objectUrl = null;
    receiptUrl = null;
    latestReceipt = null;
    latestReceiptRef = null;
    download.removeAttribute('href');
    saveReceipt.removeAttribute('href');
    renderResult.hidden = true;
    receiptPre.textContent = '';
    renderStatus.textContent = 'Feather: pending browser render cancelled; no output is playing.';
    renderButton.disabled = !renderIntent.checked;
  }

  function refreshRecipe() {
    const stereo = kind.value === 'separate-ear-stereo';
    stereoFields.hidden = !stereo;
    monoFields.hidden = stereo;
  }

  function buildSession() {
    const stereo = kind.value === 'separate-ear-stereo';
    const audio = {
      kind: kind.value,
      duration_seconds: numberValue(root.querySelector('#tv-duration')),
      sample_rate_hz: 48000,
      gain_linear: numberValue(root.querySelector('#tv-gain')),
      fade_seconds: numberValue(root.querySelector('#tv-fade')),
    };
    if (stereo) {
      audio.left_hz = numberValue(root.querySelector('#tv-left'));
      audio.right_hz = numberValue(root.querySelector('#tv-right'));
      audio.phase_offset_deg = numberValue(root.querySelector('#tv-phase'));
    } else {
      audio.carrier_hz = numberValue(root.querySelector('#tv-carrier'));
      audio.modulation_hz = numberValue(root.querySelector('#tv-modulation'));
      audio.modulation_depth = numberValue(root.querySelector('#tv-depth'));
    }

    const channelState = root.querySelector('#tv-channel-state').value;
    const rhythm = root.querySelector('#tv-rhythm').value.trim();
    const interpretation = root.querySelector('#tv-interpretation').value.trim();
    const mythic = channelState || rhythm || interpretation
      ? {
          ...(channelState ? { channel_state: channelState } : {}),
          ...(rhythm ? { rhythm_pattern: rhythm } : {}),
          ...(interpretation ? { interpretation } : {}),
        }
      : undefined;
    const unresolved = root.querySelector('#tv-unresolved').value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 20);

    return {
      schema: 'thought-vibration.session/v1',
      session_id: sessionId(),
      mode: mythic ? 'combined-experiment' : 'acoustic-engineering',
      claim_domain: 'OBSERVATION-TRUE',
      source_id: 'wayglass:thought-vibration-surface',
      render_intent_confirmed: renderIntent.checked,
      audio,
      output: { kind: 'offline-diagnostic-wav', playback: false },
      ...(mythic ? { mythic } : {}),
      stop_point: root.querySelector('#tv-stop-point').value.trim() || null,
      next_owner: root.querySelector('#tv-next-owner').value.trim() || null,
      unresolved_questions: unresolved,
    };
  }

  async function loadOperator() {
    try {
      const descriptor = await getThoughtVibrationOperator();
      root.querySelector('#tv-operator-label').textContent = descriptor.label + ' · v' + descriptor.version;
      root.querySelector('#tv-operator-state').textContent = 'Integrated reference · renderer quiet until explicit invocation';
    } catch (error) {
      root.querySelector('#tv-operator-label').textContent = 'Thought Vibration AI · local surface';
      root.querySelector('#tv-operator-state').textContent = 'Operator descriptor unavailable · ' + error.message;
    }
  }

  kind.addEventListener('change', refreshRecipe);
  renderIntent.addEventListener('change', () => {
    renderButton.disabled = !renderIntent.checked;
    renderStatus.textContent = renderIntent.checked
      ? 'Explicit offline render intent confirmed. No playback will occur.'
      : 'Waiting for explicit render intent.';
  });

  audioForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!renderIntent.checked) return;
    clearRender();
    renderButton.disabled = true;
    const generation = renderGeneration;
    const controller = new AbortController();
    renderController = controller;
    renderStatus.textContent = 'Rendering deterministic diagnostic PCM…';
    try {
      const result = await renderThoughtVibrationSession({
        session: buildSession(),
        includeWave: true,
        signal: controller.signal,
      });
      if (generation !== renderGeneration || controller.signal.aborted) return;
      latestReceipt = result.receipt;
      latestReceiptRef = result.receipt_ref;
      const blob = base64ToBlob(result.artifact.data, result.artifact.mime_type);
      objectUrl = URL.createObjectURL(blob);
      download.href = objectUrl;
      download.download = result.artifact.filename;
      const evidence = {
        schema: 'wayglass.thought-vibration-evidence/v0.1',
        receipt_ref: result.receipt_ref,
        receipt: result.receipt,
        artifact: {
          kind: result.artifact.kind,
          filename: result.artifact.filename,
          mime_type: result.artifact.mime_type,
          bytes: result.artifact.bytes,
          sha256: result.artifact.sha256,
          persisted: false,
          playback: false,
        },
        inspection: result.receipt_inspection,
        warning: 'Local exported evidence only. A receipt digest is not proof of authorship or device playback.',
      };
      receiptUrl = URL.createObjectURL(new Blob([pretty(evidence) + '\\n'], { type: 'application/json' }));
      saveReceipt.href = receiptUrl;
      saveReceipt.download = result.receipt.session_id + '.thought-vibration-receipt.json';
      receiptPre.textContent = pretty({
        receipt_ref: result.receipt_ref,
        measurements: result.receipt.measurements,
        claims: result.receipt.claims,
        continuity: result.receipt.continuity,
        persisted: result.artifact.persisted,
        playback: result.artifact.playback,
      });
      renderResult.hidden = false;
      renderStatus.textContent = 'Rendered in memory · ' + result.artifact.bytes + ' bytes · no playback · not persisted';
    } catch (error) {
      if (generation === renderGeneration && !controller.signal.aborted) {
        renderStatus.textContent = 'Render rejected · ' + error.message;
      }
    } finally {
      if (generation === renderGeneration) {
        renderController = null;
        renderButton.disabled = !renderIntent.checked;
      }
    }
  });

  pin.addEventListener('click', () => {
    if (!latestReceipt) return;
    const pinned = globalThis.__wayglassOS?.pinSpecialistReceipt?.(latestReceipt);
    renderStatus.textContent = pinned
      ? 'Receipt pinned to next Return Engine departure · ' + latestReceiptRef
      : 'Wayglass host could not pin this receipt.';
  });

  feather.addEventListener('click', clearRender);

  quantumForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    quantumStatus.textContent = 'Running declared symbolic model…';
    quantumResult.hidden = true;
    const operation = root.querySelector('#tv-quantum-operation').value;
    const vector = {
      x: numberValue(root.querySelector('#tv-x')),
      y: numberValue(root.querySelector('#tv-y')),
      z: numberValue(root.querySelector('#tv-z')),
    };
    const args = {
      vector,
      lambda: numberValue(root.querySelector('#tv-lambda')),
      g: numberValue(root.querySelector('#tv-g')),
      time: numberValue(root.querySelector('#tv-time')),
    };
    try {
      const result = await simulateThoughtVibrationQuantum({ operation, args });
      quantumResult.textContent = pretty(result);
      quantumResult.hidden = false;
      quantumStatus.textContent = 'Simulation complete · SYMBOLIC · no physical state inferred';
    } catch (error) {
      quantumStatus.textContent = 'Simulation rejected · ' + error.message;
    }
  });

  refreshRecipe();
  await loadOperator();

  return Object.freeze({
    surface_id: 'thought-vibration:operator',
    lastReceipt: () => latestReceipt,
    destroy() {
      clearRender();
    },
  });
}
