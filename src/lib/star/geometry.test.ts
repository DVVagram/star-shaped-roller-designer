import { describe, expect, it } from "vitest";

import { DEFAULT_BUILDER_STATE, buildSpec, setUnits } from "./builder";
import {
  SPIKE_SHAPE_ORDER,
  autoSpikeCount,
  boreOutline,
  deriveStar,
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

describe("units", () => {
  it("keeps the same design and spike count when switched to inches", () => {
    const state = DEFAULT_BUILDER_STATE;
    const inches = setUnits(state, "in");
    expect(inches.values.spikeCount).toBe(state.values.spikeCount);
    expect(buildSpec(inches).complete).toBe(true);

    const mmSpec = buildSpec(state).spec as StarSpec;
    const inchSpec = buildSpec(inches).spec as StarSpec;
    for (const field of [
      "outerDiameterMm",
      "thicknessMm",
      "spikeDepthMm",
      "tipWidthMm",
      "valleyWidthMm",
      "taperMm",
      "boreMm",
    ] as const) {
      expect(inchSpec[field]).toBeCloseTo(mmSpec[field], 1);
    }
    expect(inchSpec.spikeCount).toBe(mmSpec.spikeCount);
    expect(inches.values.outerDiameter).toBe("3.1496");
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

/** Twelve 6 mm wide flaps on the 40 mm / 12 mm deep default core. */
const FLAPS: StarSpec = { ...BASE, spikeShape: "paddle", spikeCount: 12, tipWidthMm: 6 };

describe("rectangular flaps", () => {
  it("turns every spike into a rectangle on a round core", () => {
    const profile = createStarProfile(FLAPS);
    const tipRadius = FLAPS.outerDiameterMm / 2;
    const valleyRadius = tipRadius - FLAPS.spikeDepthMm;

    // Every vertex is either a tip-circle corner or lies on the valley circle:
    // there are no vertices on the straight sides at all.
    for (const point of profile.points) {
      const radius = Math.hypot(point.x, point.y);
      const onTip = Math.abs(radius - tipRadius) < 1e-9;
      const onValley = Math.abs(radius - valleyRadius) < 1e-9;
      expect(onTip || onValley).toBe(true);
    }

    const corners = profile.points.filter(
      (point) => Math.abs(Math.hypot(point.x, point.y) - tipRadius) < 1e-9,
    );
    expect(corners.length).toBe(2 * FLAPS.spikeCount);

    for (let i = 0; i < corners.length; i += 2) {
      const a = corners[i];
      const b = corners[i + 1];
      const chord = Math.hypot(a.x - b.x, a.y - b.y);
      expect(chord).toBeCloseTo(FLAPS.tipWidthMm, 9);

      // The flap is square to its radius, so its flat tip chord has no radial
      // component: the chord is perpendicular to the midpoint direction.
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      expect(Math.abs((b.x - a.x) * mid.x + (b.y - a.y) * mid.y)).toBeLessThan(1e-9);
      expect(Math.hypot(mid.x, mid.y)).toBeCloseTo(
        Math.sqrt(tipRadius * tipRadius - (FLAPS.tipWidthMm / 2) ** 2),
        9,
      );
    }
  });

  it("counts the flap as the tip land and its base arc as the spike base", () => {
    const derived = deriveStar(FLAPS);
    expect(derived.tipLandMm).toBeCloseTo(FLAPS.tipWidthMm, 9);
    const valleyRadius = derived.valleyRadiusMm;
    const expectedBase = 2 * Math.asin(FLAPS.tipWidthMm / 2 / valleyRadius) * valleyRadius;
    expect(derived.spikeBaseArcMm).toBeCloseTo(expectedBase, 9);
  });

  it("builds one watertight shell, tapered and bored too", () => {
    const variants: StarSpec[] = [
      FLAPS,
      { ...FLAPS, taperMm: 5 },
      { ...FLAPS, boreShape: "hex" },
      { ...FLAPS, spikeCount: 24, tipWidthMm: 3, spikeDepthMm: 8 },
      { ...FLAPS, spikeCount: 3, spikeDepthMm: 18 },
    ];
    for (const spec of variants) {
      const report = inspectStarSolid(spec);
      expect(validateStar(spec, { unit: "mm" }).ok).toBe(true);
      expect(report.watertight).toBe(true);
      expect(report.manifold).toBe(true);
      expect(report.connected).toBe(true);
      expect(report.eulerCharacteristic).toBe(0);
      expect(report.ok).toBe(true);
      expect(report.volumeMm3).toBeGreaterThan(0);
    }
  });

  it("shortens the flaps towards the tapered face without narrowing them", () => {
    const spec: StarSpec = { ...FLAPS, taperMm: 5 };
    const profile = createStarProfile(spec);
    const topTipRadius = spec.outerDiameterMm / 2 - 5;
    expect(profile.topAreaMm2).toBeLessThan(profile.baseAreaMm2);

    const topCorners = profile.topPoints.filter(
      (point) => Math.abs(Math.hypot(point.x, point.y) - topTipRadius) < 1e-9,
    );
    expect(topCorners.length).toBe(2 * spec.spikeCount);
    for (let i = 0; i < topCorners.length; i += 2) {
      const a = topCorners[i];
      const b = topCorners[i + 1];
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeCloseTo(spec.tipWidthMm, 9);
    }
  });

  it("rejects a flap that does not fit the core or the printer", () => {
    const wide = validateStar({ ...FLAPS, tipWidthMm: 60 }, { unit: "mm" });
    expect(wide.ok).toBe(false);
    expect(wide.errors.some((issue) => issue.field === "tipWidth")).toBe(true);

    const thin = validateStar({ ...FLAPS, tipWidthMm: 0.6 }, { unit: "mm" });
    expect(thin.ok).toBe(false);
    expect(thin.errors.some((issue) => issue.field === "tipWidth")).toBe(true);

    const empty = validateStar({ ...FLAPS, tipWidthMm: 0 }, { unit: "mm" });
    expect(empty.ok).toBe(false);
    expect(empty.errors.some((issue) => issue.field === "tipWidth")).toBe(true);
  });
});

describe("solid", () => {
  const cases: Array<[string, StarSpec]> = [
    ["default", BASE],
    ["rectangular flaps", FLAPS],
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

  it("puts the tapered outline on the top face of the solid, not the base one", () => {
    const spec: StarSpec = { ...BASE, taperMm: 5 };
    const boreArea = polygonArea(boreOutline(spec));
    // The wall interpolates every vertex linearly, so the outline at height
    // fraction t is the top outline of a profile tapered by 5·t, and the area
    // is quadratic in t: Simpson over three samples is exact.
    const areaAt = (fraction: number) =>
      createStarProfile({ ...spec, taperMm: spec.taperMm * fraction }).topAreaMm2;
    const meanArea =
      (areaAt(0) + 4 * areaAt(0.5) + areaAt(1)) / 6 - boreArea;
    const expected = meanArea * spec.thicknessMm;
    const report = inspectStarSolid(spec);
    expect(Math.abs(report.volumeMm3 - expected) / expected).toBeLessThan(2e-4);

    const mesh = buildStarMesh(spec);
    const half = spec.thicknessMm / 2;
    let topMax = 0;
    let bottomMax = 0;
    for (let i = 0; i < mesh.positions.length; i += 3) {
      const radius = Math.hypot(mesh.positions[i], mesh.positions[i + 1]);
      const z = mesh.positions[i + 2];
      if (Math.abs(z - half) < 1e-4) topMax = Math.max(topMax, radius);
      if (Math.abs(z + half) < 1e-4) bottomMax = Math.max(bottomMax, radius);
    }
    expect(bottomMax).toBeCloseTo(spec.outerDiameterMm / 2, 3);
    expect(topMax).toBeCloseTo(spec.outerDiameterMm / 2 - 5, 3);
  });

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

    for (const byte of new Uint8Array(buffer, 0, 80)) {
      expect(byte === 0 || (byte >= 32 && byte < 127)).toBe(true);
    }
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
