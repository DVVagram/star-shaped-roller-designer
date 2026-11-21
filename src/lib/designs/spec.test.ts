import { describe, expect, it } from "vitest";

import { buildDrawingSvg, drawingFileName } from "./drawing";
import { designById, DESIGNS } from "./index";
import {
  buildSpecification,
  LIBRARY_VERSION,
  specificationFileName,
} from "./spec";
import type { AnyDesign, RawValues } from "./types";

const SAMPLE_IDS = [
  "timing-pulley",
  "spur-gear",
  "hex-nut",
  "centrifuge-tube",
  "compression-spring",
  "hose-barb",
  "cup",
  "vase",
  "wall-hook",
  "fan-mount",
  "zero-clearance-insert",
  "centering-cone",
];

function sample(id: string): AnyDesign {
  const design = designById(id);
  if (!design) throw new Error(`Missing design ${id}`);
  return design;
}

function rawFor(design: AnyDesign, units: "mm" | "in" = "mm"): RawValues {
  return {
    values: Object.fromEntries(
      Object.entries(design.defaults).map(([key, value]) => [
        key,
        units === "in" && design.lengthFields.includes(key)
          ? (Number(value) / 25.4).toFixed(6)
          : value,
      ]),
    ),
    units,
  };
}

describe("downloadable specification", () => {
  for (const id of SAMPLE_IDS) {
    it(`${id} records inputs, outputs, limits and checks`, () => {
      const design = sample(id);
      const raw = rawFor(design);
      const text = buildSpecification(design, raw, {
        generatedAt: new Date("2026-11-21T00:00:00Z"),
      });

      expect(text).toContain(design.id);
      expect(text).toContain(design.name);
      expect(text).toContain(LIBRARY_VERSION);
      expect(text).toContain("CAPABILITY:");
      expect(text).toContain(design.contract.intendedUse);
      expect(text).toContain(design.contract.standard);
      expect(text).toContain("ENTERED VALUES");
      expect(text).toContain("DERIVED VALUES");
      expect(text).toContain("LIMITATIONS");
      expect(text).toContain("NOT CHECKED");
      expect(text).toContain("STL is unitless");
      expect(text).not.toMatch(/build volume|printer|slicer|print bed/i);
      for (const field of design.fields) expect(text).toContain(field.key);
      for (const item of design.contract.limitations) expect(text).toContain(item);
      for (const issue of design.derive(raw).readout) expect(text).toContain(issue.label);
      expect(text).not.toMatch(/NaN|Infinity|undefined/);
      expect(specificationFileName(design, raw)).toMatch(/-spec\.txt$/);
    });
  }

  it("converts inch entries and still records the millimetre value", () => {
    const design = sample("hex-nut");
    const text = buildSpecification(design, rawFor(design, "in"));
    expect(text).toContain(" in (");
    expect(text).toContain(" mm)");
    expect(text).toContain("All internal geometry is in millimetres");
  });

  it("names the excluded high-risk use for unsafe categories", () => {
    const text = buildSpecification(sample("centrifuge-tube"), rawFor(sample("centrifuge-tube")));
    expect(text).toContain("Not suitable for the named high-risk use");
    expect(text).toContain("Do not spin this part in a centrifuge");
    expect(text).toContain("NOT CHECKED");
  });

  it("accepts a model larger than 180 mm without a build-area limit", () => {
    const design = sample("index-plate");
    const raw = rawFor(design);
    raw.values.outerDiameter = "300";
    raw.values.holeCircle = "170";

    const result = design.derive(raw);
    expect(result.errors).toEqual([]);

    const mesh = design.build(raw);
    const widthMm = mesh.boundingBox.max[0] - mesh.boundingBox.min[0];
    expect(widthMm).toBeGreaterThan(299);

    const text = buildSpecification(design, raw);
    expect(text).not.toMatch(/build volume|does not fit|printer/i);
    expect(text).toContain("Bounding box");
  });

  it("covers every designer without throwing", () => {
    for (const design of DESIGNS) {
      const text = buildSpecification(design, rawFor(design), {
        generatedAt: new Date("2026-11-21T00:00:00Z"),
      });
      expect(text.length).toBeGreaterThan(600);
      expect(text).not.toMatch(/NaN|Infinity|undefined/);
    }
  });
});

describe("measurement drawing", () => {
  for (const id of SAMPLE_IDS.slice(0, 8)) {
    it(`${id} draws a finite two-view sheet`, () => {
      const design = sample(id);
      const raw = rawFor(design);
      const svg = buildDrawingSvg(design, raw);

      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg.endsWith("</svg>")).toBe(true);
      expect(svg).toContain("measurement sheet");
      expect(svg).toContain(design.name.replace(/&/g, "&amp;"));
      expect(svg).toContain("Top view");
      expect(svg).toContain("Front view");
      expect(svg).toContain("Overall envelope");
      expect(svg).toContain("Not a tolerance drawing");
      expect(svg).toContain(design.contract.capability === "unsafe" ? "high-risk" : "Capability:");
      expect(svg).not.toMatch(/NaN|Infinity|undefined/);
      expect(drawingFileName(design, raw)).toMatch(/-drawing\.svg$/);
    });
  }
});
