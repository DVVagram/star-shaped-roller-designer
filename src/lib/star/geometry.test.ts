import { describe, expect, it } from "vitest";

import { DEFAULT_BUILDER_STATE, buildSpec } from "./builder";
import {
  SPIKE_SHAPE_ORDER,
  autoSpikeCount,
  boreOutline,
  evaluateSpikeCount,
  polygonArea,
  validateStar,
  type SpikeShape,
  type StarSpec,
} from "./geometry";
import { buildStarMesh, inspectStarSolid } from "./mesh";
import { createStarProfile } from "./profile";
import { buildBinaryStl, stlByteLength } from "./stl";

const BASE = buildSpec(DEFAULT_BUILDER_STATE).spec as StarSpec;

function fit(overrides: Partial<Parameters<typeof autoSpikeCount>[0]> = {}) {
  return {
    outerDiameterMm: 80,
    spikeDepthMm: 12,
    tipWidthMm: 2.5,
    valleyWidthMm: 3,
    spikeShape: "rounded" as SpikeShape,
    ...overrides,
  };
}

describe("auto spike fit", () => {
  it("returns the largest count that still builds", () => {
    const input = fit();
    const { count } = autoSpikeCount(input);
    expect(count).toBeGreaterThanOrEqual(6);
    expect(evaluateSpikeCount(input, count).ok).toBe(true);
    expect(evaluateSpikeCount(input, count + 1).ok).toBe(false);
  });

  it("packs fewer points as the spikes get deeper", () => {
    const shallow = autoSpikeCount(fit({ spikeDepthMm: 4 })).count;
    const deep = autoSpikeCount(fit({ spikeDepthMm: 20 })).count;
    expect(shallow).toBeGreaterThan(deep);
  });

  it("packs more points as the wheel grows", () => {
    const small = autoSpikeCount(fit({ outerDiameterMm: 40 })).count;
    const large = autoSpikeCount(fit({ outerDiameterMm: 160 })).count;
    expect(large).toBeGreaterThan(small);
  });

  it("is always feasible for the default design", () => {
    expect(validateStar(BASE, { unit: "mm" }).ok).toBe(true);
  });
});

describe("star profile", () => {
  it("stays inside the tip and valley circles with increasing angles", () => {
    for (const shape of SPIKE_SHAPE_ORDER) {
      const spec: StarSpec = { ...BASE, spikeShape: shape };
      const profile = createStarProfile(spec);
      const tip = spec.outerDiameterMm / 2;
      const valley = tip - spec.spikeDepthMm;

      // Angles are unwrapped, because the profile starts just before angle 0
      // and atan2 wraps to −π there.
      let previous = Math.atan2(profile.points[0].y, profile.points[0].x);
      let turned = 0;
      for (const point of profile.points) {
        const radius = Math.hypot(point.x, point.y);
        expect(radius).toBeGreaterThanOrEqual(valley - 1e-6);
        expect(radius).toBeLessThanOrEqual(tip + 1e-6);

        const angle = Math.atan2(point.y, point.x);
        let delta = angle - previous;
        while (delta > Math.PI) delta -= 2 * Math.PI;
        while (delta < -Math.PI) delta += 2 * Math.PI;
        expect(delta).toBeGreaterThan(-1e-9);
        turned += delta;
        previous = angle;
      }

      // The closing edge from the last vertex back to the first completes the
      // turn, so the whole outline sweeps exactly 2π.
      const first = Math.atan2(profile.points[0].y, profile.points[0].x);
      let closing = first - previous;
      if (closing <= 0) closing += 2 * Math.PI;
      expect(closing).toBeGreaterThan(0);
      turned += closing;
      expect(turned).toBeCloseTo(2 * Math.PI, 6);

      expect(profile.baseAreaMm2).toBeGreaterThan(Math.PI * valley * valley);
      expect(profile.baseAreaMm2).toBeLessThan(Math.PI * tip * tip);
    }
  });

  it("narrows the spikes towards the tapered face without moving the valley", () => {
    const spec: StarSpec = { ...BASE, taperMm: 4 };
    const profile = createStarProfile(spec);
    expect(profile.topAreaMm2).toBeLessThan(profile.baseAreaMm2);

    const valley = spec.outerDiameterMm / 2 - spec.spikeDepthMm;
    const topMax = Math.max(...profile.topPoints.map((p) => Math.hypot(p.x, p.y)));
    expect(topMax).toBeCloseTo(spec.outerDiameterMm / 2 - 4, 6);
    expect(topMax).toBeGreaterThan(valley);
  });
});

describe("solid", () => {
  const cases: Array<[string, StarSpec]> = [
    ["default", BASE],
    ["sharp spikes", { ...BASE, spikeShape: "sharp", tipWidthMm: 0 }],
    ["swept claws", { ...BASE, spikeShape: "claw" }],
    ["hex hole", { ...BASE, boreShape: "hex" }],
    ["double-flat hole", { ...BASE, boreShape: "doubleFlat" }],
    ["tapered tips", { ...BASE, taperMm: 5 }],
    ["hub boss", { ...BASE, hubEnabled: true, hubDiameterMm: 30, hubHeightMm: 6 }],
    ["few spikes", { ...BASE, spikeCount: 3, spikeDepthMm: 18 }],
    ["many spikes", { ...BASE, spikeCount: 48, spikeDepthMm: 6, tipWidthMm: 1.4 }],
  ];

  for (const [name, spec] of cases) {
    it(`builds one watertight shell (${name})`, () => {
      const report = inspectStarSolid(spec);
      expect(report.watertight).toBe(true);
      expect(report.manifold).toBe(true);
      expect(report.connected).toBe(true);
      expect(report.validFaces).toBe(true);
      expect(report.eulerCharacteristic).toBe(0);
      expect(report.ok).toBe(true);

      // Positions are stored as float32 for three.js and STL, so the measured
      // volume matches the analytic reference to float precision rather than
      // exactly. A tapered wheel is also checked against hard area bounds.
      const prisms = createStarProfile(spec);
      const boreArea = polygonArea(boreOutline(spec));
      const half = spec.thicknessMm / 2;
      const hubLayer = spec.hubEnabled
        ? (Math.PI * (spec.hubDiameterMm / 2) ** 2 - boreArea) * spec.hubHeightMm
        : 0;
      const bottom = prisms.baseAreaMm2 - boreArea;
      const top = prisms.topAreaMm2 - boreArea;
      const lower = Math.min(bottom, top) * spec.thicknessMm + hubLayer;
      const upper = Math.max(bottom, top) * spec.thicknessMm + hubLayer;

      expect(report.volumeMm3).toBeGreaterThan(lower * 0.999);
      expect(report.volumeMm3).toBeLessThan(upper * 1.001);
      expect(half).toBeGreaterThan(0);

      if (spec.taperMm === 0) {
        const relative =
          Math.abs(report.volumeMm3 - report.referenceVolumeMm3) /
          report.referenceVolumeMm3;
        expect(relative).toBeLessThan(2e-4);
      }
    });
  }

  it("removes exactly the hole volume when the bore grows", () => {
    const small = inspectStarSolid({ ...BASE, boreMm: 6 });
    const large = inspectStarSolid({ ...BASE, boreMm: 12 });
    const expected = Math.PI * (6 ** 2 - 3 ** 2) * BASE.thicknessMm;
    const removed = small.volumeMm3 - large.volumeMm3;
    expect(Math.abs(removed - expected) / expected).toBeLessThan(1e-3);
  });

  it("scales with thickness", () => {
    const thin = inspectStarSolid({ ...BASE, thicknessMm: 5 });
    const thick = inspectStarSolid({ ...BASE, thicknessMm: 10 });
    expect(Math.abs(thick.volumeMm3 - thin.volumeMm3 * 2) / thick.volumeMm3).toBeLessThan(
      1e-4,
    );
  });
});

describe("STL export", () => {
  it("writes one 50-byte facet per triangle", () => {
    const mesh = buildStarMesh(BASE);
    const buffer = buildBinaryStl(mesh);
    expect(buffer.byteLength).toBe(84 + mesh.triangleCount * 50);
    expect(stlByteLength(mesh)).toBe(buffer.byteLength);

    const view = new DataView(buffer);
    expect(view.getUint32(80, true)).toBe(mesh.triangleCount);
  });

  it("keeps the mesh in millimetres around the origin", () => {
    const mesh = buildStarMesh(BASE);
    const half = BASE.outerDiameterMm / 2;
    // A flat tip land means no vertex lands exactly on the X axis, so the
    // bounding box is the sampled tip circle rather than an exact diameter.
    expect(mesh.boundingBox.max[0]).toBeLessThanOrEqual(half + 1e-6);
    expect(mesh.boundingBox.max[0]).toBeGreaterThan(half * 0.9);
    expect(mesh.boundingBox.min[0]).toBeGreaterThanOrEqual(-half - 1e-6);
    expect(mesh.boundingBox.max[2]).toBeCloseTo(BASE.thicknessMm / 2, 6);
  });
});
