import { describe, expect, it } from "vitest";

import { createZip } from "./zip";

function u32(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer).getUint32(offset, true);
}

describe("createZip", () => {
  it("writes local headers, a central directory and an end record", () => {
    const zip = createZip(
      [
        { name: "part.stl", data: new Uint8Array([1, 2, 3, 4]) },
        { name: "part-spec.txt", data: "hello" },
      ],
      new Date(2026, 0, 2, 3, 4, 6),
    );

    expect(u32(zip, 0)).toBe(0x04034b50);
    expect(new TextDecoder().decode(zip.subarray(30, 38))).toBe("part.stl");
    const end = zip.length - 22;
    expect(u32(zip, end)).toBe(0x06054b50);
    expect(new DataView(zip.buffer).getUint16(end + 10, true)).toBe(2);
    expect(new TextDecoder().decode(zip)).toContain("part-spec.txt");
  });

  it("records the standard CRC-32 for a stored file", () => {
    const zip = createZip([{ name: "hello.txt", data: "hello" }], new Date(2026, 0, 2));
    expect(u32(zip, 14)).toBe(0x3610a686);
  });
});
