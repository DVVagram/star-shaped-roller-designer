import { describe, expect, it } from "vitest";

import { inspectMesh } from "@/lib/kit/solid";

import { designById, designsInFamily } from "./index";
import type { AnyDesign } from "./types";
import { buildDesignPresets } from "./presets";
import { buildSpecification } from "./spec";
import {
  FONT_FACES,
  FONT_IDS,
  TEXT_PATTERN,
  buildTextMesh,
  textWidthMm,
} from "./text-kit";
import { textProducts } from "./text-products";

const ALLOWED = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,'&!?+-";
const TEXT_DESIGNS = designsInFamily("text");

const mm = (
  design: AnyDesign,
  overrides: Record<string, string> = {},
): { values: Record<string, string>; units: "mm" } => ({
  values: { ...design.defaults, ...overrides },
  units: "mm",
});

const capXs = (mesh: ReturnType<AnyDesign["build"]>) => {
  const top = mesh.boundingBox.max[2];
  const xs: number[] = [];
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const indices = [mesh.indices[i], mesh.indices[i + 1], mesh.indices[i + 2]];
    if (!indices.every((index) => Math.abs(mesh.positions[index * 3 + 2] - top) < 1e-4)) {
      continue;
    }
    for (const index of indices) xs.push(Math.round(mesh.positions[index * 3] * 1000) / 1000);
  }
  return xs.sort((a, b) => a - b);
};

describe("text kit: fonts", () => {
  it("ships the four faces with glyphs for every accepted character", () => {
    expect(FONT_IDS).toEqual(["sans", "sans-bold", "serif", "mono"]);
    for (const id of FONT_IDS) {
      const data = FONT_FACES[id].font.data;
      expect(data.resolution).toBeGreaterThan(0);
      for (const char of ALLOWED) {
        expect(data.glyphs[char], `${id} is missing "${char}"`).toBeTruthy();
      }
      // The assets are subset to the accepted set; a future re-import of a full
      // typeface should fail here rather than quietly grow the bundle again.
      for (const char of Object.keys(data.glyphs)) {
        expect(ALLOWED.includes(char), `${id} carries unused glyph "${char}"`).toBe(true);
      }
    }
  });

  it("accepts only the printable character set", () => {
    expect(TEXT_PATTERN.test("ALEX 42")).toBe(true);
    expect(TEXT_PATTERN.test("O'NEIL & CO.")).toBe(true);
    expect(TEXT_PATTERN.test("lowercase")).toBe(false);
    expect(TEXT_PATTERN.test("café")).toBe(false);
    expect(TEXT_PATTERN.test("Ω")).toBe(false);
  });

  it("measures width from the font advances, linearly with size", () => {
    const small = textWidthMm("ALEX", "sans", 10);
    const large = textWidthMm("ALEX", "sans", 20);
    expect(small).toBeGreaterThan(0);
    expect(large).toBeCloseTo(small * 2, 6);
    expect(textWidthMm("AL", "sans", 10)).toBeLessThan(small);
    expect(textWidthMm("ALEX", "mono", 10)).toBeGreaterThan(0);
  });
});

describe("text kit: geometry", () => {
  it("extrudes to the requested depth and centres the lettering", () => {
    const mesh = buildTextMesh({ text: "ALEX", fontId: "sans", sizeMm: 20, depthMm: 2.5 });
    const depth = mesh.boundingBox.max[2] - mesh.boundingBox.min[2];
    expect(depth).toBeCloseTo(2.5, 6);
    expect(mesh.boundingBox.min[2]).toBeCloseTo(0, 6);
    expect(mesh.boundingBox.min[0] + mesh.boundingBox.max[0]).toBeCloseTo(0, 6);
    expect(mesh.boundingBox.min[1] + mesh.boundingBox.max[1]).toBeCloseTo(0, 6);
    expect(mesh.volumeMm3).toBeGreaterThan(0);
  });

  it("keeps every glyph a closed body, including counters", () => {
    for (const text of ["A", "O", "B", "8", "ALEX", "NO 8"]) {
      const mesh = buildTextMesh({ text, fontId: "sans", sizeMm: 20, depthMm: 2 });
      const report = inspectMesh(mesh, { allowMultipleComponents: true });
      expect({ text, ok: report.ok }).toEqual({ text, ok: true });
      expect(report.watertight).toBe(true);
      expect(report.manifold).toBe(true);
      expect(report.components).toBe([...text].filter((char) => char !== " ").length);
    }
    const counter = inspectMesh(
      buildTextMesh({ text: "A", fontId: "sans", sizeMm: 20, depthMm: 2 }),
      { allowMultipleComponents: true },
    );
    expect(counter.genus).toBe(1);
  });

  it("mirrors a stamp plate without changing its volume", () => {
    const plain = buildTextMesh({ text: "PAID", fontId: "sans-bold", sizeMm: 18, depthMm: 2 });
    const mirrored = buildTextMesh({
      text: "PAID",
      fontId: "sans-bold",
      sizeMm: 18,
      depthMm: 2,
      mirror: true,
    });
    expect(mirrored.volumeMm3).toBeCloseTo(plain.volumeMm3, 3);
    expect(mirrored.boundingBox.min[0]).toBeCloseTo(-plain.boundingBox.max[0], 6);
    expect(mirrored.boundingBox.max[0]).toBeCloseTo(-plain.boundingBox.min[0], 6);
  });
});

describe("lettered plate", () => {
  it("ships one designer in the text family", () => {
    expect(textProducts).toHaveLength(1);
    expect(TEXT_DESIGNS).toHaveLength(1);
    const design = textProducts[0];
    expect(design.id).toBe("lettered-plate");
    expect(design.family).toBe("text");
    expect(design.multiBody).toBe(true);
    expect(design.contract.capability).toBe("shape");
  });

  it("offers four fonts, four shapes and three fixing layouts", () => {
    const design = textProducts[0];
    const font = design.fields.find((field) => field.key === "font");
    expect(font?.kind).toBe("select");
    expect(font?.options?.map((option) => option.value)).toEqual(FONT_IDS);

    const shape = design.fields.find((field) => field.key === "shape");
    expect(shape?.options?.map((option) => option.value)).toEqual([
      "rect",
      "rounded",
      "round",
      "square",
    ]);

    const holes = design.fields.find((field) => field.key === "holes");
    expect(holes?.options?.map((option) => option.value)).toEqual(["none", "top", "corners"]);

    const lettering = design.fields.find((field) => field.key === "lettering");
    expect(lettering?.options?.map((option) => option.value)).toEqual(["normal", "mirrored"]);
  });

  it("shows only the dimensions the chosen outline needs", () => {
    const design = textProducts[0];
    const visible = (key: string, shape: string, holes = "none") => {
      const field = design.fields.find((item) => item.key === key);
      return field?.visible?.({ ...design.defaults, shape, holes }) ?? true;
    };
    expect(visible("width", "rect")).toBe(true);
    expect(visible("width", "round")).toBe(false);
    expect(visible("diameter", "round")).toBe(true);
    expect(visible("diameter", "rect")).toBe(false);
    expect(visible("size", "square")).toBe(true);
    expect(visible("size", "rounded")).toBe(false);
    expect(visible("hole", "rect", "top")).toBe(true);
    expect(visible("hole", "rect", "none")).toBe(false);
  });

  it("opens every shape valid with the default text", () => {
    const design = textProducts[0];
    for (const shape of ["rect", "rounded", "round", "square"]) {
      const raw = mm(design, { shape });
      const result = design.derive(raw);
      expect({ shape, errors: result.errors }).toEqual({ shape, errors: [] });
      const report = inspectMesh(design.build(raw), { allowMultipleComponents: true });
      expect({ shape, ok: report.ok }).toEqual({ shape, ok: true });
    }
  });

  it("builds every shape and fixing layout", () => {
    const design = textProducts[0];
    const cases: [string, string][] = [
      ["rect", "corners"],
      ["rect", "top"],
      ["rect", "none"],
      ["rounded", "corners"],
      ["rounded", "top"],
      ["round", "top"],
      ["round", "none"],
      ["square", "top"],
      ["square", "none"],
    ];
    for (const [shape, holes] of cases) {
      const raw = mm(design, { shape, holes, letter: "12" });
      const result = design.derive(raw);
      expect({ shape, holes, errors: result.errors }).toEqual({ shape, holes, errors: [] });
      const mesh = design.build(raw);
      const report = inspectMesh(mesh, { allowMultipleComponents: true });
      expect({ shape, holes, ok: report.ok }).toEqual({ shape, holes, ok: true });
      expect({ shape, holes, components: report.components }).toEqual({
        shape,
        holes,
        components: 5,
      });
      expect(report.eulerCharacteristic).toBeLessThanOrEqual(2 * report.components);
    }
  });

  it("rejects corner holes on a round or square plate", () => {
    const design = textProducts[0];
    for (const shape of ["round", "square"]) {
      const result = design.derive(mm(design, { shape, holes: "corners" }));
      expect({ shape, field: result.errors[0]?.field }).toEqual({ shape, field: "holes" });
    }
  });

  it("defaults to readable lettering and mirrors only when asked", () => {
    const design = textProducts[0];
    const normal = design.derive(mm(design));
    expect(normal.readout.some((row) => row.value === "Mirrored for stamping")).toBe(false);
    expect(normal.preview.label).not.toContain("mirrored");

    const mirrored = design.derive(mm(design, { lettering: "mirrored" }));
    expect(mirrored.errors).toEqual([]);
    expect(mirrored.readout.some((row) => row.value === "Mirrored for stamping")).toBe(true);
    expect(mirrored.preview.label).toContain("mirrored");

    const built = capXs(design.build(mm(design, { lettering: "mirrored" })));
    const reference = capXs(
      buildTextMesh({ text: "ALEX", fontId: "sans", sizeMm: 20, depthMm: 2, mirror: true }),
    );
    const plain = capXs(
      buildTextMesh({ text: "ALEX", fontId: "sans", sizeMm: 20, depthMm: 2 }),
    );
    expect(built).toEqual(reference);
    expect(built).not.toEqual(plain);
  });

  it("builds a plate plus one closed body per visible character by default", () => {
    const design = textProducts[0];
    const raw = mm(design);
    const mesh = design.build(raw);
    const report = inspectMesh(mesh, { allowMultipleComponents: true });
    const glyphs = [...(raw.values.text ?? "")].filter((char) => char !== " ").length;
    expect(report.ok).toBe(true);
    expect(report.components).toBe(glyphs + 1);
    expect(report.eulerCharacteristic).toBeLessThanOrEqual(2 * report.components);
  });

  it("uppercases what is typed and keeps the file name a clean slug", () => {
    const design = textProducts[0];
    const result = design.derive(mm(design, { text: "alex" }));
    expect(result.errors).toEqual([]);
    expect(result.readout.find((row) => row.label === "Text")?.value).toBe("ALEX");
    expect(design.fileName(mm(design, { text: "for you" }))).toBe("lettered-plate-for-you.stl");
    expect(design.fileName(mm(design, { text: "o'neil & co." }))).toMatch(
      /^lettered-plate-[a-z0-9-]+\.stl$/,
    );
  });

  it("rejects text that is missing, too long, unsupported or too wide", () => {
    const design = textProducts[0];
    const cases: [string, string][] = [
      ["", "text"],
      ["   ", "text"],
      ["THIS IS FAR TOO LONG", "text"],
      ["ΩMEGA", "text"],
      ["ALEXANDRA", "letter"],
      ["WWWWW", "letter"],
    ];
    for (const [text, field] of cases) {
      const result = design.derive(mm(design, { text, width: "60", letter: "20" }));
      expect({ text, hasError: result.errors.length > 0 }).toEqual({ text, hasError: true });
      expect({ text, field: result.errors[0]?.field }).toEqual({ text, field });
    }
  });

  it("every default is inch-safe and preset-safe", () => {
    const design = textProducts[0];
    const inches: Record<string, string> = {};
    for (const [key, value] of Object.entries(design.defaults)) {
      inches[key] = design.lengthFields.includes(key)
        ? (Number(value) / 25.4).toFixed(6)
        : value;
    }
    const imperial = design.derive({ values: inches, units: "in" });
    expect(imperial.errors).toEqual([]);
    for (const row of imperial.readout) expect(row.value).not.toMatch(/\bmm\b/);

    const presets = buildDesignPresets(design);
    expect(presets[0]?.id).toBe("standard");
    for (const preset of presets) {
      const result = design.derive({ values: preset.values, units: "mm" });
      expect({ preset: preset.id, errors: result.errors }).toEqual({
        preset: preset.id,
        errors: [],
      });
    }
  });

  it("describes the multi-body export honestly in the specification", () => {
    const design = designById("lettered-plate");
    if (!design) throw new Error("missing lettered-plate");
    const spec = buildSpecification(design, mm(design));
    expect(spec).toContain("Multi-body part");
    expect(spec).toContain("not applicable (5 closed bodies)");
    expect(spec).not.toContain("One closed shell (no loose islands): pass");
  });
});
