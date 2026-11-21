import { describe, expect, it } from "vitest";

import { inspectMesh } from "@/lib/kit/solid";

import { prismGears } from "./prism-gears";
import { prismParts } from "./prism-parts";
import { motionDesigns } from "./motion-designs";
import { revolveMechanical } from "./revolve-mechanical";
import { revolveVessels } from "./revolve-vessels";
import type { AnyDesign } from "./types";

const ALL: AnyDesign[] = [
  ...prismGears,
  ...prismParts,
  ...revolveVessels,
  ...revolveMechanical,
  ...motionDesigns,
];

describe("designer library: defaults", () => {
  it("ships exactly forty-six new designers", () => {
    expect(ALL.length).toBe(46);
  });

  it("has unique ids", () => {
    const ids = ALL.map((design) => design.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const design of ALL) {
    it(`${design.id} starts valid and builds a closed shell`, () => {
      const raw = { values: design.defaults, units: "mm" as const };
      const result = design.derive(raw);
      if (result.errors.length > 0) {
        console.log(
          design.id,
          result.errors.map((issue) => `${issue.field}: ${issue.message}`),
        );
      }
      expect(result.errors).toEqual([]);
      const mesh = design.build(raw);
      const report = inspectMesh(mesh);
      expect({
        watertight: report.watertight,
        manifold: report.manifold,
        components: report.components,
        euler: report.eulerCharacteristic,
      }).toEqual({ watertight: true, manifold: true, components: 1, euler: report.eulerCharacteristic });
      expect(report.ok).toBe(true);
      expect(mesh.triangleCount).toBeGreaterThan(20);
      expect(mesh.volumeMm3).toBeGreaterThan(1);
      for (const value of mesh.positions) expect(Number.isFinite(value)).toBe(true);
      expect(design.fileName(raw)).toMatch(/\.stl$/);
      expect(design.header.length).toBeLessThanOrEqual(80);
      for (const char of design.header) expect(char.charCodeAt(0)).toBeLessThan(127);
    });
  }
});
