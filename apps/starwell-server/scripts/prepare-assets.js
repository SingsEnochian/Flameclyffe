'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');

const root = path.resolve(__dirname, '..');
const buildDir = path.join(root, 'build');
const iconPath = path.join(buildDir, 'hearthgate.png');
const WIDTH = 256;
const HEIGHT = 256;

function makeCrcTable() {
  return Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    }
    return value >>> 0;
  });
}

const CRC_TABLE = makeCrcTable();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data = Buffer.alloc(0)) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function clamp(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function blend(base, overlay, alpha) {
  return [
    clamp(base[0] * (1 - alpha) + overlay[0] * alpha),
    clamp(base[1] * (1 - alpha) + overlay[1] * alpha),
    clamp(base[2] * (1 - alpha) + overlay[2] * alpha),
    255,
  ];
}

function colourAt(x, y) {
  const centreX = WIDTH / 2;
  const centreY = HEIGHT / 2;
  const dx = x - centreX;
  const dy = y - centreY;
  const distance = Math.hypot(dx, dy);
  const edgeFade = Math.max(0, Math.min(1, (distance - 68) / 120));
  let colour = blend([7, 13, 11, 255], [17, 35, 28, 255], Math.max(0, 1 - distance / 190));
  colour = blend(colour, [3, 7, 7, 255], edgeFade * 0.72);

  const rainbowCentreY = 201;
  const rainbowDistance = Math.hypot(dx, y - rainbowCentreY);
  const rainbowBands = [
    { radius: 103, width: 4.5, colour: [191, 71, 44] },
    { radius: 93, width: 4.5, colour: [215, 135, 49] },
    { radius: 83, width: 4.5, colour: [211, 177, 74] },
    { radius: 73, width: 4.5, colour: [45, 194, 132] },
    { radius: 63, width: 4.5, colour: [55, 139, 177] },
    { radius: 53, width: 4.5, colour: [111, 83, 166] },
  ];
  if (y <= rainbowCentreY + 2) {
    for (const band of rainbowBands) {
      const delta = Math.abs(rainbowDistance - band.radius);
      if (delta <= band.width) {
        const alpha = 0.72 + 0.24 * (1 - delta / band.width);
        colour = blend(colour, band.colour, alpha);
      }
    }
  }

  const gateRadius = Math.hypot(dx, dy + 10);
  if (Math.abs(gateRadius - 57) < 3.2) colour = blend(colour, [201, 168, 76], 0.95);
  if (Math.abs(gateRadius - 45) < 1.8) colour = blend(colour, [46, 214, 144], 0.88);

  const diamond = Math.abs(dx) + Math.abs(dy + 10);
  if (Math.abs(diamond - 29) < 2.2) colour = blend(colour, [229, 239, 225], 0.94);

  const starHorizontal = Math.abs(dy + 10) < 1.5 && Math.abs(dx) < 20;
  const starVertical = Math.abs(dx) < 1.5 && Math.abs(dy + 10) < 20;
  const starDiagonalA = Math.abs(dx - (dy + 10)) < 1.6 && Math.abs(dx) < 14;
  const starDiagonalB = Math.abs(dx + (dy + 10)) < 1.6 && Math.abs(dx) < 14;
  if (starHorizontal || starVertical || starDiagonalA || starDiagonalB) {
    colour = blend(colour, [239, 229, 184], 0.98);
  }

  const innerGlow = Math.max(0, 1 - Math.hypot(dx, dy + 10) / 24);
  if (innerGlow > 0) colour = blend(colour, [46, 214, 144], innerGlow * 0.22);

  const corner = Math.min(x, y, WIDTH - 1 - x, HEIGHT - 1 - y);
  if (corner < 4) colour = blend(colour, [0, 0, 0], (4 - corner) / 8);
  return colour;
}

function createPng() {
  const scanlineLength = 1 + WIDTH * 4;
  const raw = Buffer.alloc(scanlineLength * HEIGHT);
  for (let y = 0; y < HEIGHT; y += 1) {
    const rowOffset = y * scanlineLength;
    raw[rowOffset] = 0;
    for (let x = 0; x < WIDTH; x += 1) {
      const colour = colourAt(x, y);
      const pixelOffset = rowOffset + 1 + x * 4;
      raw[pixelOffset] = colour[0];
      raw[pixelOffset + 1] = colour[1];
      raw[pixelOffset + 2] = colour[2];
      raw[pixelOffset + 3] = colour[3];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0);
  ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND'),
  ]);
}

fs.mkdirSync(buildDir, { recursive: true });
const icon = createPng();
fs.writeFileSync(iconPath, icon);
const sha256 = crypto.createHash('sha256').update(icon).digest('hex');
console.log(`[Hearthgate assets] icon: ${iconPath}`);
console.log(`[Hearthgate assets] dimensions: ${WIDTH}x${HEIGHT}`);
console.log(`[Hearthgate assets] bytes: ${icon.length}`);
console.log(`[Hearthgate assets] sha256: ${sha256}`);
