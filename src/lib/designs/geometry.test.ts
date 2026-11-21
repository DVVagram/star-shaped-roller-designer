/**
 * Checks the numbers the app reports against the numbers the geometry implies.
 *
 * These are deliberately not snapshot tests: each one recomputes a closed-form
 * value (a pitch diameter, a torus volume, a spring rate) and compares it with
 * what the designer derives or with the triangle mesh it builds.
 */

import { describe, expect, it } from "vitest";

import { buildRevolution } from "@/lib/kit/revolve";
import { inspectMesh, type Mesh } from "@/lib/kit/solid";

import { designById } from "./index";
import type { AnyDesign, DesignReadout } from "./types";

function design(id: string): AnyDesign {
  const found = designById(id);
  if (!found) throw new Error(`No designer ${id}`);
  return found;
}

function defaultsFor(id: string): { values: Record<string, string>; units: "mm" } {
  return { values: { ...design(id).defaults }, units: "mm" };
}

/** Reads a numeric readout by label, in millimetres where relevant. */
function readout(id: string, label: string, overrides: Record<string, string> = {}): number {
  const base = defaultsFor(id);
  const result = design(id).derive({
    values: { ...base.values, ...overrides },
    units: "mm",
  });
  const item: DesignReadout | undefined = result.readout.find((entry) =>
    entry.label.toLowerCase().includes(label.toLowerCase()),
  );
  if (!item) {
    throw new Error(
      `No readout "${label}" on ${id}; have ${result.readout.map((r) => r.label).join(", ")}`,
    );
  }
  const value = Number(item.value.replace(/[^\d.eE+-]/g, ""));
  if (!Number.isFinite(value)) throw new Error(`Readout "${label}" is not numeric: ${item.value}`);
  return value;
}

function meshOf(id: string, overrides: Record<string, string> = {}): Mesh {
  const base = defaultsFor(id);
  return design(id).build({ values: { ...base.values, ...overrides }, units: "mm" });
}

function volumeOf(id: string, overrides: Record<string, string> = {}): number {
  const report = inspectMesh(meshOf(id, overrides));
  expect(report.ok).toBe(true);
  return report.volumeMm3;
}

describe("revolution maths", () => {
  it("a rectangular profile revolved into a tube matches pi(R^2 - r^2)h", () => {
    const outer = 24;
    const inner = 16;
    const height = 12;
    const mesh = buildRevolution({
      profile: [
        { x: inner, y: 0 },
        { x: outer, y: 0 },
        { x: outer, y: height },
        { x: inner, y: height },
      ],
      segments: 256,
    });
    const expected = Math.PI * (outer ** 2 - inner ** 2) * height;
    expect(inspectMesh(mesh).ok).toBe(true);
    expect(Math.abs(mesh.volumeMm3 - expected) / expected).toBeLessThan(0.002);
  });

  it("a torus measures 2 pi^2 R r^2", () => {
    // Defaults: 80 mm overall, 20 mm tube, so R = 30 and r = 10.
    const expected = 2 * Math.PI ** 2 * 30 * 10 ** 2;
    expect(Math.abs(volumeOf("torus") - expected) / expected).toBeLessThan(0.005);
  });

  it("a hemisphere shell measures 2/3 pi (R^3 - r^3)", () => {
    const R = 50;
    const r = 47;
    const expected = (2 / 3) * Math.PI * (R ** 3 - r ** 3);
    expect(Math.abs(volumeOf("hemisphere-shell") - expected) / expected).toBeLessThan(0.01);
  });

  it("a flywheel matches its rim, web and bore", () => {
    const outer = 60;
    const inner = 46;
    const rimWidth = 20;
    const web = 5;
    const hub = 15;
    const bore = 6;
    const expected =
      Math.PI * (outer ** 2 - inner ** 2) * rimWidth +
      Math.PI * (inner ** 2 - hub ** 2) * web +
      Math.PI * (hub ** 2 - bore ** 2) * 18;
    expect(Math.abs(volumeOf("flywheel") - expected) / expected).toBeLessThan(0.01);
  });
});

describe("gear and drive numbers", () => {
  it("spur gear pitch, base and tip diameters follow the module", () => {
    // Defaults: module 2, 18 teeth, 20 deg pressure angle, addendum 2.
    expect(readout("spur-gear", "Pitch Ø")).toBeCloseTo(36, 1);
    expect(readout("spur-gear", "Base Ø")).toBeCloseTo(36 * Math.cos((20 * Math.PI) / 180), 1);
    expect(readout("spur-gear", "Tip Ø")).toBeCloseTo(40, 1);
    expect(readout("spur-gear", "Circular pitch")).toBeCloseTo(Math.PI * 2, 2);
  });

  it("internal gear cavity tip is the pitch radius minus the inward addendum", () => {
    // Defaults: module 1.5, 40 teeth, addendum 1.5 -> (30 - 1.5) * 2.
    expect(readout("internal-gear", "Cavity tip Ø")).toBeCloseTo(57, 1);
  });

  it("helical gear pitch diameter is still module times teeth", () => {
    expect(readout("helical-gear", "Pitch Ø")).toBeCloseTo(36, 1);
  });

  it("timing pulley pitch circumference is pitch times teeth", () => {
    const pd = readout("timing-pulley", "Pitch Ø");
    // Defaults: 5 mm pitch, 20 teeth -> PD = 100 / pi.
    expect(pd).toBeCloseTo(100 / Math.PI, 1);
  });

  it("V-belt groove top width follows the included angle", () => {
    const top = readout("v-belt-pulley", "Groove top");
    // Defaults: 12 mm deep, 38 deg included angle.
    expect(top).toBeCloseTo(2 * 12 * Math.tan((38 * Math.PI) / 360), 1);
  });

  it("round-belt pulley root sits one belt radius below the rim", () => {
    // Defaults: 80 outside, 8 belt -> (40 - 4) * 2.
    expect(readout("round-belt-pulley", "Groove root Ø")).toBeCloseTo(72, 1);
  });

  it("stepped pulley speed range is the diameter ratio", () => {
    // Defaults: 3 steps, 40/55/70.
    expect(readout("stepped-pulley", "Speed range")).toBeCloseTo(70 / 40, 1);
  });
});

describe("fluid and motion numbers", () => {
  it("de Laval expansion ratio is the area ratio", () => {
    // Defaults: 20 throat, 60 exit -> 9.
    expect(readout("de-laval-nozzle", "Expansion")).toBeCloseTo(9, 1);
    expect(readout("de-laval-nozzle", "Throat area")).toBeCloseTo(
      (Math.PI / 4) * 20 ** 2 / 100,
      1,
    );
  });

  it("torus ring and hole diameters agree with the input", () => {
    expect(readout("torus", "Ring centre Ø")).toBeCloseTo(60, 1);
    expect(readout("torus", "Hole Ø")).toBeCloseTo(40, 1);
  });

  it("spring free length and rate match the helical-spring equations", () => {
    // Defaults: 30 outside, 3 wire, 8 coils, 6 pitch.
    expect(readout("compression-spring", "Free length")).toBeCloseTo(51, 1);
    const rate = (3500 * 3 ** 4) / (8 * 27 ** 3 * 8);
    expect(readout("compression-spring", "Rate")).toBeCloseTo(rate, 2);
    expect(readout("compression-spring", "Spring index")).toBeCloseTo(9, 1);
  });

  it("pipe elbow arc length is R times the bend angle", () => {
    // Defaults: 50 mm bend radius, 90 deg.
    expect(readout("pipe-elbow", "Centre-line arc")).toBeCloseTo(50 * Math.PI / 2, 1);
  });

  it("pipe reducer reports the bores from the wall", () => {
    // Defaults: 60 large, 30 small, 3 wall.
    expect(readout("pipe-reducer", "Large bore")).toBeCloseTo(54, 1);
    expect(readout("pipe-reducer", "Small bore")).toBeCloseTo(24, 1);
  });

  it("nose cone fineness is length over base", () => {
    // Defaults: 60 base, 100 ogive -> 1.667.
    expect(readout("nose-cone", "Fineness")).toBeCloseTo(100 / 60, 2);
  });
});
