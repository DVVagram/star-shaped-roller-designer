/**
 * Minimal store-only ZIP writer.
 *
 * The export bundle needs one download containing ASCII STL, UTF-8 text and SVG.
 * Deflate would require a dependency for very little gain at these sizes, so the
 * files are stored uncompressed with a correct CRC and central directory.
 */

export interface ZipEntry {
  name: string;
  data: string | Uint8Array | ArrayBuffer;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function bytesOf(data: ZipEntry["data"]): Uint8Array {
  if (typeof data === "string") return new TextEncoder().encode(data);
  return data instanceof Uint8Array ? data : new Uint8Array(data);
}

function dosDateTime(date: Date): { time: number; date: number } {
  const time =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const day =
    ((date.getFullYear() - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();
  return { time, date: day };
}

export function createZip(entries: ZipEntry[], date = new Date()): Uint8Array {
  const encoder = new TextEncoder();
  const { time, date: dosDate } = dosDateTime(date);
  const prepared = entries.map((entry) => {
    const name = encoder.encode(entry.name);
    const data = bytesOf(entry.data);
    return { name, data, crc: crc32(data), offset: 0 };
  });

  let localSize = 0;
  for (const entry of prepared) localSize += 30 + entry.name.length + entry.data.length;
  let centralSize = 0;
  for (const entry of prepared) centralSize += 46 + entry.name.length;

  const out = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(out.buffer);
  let cursor = 0;

  for (const entry of prepared) {
    entry.offset = cursor;
    view.setUint32(cursor, 0x04034b50, true);
    view.setUint16(cursor + 4, 20, true);
    view.setUint16(cursor + 6, 0x0800, true);
    view.setUint16(cursor + 8, 0, true);
    view.setUint16(cursor + 10, time, true);
    view.setUint16(cursor + 12, dosDate, true);
    view.setUint32(cursor + 14, entry.crc, true);
    view.setUint32(cursor + 18, entry.data.length, true);
    view.setUint32(cursor + 22, entry.data.length, true);
    view.setUint16(cursor + 26, entry.name.length, true);
    view.setUint16(cursor + 28, 0, true);
    out.set(entry.name, cursor + 30);
    out.set(entry.data, cursor + 30 + entry.name.length);
    cursor += 30 + entry.name.length + entry.data.length;
  }

  const centralOffset = cursor;
  for (const entry of prepared) {
    view.setUint32(cursor, 0x02014b50, true);
    view.setUint16(cursor + 4, 20, true);
    view.setUint16(cursor + 6, 20, true);
    view.setUint16(cursor + 8, 0x0800, true);
    view.setUint16(cursor + 10, 0, true);
    view.setUint16(cursor + 12, time, true);
    view.setUint16(cursor + 14, dosDate, true);
    view.setUint32(cursor + 16, entry.crc, true);
    view.setUint32(cursor + 20, entry.data.length, true);
    view.setUint32(cursor + 24, entry.data.length, true);
    view.setUint16(cursor + 28, entry.name.length, true);
    view.setUint16(cursor + 30, 0, true);
    view.setUint16(cursor + 32, 0, true);
    view.setUint16(cursor + 34, 0, true);
    view.setUint16(cursor + 36, 0, true);
    view.setUint32(cursor + 38, 0, true);
    view.setUint32(cursor + 42, entry.offset, true);
    out.set(entry.name, cursor + 46);
    cursor += 46 + entry.name.length;
  }

  view.setUint32(cursor, 0x06054b50, true);
  view.setUint16(cursor + 4, 0, true);
  view.setUint16(cursor + 6, 0, true);
  view.setUint16(cursor + 8, prepared.length, true);
  view.setUint16(cursor + 10, prepared.length, true);
  view.setUint32(cursor + 12, cursor - centralOffset, true);
  view.setUint32(cursor + 16, centralOffset, true);
  view.setUint16(cursor + 20, 0, true);

  return out;
}
