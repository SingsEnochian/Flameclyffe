import {createWyrdruneRuntime} from './runtime.mjs';

export const ACOUSTIC_FRAME_SCHEMA = 'wyrdrune.acoustic-frame/v0.1';
export const CELL_ADDRESSES = Object.freeze({origin: 1, peer: 2});

const SYMBOL_SECONDS = 0.046;
const SYNC = [0, 3, 0, 2, 1, 3, 2, 0];
const FREQUENCIES = [523.25, 659.25, 783.99, 987.77];
const CHORD = [[110, 0.092], [164.81, 0.063], [277.18, 0.040]];
const PACKET_BYTES = 6;
const FRAME_SECONDS = (SYNC.length + 4 * PACKET_BYTES) * SYMBOL_SECONDS;
const RETURN = 1;
const ACKNOWLEDGEMENT = 2;
const TAU = 2 * Math.PI;
export const ACOUSTIC_SAMPLE_RATE = 24000;
export const WITHNESS_BEAT_HZ = 3; // WITH-001: 223 Hz minus 220 Hz.
const OPEN_RESOLUTION_BIT = 0x04;
const WITHNESS_DEPTH = 0.16;
const MIN_FRAME_GAP_SECONDS = 0.55;
const CHORD_LEAD = 0.6;
const CHORD_TAIL = 0.95;

function inRange(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

function checkedFrame({schema, kind, sender, recipient, marker, resolution = 'unspecified'} = {}) {
  if (schema !== ACOUSTIC_FRAME_SCHEMA || ![RETURN, ACKNOWLEDGEMENT].includes(kind) ||
      !inRange(sender, 1, 255) || !inRange(recipient, 1, 255) || sender === recipient ||
      !inRange(marker, 1, 65535) || !['unspecified', 'open'].includes(resolution)) {
    throw new TypeError('A bounded, addressed Wyrdrune acoustic frame is required.');
  }
  const frame = {schema, kind, sender, recipient, marker};
  if (resolution === 'open') frame.resolution = resolution;
  return Object.freeze(frame);
}

export function createAcousticReturn({sender, recipient, marker, resolution}) {
  return checkedFrame({schema: ACOUSTIC_FRAME_SCHEMA, kind: RETURN, sender, recipient, marker, resolution});
}

function checksum(bytes) {
  let crc = 0;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = ((crc << 1) ^ ((crc & 0x80) ? 0x07 : 0)) & 0xff;
    }
  }
  return crc;
}

function symbolsFor(value) {
  const {kind, sender, recipient, marker, resolution} = checkedFrame(value);
  const flags = resolution === 'open' ? OPEN_RESOLUTION_BIT : 0;
  const bytes = [0x10 | kind | flags, sender, recipient, marker >> 8, marker & 0xff];
  bytes.push(checksum(bytes));
  return [...SYNC, ...bytes.flatMap(byte => [6, 4, 2, 0].map(shift => (byte >> shift) & 3))];
}

function fade(time, duration, edge) {
  const ramp = Math.min(1, time / edge, (duration - time) / edge);
  return 0.5 - 0.5 * Math.cos(Math.PI * ramp);
}

function onBeat(time) {
  return Math.ceil(time * WITHNESS_BEAT_HZ) / WITHNESS_BEAT_HZ;
}

/** Render mono-compatible stereo PCM. Each cell has a position and a distinct pulse envelope. */
export function renderAcousticFrames(frames, {mono = false} = {}) {
  if (!Array.isArray(frames) || frames.length < 1 || frames.length > 2) {
    throw new TypeError('Render one acoustic frame or a Return exchange.');
  }
  const sampleRate = ACOUSTIC_SAMPLE_RATE;
  const starts = [onBeat(CHORD_LEAD)];
  if (frames.length === 2) starts.push(onBeat(starts[0] + FRAME_SECONDS + MIN_FRAME_GAP_SECONDS));
  const openTail = frames.at(-1).kind === ACKNOWLEDGEMENT && frames.at(-1).resolution === 'open'
    ? 4 / WITHNESS_BEAT_HZ : 0;
  const duration = starts.at(-1) + FRAME_SECONDS + CHORD_TAIL + openTail;
  const length = Math.round(duration * sampleRate);
  const channels = [new Float32Array(length), new Float32Array(length)];
  for (let index = 0; index < length; index++) {
    const time = index / sampleRate;
    const withness = 1 + WITHNESS_DEPTH * Math.cos(TAU * WITHNESS_BEAT_HZ * time);
    const chord = CHORD.reduce((value, [hz, gain], voice) => value + gain * (
      Math.sin(TAU * hz * time) + 0.10 * Math.sin(TAU * 2 * hz * time)
    ) * (voice === 1 ? withness : 1), 0) * fade(time, duration, 0.26);
    channels[0][index] = chord;
    channels[1][index] = chord;
  }

  for (const [index, frame] of frames.entries()) {
    const start = Math.round(starts[index] * sampleRate);
    const pan = mono ? 0 : frame.sender === CELL_ADDRESSES.origin ? -0.55 : 0.55;
    const left = Math.sqrt((1 - pan) / 2);
    const right = Math.sqrt((1 + pan) / 2);
    const symbolLength = Math.round(sampleRate * SYMBOL_SECONDS);
    const edge = frame.kind === RETURN ? 0.009 : 0.014;
    for (const [symbolIndex, symbol] of symbolsFor(frame).entries()) {
      const offset = start + symbolIndex * symbolLength;
      for (let i = 0; i < symbolLength; i++) {
        const time = i / sampleRate;
        const pulse = 0.11 * fade(time, SYMBOL_SECONDS, edge) *
          Math.sin(TAU * FREQUENCIES[symbol] * time);
        channels[0][offset + i] += left * pulse;
        channels[1][offset + i] += right * pulse;
      }
    }
  }
  return {sampleRate, channels};
}

function readPacket(symbols) {
  if (symbols.includes(-1)) return null;
  const bytes = [];
  for (let i = 0; i < symbols.length; i += 4) {
    bytes.push((symbols[i] << 6) | (symbols[i + 1] << 4) | (symbols[i + 2] << 2) | symbols[i + 3]);
  }
  const [header, sender, recipient, high, low, crc] = bytes;
  if (checksum(bytes.slice(0, -1)) !== crc || (header & 0xf8) !== 0x10) return null;
  try {
    return checkedFrame({
      schema: ACOUSTIC_FRAME_SCHEMA, kind: header & 3, sender, recipient, marker: (high << 8) | low,
      resolution: (header & OPEN_RESOLUTION_BIT) ? 'open' : 'unspecified',
    });
  } catch {
    return null;
  }
}

/** Locate framed tones in mono PCM, including recordings with leading silence or room audio. */
export function hearAcousticFrames(samples, sampleRate) {
  if (!(samples instanceof Float32Array) || !inRange(sampleRate, 8000, 96000) ||
      samples.length > 18 * sampleRate) {
    throw new TypeError('Up to 18 seconds of mono PCM at a supported sample rate is required.');
  }
  const stride = Math.max(1, Math.round(sampleRate / 8000));
  const coefficients = FREQUENCIES.map(hz => 2 * Math.cos(TAU * hz * stride / sampleRate));
  const symbolLength = sampleRate * SYMBOL_SECONDS;
  const windowLength = Math.round(symbolLength * 0.48);
  const count = Math.ceil(windowLength / stride);
  const step = Math.round(symbolLength / 4);
  const frameLength = Math.ceil((SYNC.length + 4 * PACKET_BYTES) * symbolLength);

  function readSymbol(start) {
    const powers = coefficients.map(coefficient => {
      let last = 0;
      let previous = 0;
      for (let i = start; i < start + windowLength; i += stride) {
        const next = samples[i] + coefficient * last - previous;
        previous = last;
        last = next;
      }
      return (last * last + previous * previous - coefficient * last * previous) / (count * count);
    });
    const winner = powers.indexOf(Math.max(...powers));
    const others = powers.filter((_, index) => index !== winner);
    return powers[winner] >= 5e-8 && powers[winner] > 2.4 * Math.max(...others) ? winner : -1;
  }

  const heard = [];
  for (let start = 0; start + frameLength <= samples.length; start += step) {
    const read = index => readSymbol(start + Math.round((index + 0.26) * symbolLength));
    if (!SYNC.every((symbol, index) => read(index) === symbol)) continue;
    const symbols = Array.from({length: 4 * PACKET_BYTES}, (_, index) => read(index + SYNC.length));
    const packet = readPacket(symbols);
    if (!packet) continue;
    heard.push(packet);
    start += frameLength - step;
  }
  return heard;
}

export function isAcousticAcknowledgement(packet, request) {
  return packet?.kind === ACKNOWLEDGEMENT && request?.kind === RETURN &&
    packet.sender === request.recipient && packet.recipient === request.sender &&
    packet.marker === request.marker;
}

/** Each receiving address runs its own native Möbius before returning a typed answer. */
export async function receiveAcousticFrame(address, value, {signal} = {}) {
  if (!inRange(address, 1, 255)) throw new RangeError('A cell address is required.');
  const {kind, sender, recipient, marker, resolution = 'unspecified'} = checkedFrame(value);
  const source = `mobius {
    perceive { let signal_kind = ${kind}; let origin = ${sender}; let destination = ${recipient}; }
    compress { let return_marker = ${marker}; let resolution = "${resolution}"; }
    release { let cell = ${address}; }
    verify { let accepted = destination == cell and origin != cell; }
    integrate { let heard_return = accepted and signal_kind == 1; }
    choose { let acknowledge = heard_return; }
    return { emit {accepted: accepted, acknowledge: acknowledge,
      reply: {schema: "${ACOUSTIC_FRAME_SCHEMA}", kind: 2, sender: cell, recipient: origin, marker: return_marker, resolution: resolution}}; }
    transcend {}
  }`;
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(source)));
  const hash = Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
  const runtime = createWyrdruneRuntime({hashSource: () => hash});
  const execution = await runtime.execute(runtime.compile(source), {signal, maxOperations: 100});
  const [decision] = execution.output;
  return Object.freeze({
    accepted: decision.accepted,
    reply: decision.acknowledge ? checkedFrame(decision.reply) : null,
    phases: execution.receipts,
  });
}

export async function renderAcousticCellExchange(marker, {mono = false, resolution, signal} = {}) {
  const {origin, peer} = CELL_ADDRESSES;
  const request = createAcousticReturn({sender: origin, recipient: peer, marker, resolution});
  const outbound = renderAcousticFrames([request], {mono});
  const [heardReturn] = hearAcousticFrames(outbound.channels[0], outbound.sampleRate);
  const peerReceipt = await receiveAcousticFrame(peer, heardReturn, {signal});
  const inbound = renderAcousticFrames([peerReceipt.reply], {mono});
  const [reply] = hearAcousticFrames(inbound.channels[1], inbound.sampleRate);
  const originReceipt = await receiveAcousticFrame(origin, reply, {signal});
  if (!originReceipt.accepted || !isAcousticAcknowledgement(reply, request) || reply.resolution !== request.resolution) {
    throw new Error('The acoustic Return reached no matching acknowledgement.');
  }
  return {
    ...renderAcousticFrames([request, reply], {mono}),
    receipt: Object.freeze({request, reply, origin: originReceipt.phases, peer: peerReceipt.phases}),
  };
}
