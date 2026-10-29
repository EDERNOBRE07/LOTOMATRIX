import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, isMaskable = false) {
  // RGBA buffer with 1 filter byte per scanline
  const rowSize = width * 4;
  const rawData = Buffer.alloc((rowSize + 1) * height);

  const cx = width / 2;
  const cy = height / 2;
  const rOuter = width * 0.42;
  const rInner = width * 0.24;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (rowSize + 1);
    rawData[rowOffset] = 0; // Filter type: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background: Deep dark slate / gold-tinted (#090d16)
      let r = 9;
      let g = 13;
      let b = 22;
      let a = 255;

      // Outer golden/emerald reticle ring
      if (Math.abs(dist - rOuter) < width * 0.02) {
        r = 245; g = 158; b = 11; // Amber/Gold #f59e0b
      } else if (Math.abs(dist - (rOuter * 0.8)) < width * 0.015) {
        r = 16; g = 185; b = 129; // Emerald #10b981
      }

      // Crosshair lines
      if ((Math.abs(dx) < width * 0.015 && dist < rOuter + width * 0.05 && dist > rInner) ||
          (Math.abs(dy) < width * 0.015 && dist < rOuter + width * 0.05 && dist > rInner)) {
        r = 239; g = 68; b = 68; // Red sniper #ef4444
      }

      // Center ball (Purple/Gold #9333ea / #f59e0b)
      if (dist < rInner) {
        const factor = 1 - (dist / rInner);
        r = Math.round(147 + 60 * factor);
        g = Math.round(51 + 60 * factor);
        b = Math.round(234);
      }

      // Center laser dot
      if (dist < width * 0.035) {
        r = 255; g = 255; b = 255;
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  // Deflate compressed data
  const compressed = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // Bit depth
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10); // Compression
  ihdrData.writeUInt8(0, 11); // Filter
  ihdrData.writeUInt8(0, 12); // Interlace
  const ihdr = makeChunk('IHDR', ihdrData);

  // IDAT chunk
  const idat = makeChunk('IDAT', compressed);

  // IEND chunk
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc >>> 0, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

const pub = path.resolve('public');
fs.writeFileSync(path.join(pub, 'pwa-192x192.png'), createPNG(192, 192));
fs.writeFileSync(path.join(pub, 'pwa-512x512.png'), createPNG(512, 512));
fs.writeFileSync(path.join(pub, 'pwa-maskable-512x512.png'), createPNG(512, 512, true));
fs.writeFileSync(path.join(pub, 'apple-touch-icon.png'), createPNG(180, 180));
console.log('PWA PNG Icons generated successfully!');
