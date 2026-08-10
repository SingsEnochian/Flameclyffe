'use strict';

/*
  Hearthgate Kernel Bridge v0.1
  Sends text input to Hearthfire's /api/hearthgate/kernel/crossing endpoint,
  receives the dual-aspect blended PREMAQ field state, and re-broadcasts it
  on the channels that Flameclyffe instruments already listen to.

  Usage:
    HearthgateKernelBridge.send("The well answers.", modes, { house: "House_Nocturne" })

  Configuration:
    Set window.HEARTHGATE_BRIDGE_URL before loading this script to change the
    Hearthfire server URL. Defaults to http://127.0.0.1:4173.

  Output channels:
    - CustomEvent 'starwell:field-snapshot' on window        (same-tab)
    - BroadcastChannel 'starwell-concurrent-field'           (cross-tab)
    - CustomEvent 'starwell:deep-observer:packet' on window  (legacy, for deep-observer instruments)
    - BroadcastChannel 'starwell-deep-observer'              (legacy, cross-tab)

  All four channels carry the same data — instruments pick up whichever they listen to.
*/

(function installHearthgateKernelBridge(global) {
  const HEARTHFIRE_URL = (global.HEARTHGATE_BRIDGE_URL ?? 'http://127.0.0.1:4173').replace(/\/$/, '');
  const ENDPOINT = `${HEARTHFIRE_URL}/api/hearthgate/kernel/crossing`;

  let _concurrentChannel = null;
  let _deepChannel = null;

  function _getChannels() {
    try { _concurrentChannel = _concurrentChannel ?? new BroadcastChannel('starwell-concurrent-field'); } catch (_) {}
    try { _deepChannel       = _deepChannel       ?? new BroadcastChannel('starwell-deep-observer');   } catch (_) {}
  }

  // Build the deep snapshot payload from a blended PREMAQ object.
  // Using the legacy deep-observer packet format so all existing instruments
  // pick it up without modification.
  function _buildDeepPacket(result) {
    const p = result.premaq;
    return {
      type: 'deep-observer:packet',
      packet: {
        source:    'hearthgate-kernel',
        glyphId:   result.receipt_id,
        timestamp: new Date().toISOString(),
        deep: {
          P:       p.P,
          C:       p.C,
          R:       p.R,
          E:       p.E,
          M:       p.M,
          A:       p.A,
          charge:  p.Q,
          // Carry shores as provenance; instruments can ignore or display
          _shores: result.shores ?? null,
        },
        stability: result.stability ?? 'healthy',
        radius:    result.radius    ?? null,
      },
    };
  }

  // Build the concurrent-field snapshot format.
  function _buildFieldSnapshot(result) {
    const p = result.premaq;
    return {
      type: 'starwell:field-snapshot',
      snapshot: {
        schema_version: 'hearthgate.kernel.v1',
        snapshot_id:    result.receipt_id,
        created_at:     new Date().toISOString(),
        source:         'hearthgate-kernel',
        deep: {
          P:      p.P,
          C:      p.C,
          R:      p.R,
          E:      p.E,
          M:      p.M,
          A:      p.A,
          charge: p.Q,
        },
        evidence_labels: { deep: 'field_model' },
        stability:  result.stability ?? 'healthy',
        radius:     result.radius    ?? null,
        _shores:    result.shores    ?? null,
      },
    };
  }

  function _broadcast(result) {
    _getChannels();

    const deepPacket     = _buildDeepPacket(result);
    const fieldSnapshot  = _buildFieldSnapshot(result);

    // Same-tab CustomEvents — caught by starwell-concurrent-field-audio and deep-observer instruments
    try { global.dispatchEvent(new CustomEvent('starwell:deep-observer:packet',    { detail: deepPacket }));    } catch (_) {}
    try { global.dispatchEvent(new CustomEvent('starwell:concurrent-field-snapshot', { detail: fieldSnapshot.snapshot })); } catch (_) {}

    // Cross-tab BroadcastChannel — other open Flameclyffe tabs
    try { if (_concurrentChannel) _concurrentChannel.postMessage(fieldSnapshot);   } catch (_) {}
    try { if (_deepChannel)       _deepChannel.postMessage(deepPacket);            } catch (_) {}
  }

  /**
   * Send text to the hearthgate kernel and broadcast the field result.
   *
   * @param {string}   text     - The text to process (e.g. user input, narrative passage)
   * @param {number[]} modes    - Epistemic mode per character: 0=SYNTHETIC 1=CALIBRATED 2=DERIVED 3=OBSERVED
   *                             Length must match text.length
   * @param {object}   [opts]
   * @param {string}   [opts.house]  - Origin house (default: 'House_Nocturne')
   * @returns {Promise<object>}  - The full crossing result including blended PREMAQ
   */
  async function send(text, modes, opts = {}) {
    if (typeof text !== 'string' || text.length === 0) {
      throw new TypeError('HearthgateKernelBridge.send: text must be a non-empty string');
    }
    if (!Array.isArray(modes) || modes.length !== text.length) {
      throw new TypeError('HearthgateKernelBridge.send: modes must be an array with one entry per character');
    }

    const res = await fetch(ENDPOINT, {
      method:  'POST',
      headers: { 'content-type': 'application/json' },
      body:    JSON.stringify({
        text_input:      text,
        epistemic_modes: modes,
        origin_house:    opts.house ?? 'House_Nocturne',
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(`HearthgateKernelBridge: server error ${res.status} — ${err.error ?? res.statusText}`);
    }

    const result = await res.json();

    if (!result.ok) {
      throw new Error(`HearthgateKernelBridge: crossing failed — ${result.error ?? 'unknown'}`);
    }

    _broadcast(result);
    return result;
  }

  /**
   * Convenience: send a string where every character is marked OBSERVED (mode 3).
   * Use for live user typing where no character is synthetic.
   */
  async function sendObserved(text, opts = {}) {
    return send(text, Array.from({ length: text.length }, () => 3), opts);
  }

  /**
   * Convenience: send a string with a single mode applied to all characters.
   */
  async function sendWithMode(text, mode, opts = {}) {
    return send(text, Array.from({ length: text.length }, () => mode), opts);
  }

  global.HearthgateKernelBridge = Object.freeze({ send, sendObserved, sendWithMode });

})(window);
