import { describe, expect, it } from "vitest";

import { buildBinaryStl, inspectMesh, type Mesh } from "@/lib/kit/solid";
import type { LengthUnit } from "@/lib/kit/units";

import { DESIGNS, DESIGN_GROUPS } from "./index";
import type { AnyDesign, RawValues } from "./types";

const ALL: AnyDesign[] = DESIGNS;

const mm = (design: AnyDesign, overrides: Record<string, string> = {}): RawValues => ({
  values: { ...design.defaults, ...overrides },
  units: "mm" as const,
});

const inch = (design: AnyDesign, overrides: Record<string, string> = {}): RawValues => ({
  values: {
    ...Object.fromEntries(
      Object.entries(design.defaults).map(([key, value]) => [
        key,
        design.lengthFields.includes(key) ? (Number(value) / 25.4).toFixed(6) : value,
      ]),
    ),
    ...overrides,
  },
  units: "in" as const,
});

function assertSolid(design: AnyDesign, mesh: Mesh, label: string): void {
  const report = inspectMesh(mesh, { allowMultipleComponents: design.multiBody });
  expect({
    label,
    ok: report.ok,
    watertight: report.watertight,
    manifold: report.manifold,
  }).toEqual({ label, ok: true, watertight: true, manifold: true });
  if (design.multiBody) {
    expect({ label, components: report.components > 1 }).toEqual({ label, components: true });
  } else {
    expect({ label, components: report.components }).toEqual({ label, components: 1 });
  }
  expect(mesh.triangleCount).toBeGreaterThanOrEqual(12);
  expect(mesh.volumeMm3).toBeGreaterThan(0.5);
  for (const value of mesh.positions) expect(Number.isFinite(value)).toBe(true);
}

function stlVolume(buffer: ArrayBuffer): number {
  const view = new DataView(buffer);
  const count = view.getUint32(80, true);
  let six = 0;
  for (let t = 0; t < count; t += 1) {
    const offset = 84 + t * 50 + 12;
    const v = (i: number) => view.getFloat32(offset + i * 4, true);
    const ax = v(0);
    const ay = v(1);
    const az = v(2);
    const bx = v(3);
    const by = v(4);
    const bz = v(5);
    const cx = v(6);
    const cy = v(7);
    const cz = v(8);
    six +=
      ax * (by * cz - cy * bz) -
      bx * (ay * cz - cy * az) +
      cx * (ay * bz - by * az);
  }
  return Math.abs(six) / 6;
}

describe("designer library", () => {
  it("ships exactly two hundred and forty-six designers", () => {
    expect(ALL.length).toBe(246);
    expect(DESIGN_GROUPS.reduce((sum, group) => sum + group.length, 0)).toBe(246);
  });

  it("has unique ids and unique file names for the defaults", () => {
    const ids = ALL.map((design) => design.id);
    expect(new Set(ids).size).toBe(ids.length);
    const files = ALL.map((design) => design.fileName(mm(design)));
    expect(new Set(files).size).toBe(files.length);
  });

  it("declares a header and at least two notes for every designer", () => {
    for (const design of ALL) {
      expect(design.header.length).toBeGreaterThan(0);
      expect(design.header.length).toBeLessThanOrEqual(80);
      for (const char of design.header) expect(char.charCodeAt(0)).toBeLessThan(127);
      expect(design.notes.length).toBeGreaterThanOrEqual(2);
      expect(design.chips.length).toBeGreaterThanOrEqual(2);
      expect(design.fields.length).toBeGreaterThanOrEqual(2);
      expect(design.lede.length).toBeGreaterThan(40);
    }
  });
});

describe("designer library: use cases", () => {
  it("states a concrete, distinct use case for every designer", () => {
    const seen = new Map<string, string[]>();
    for (const design of ALL) {
      expect(design.use.length).toBeGreaterThanOrEqual(25);
      expect(design.use.length).toBeLessThanOrEqual(200);
      expect(design.use).not.toMatch(/TODO|lorem|placeholder/i);
      expect(design.use.trim()).toBe(design.use);
      seen.set(design.use, [...(seen.get(design.use) ?? []), design.id]);
    }
    for (const [use, ids] of seen) {
      expect({ use, ids }).toEqual({ use, ids: [ids[0]] });
    }
  });
});

describe("designer library: defaults", () => {
  for (const design of ALL) {
    it(`${design.id} starts valid and builds a closed shell`, () => {
      const raw = mm(design);
      const result = design.derive(raw);
      if (result.errors.length > 0) {
        console.log(
          design.id,
          result.errors.map((issue) => `${issue.field}: ${issue.message}`),
        );
      }
      expect(result.errors).toEqual([]);
      expect(result.readout.length).toBeGreaterThanOrEqual(4);
      expect(result.preview.label.length).toBeGreaterThan(0);
      assertSolid(design, design.build(raw), design.id);
      expect(design.fileName(raw)).toMatch(/\.stl$/);
    });
  }
});

describe("designer library: parameter sweeps", () => {
  for (const design of ALL) {
    it(`${design.id} survives the extremes of every field`, () => {
      for (const field of design.fields) {
        const bounds: [number, number] =
          field.kind === "count"
            ? [Math.round(field.min ?? 0), Math.round(field.max ?? 0)]
            : [field.min ?? 0, field.max ?? 0];
        if (field.min === undefined || field.max === undefined) continue;
        for (const value of bounds) {
          const raw = mm(design, { [field.key]: String(value) });
          const result = design.derive(raw);
          expect(Array.isArray(result.errors)).toBe(true);
          // A rejected configuration must not be built, but the rejection must
          // point at a real field.
          if (result.errors.length > 0) {
            for (const issue of result.errors) {
              expect(design.fields.some((candidate) => candidate.key === issue.field)).toBe(true);
            }
            continue;
          }
          assertSolid(design, design.build(raw), `${design.id}/${field.key}=${value}`);
        }
      }
    });
  }

  it("blocks a nonsensical entry instead of crashing", () => {
    for (const design of ALL) {
      const raw: RawValues = {
        values: Object.fromEntries(design.fields.map((field) => [field.key, "-1"])),
        units: "mm",
      };
      const result = design.derive(raw);
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });
});

describe("designer library: units", () => {
  for (const design of ALL) {
    it(`${design.id} builds the same part in inches`, () => {
      const metric = design.derive(mm(design));
      const imperial = design.derive(inch(design));
      expect(imperial.errors).toEqual([]);
      const a = design.build(mm(design));
      const b = design.build(inch(design));
      // A discrete pattern (a hole grid, a bolt ring) can gain or lose one
      // feature at the edge, so compare the envelope exactly and the volume
      // loosely.
      for (let axis = 0; axis < 3; axis += 1) {
        expect(b.boundingBox.max[axis] - b.boundingBox.min[axis]).toBeCloseTo(
          a.boundingBox.max[axis] - a.boundingBox.min[axis],
          1,
        );
      }
      expect(b.volumeMm3 / a.volumeMm3).toBeGreaterThan(0.9);
      expect(b.volumeMm3 / a.volumeMm3).toBeLessThan(1.1);
      expect(metric.preview.cells.length).toBe(imperial.preview.cells.length);
    });
  }
});

describe("designer library: STL", () => {
  for (const design of ALL) {
    it(`${design.id} exports the measured mesh`, () => {
      const mesh = design.build(mm(design));
      const buffer = buildBinaryStl(mesh, design.header);
      const view = new DataView(buffer);
      expect(buffer.byteLength).toBe(84 + mesh.triangleCount * 50);
      expect(view.getUint32(80, true)).toBe(mesh.triangleCount);
      const header = new Uint8Array(buffer, 0, 80);
      for (const byte of header) {
        expect(byte === 0 || (byte >= 32 && byte < 127)).toBe(true);
      }
      expect(stlVolume(buffer)).toBeCloseTo(mesh.volumeMm3, 0);
    });
  }
});

describe("designer library: families", () => {
  it("covers every family with at least a few parts", () => {
    const counts = new Map<string, number>();
    for (const design of ALL) {
      counts.set(design.family, (counts.get(design.family) ?? 0) + 1);
    }
    for (const count of counts.values()) expect(count).toBeGreaterThan(0);
    expect([...counts.values()].filter((count) => count > 4).length).toBeGreaterThanOrEqual(4);
    expect([...counts.values()].reduce((sum, count) => sum + count, 0)).toBe(246);
  });

  it("is the same set the catalogue renders", () => {
    const ids = new Set(ALL.map((design) => design.id));
    for (const group of DESIGN_GROUPS) {
      for (const design of group) expect(ids.has(design.id)).toBe(true);
    }
    expect(ids.size).toBe(246);
  });
});

describe("designer library: repeat run", () => {
  it("gives the same geometry twice for every default", () => {
    for (const design of ALL) {
      const first = design.build(mm(design));
      const second = design.build(mm(design));
      expect(second.triangleCount).toBe(first.triangleCount);
      expect(second.volumeMm3).toBeCloseTo(first.volumeMm3, 6);
      expect(second.positions.length).toBe(first.positions.length);
    }
  });

  it("gives the same verdict twice for every rejection", () => {
    for (const design of ALL) {
      const raw = mm(design, { [design.fields[0].key]: "0" });
      const a = design.derive(raw);
      const b = design.derive(raw);
      expect(b.errors).toEqual(a.errors);
      expect(b.warnings).toEqual(a.warnings);
      expect(b.readout).toEqual(a.readout);
    }
  });

  it("keeps a millimetre and an inch readout in the same unit system", () => {
    const units: LengthUnit[] = ["mm", "in"];
    for (const design of ALL) {
      for (const unit of units) {
        const result = design.derive({
          values: Object.fromEntries(
            Object.entries(design.defaults).map(([key, value]) => [
              key,
              design.lengthFields.includes(key) && unit === "in"
                ? (Number(value) / 25.4).toFixed(6)
                : value,
            ]),
          ),
          units: unit,
        });
        expect(result.errors).toEqual([]);
        for (const item of result.readout) {
          expect(item.value.length).toBeGreaterThan(0);
          expect(item.value).not.toContain("NaN");
          expect(item.value).not.toContain("Infinity");
        }
      }
    }
  });
});
