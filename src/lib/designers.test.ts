import { describe, expect, it } from "vitest";

import { FAN_DEFAULT_SPEC, buildFanSpec, fanDefaultValues } from "./fan";
import { PROPELLER_DEFAULT_SPEC, buildPropellerSpec, propellerDefaultValues } from "./propeller";
import {
  buildBinaryStl,
  buildExtrusion,
  buildSmoothGeometry,
  cleanRings,
  inspectMesh,
  stlByteLength,
  type Mesh,
} from "./kit/solid";
import {
  CURVE_TOLERANCE_MM,
  boreOutline,
  circleOutline,
  polygonArea,
  sampleCurve,
  signedArea,
  type Point2D,
} from "./kit/units";
import {
  CHAIN_PRESETS,
  SPROCKET_DEFAULT_SPEC,
  TOOTH_PROFILE_ORDER,
  buildSprocketMesh,
  buildSprocketSpec,
  deriveSprocket,
  sprocketDefaultValues,
  sprocketOutline,
  validateSprocket,
  type SprocketSpec,
} from "./sprocket";
import {
  bladeWidthAt,
  buildRotorMesh,
  deriveRotor,
  effectiveTipEdgeRoundingMm,
  effectiveTipRoundingMm,
  passageAt,
  rotorOutline,
  rotorRingCount,
  rotorRingFractions,
  tipEdgeInsetMm,
  validateRotor,
  type RotorSpec,
} from "./rotor";

function closed(points: Point2D[]): boolean {
  return signedArea(points) > 0 && points.length > 8;
}

const radiusOf = (point: Point2D) => Math.hypot(point.x, point.y);

function maxRadius(points: Point2D[]): number {
  return points.reduce((max, point) => Math.max(max, radiusOf(point)), 0);
}

function minRadius(points: Point2D[]): number {
  return points.reduce((min, point) => Math.min(min, radiusOf(point)), Infinity);
}

/** The section that still reaches the entered tip circle. */
function widestRing(rings: Point2D[][]): Point2D[] {
  return rings.reduce((best, ring) => (maxRadius(ring) > maxRadius(best) ? ring : best));
}

/** Shortest edge of a closed outline, including the closing edge. */
function shortestEdge(points: Point2D[]): number {
  let min = Infinity;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    min = Math.min(min, Math.hypot(a.x - b.x, a.y - b.y));
  }
  return min;
}

function zExtent(mesh: Mesh): number {
  return mesh.boundingBox.max[2] - mesh.boundingBox.min[2];
}

function minTriangleArea(mesh: Mesh): number {
  const { positions, indices } = mesh;
  let min = Infinity;
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3;
    const b = indices[i + 1] * 3;
    const c = indices[i + 2] * 3;
    const abx = positions[b] - positions[a];
    const aby = positions[b + 1] - positions[a + 1];
    const abz = positions[b + 2] - positions[a + 2];
    const acx = positions[c] - positions[a];
    const acy = positions[c + 1] - positions[a + 1];
    const acz = positions[c + 2] - positions[a + 2];
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;
    min = Math.min(min, Math.hypot(nx, ny, nz) / 2);
  }
  return min;
}

function pointToSegment(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq < 1e-18) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq),
  );
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

describe("sprocket geometry", () => {
  it("puts the pitch circle at p / sin(pi / N)", () => {
    const derived = deriveSprocket(SPROCKET_DEFAULT_SPEC);
    const expected = (12.7 / 2) / Math.sin(Math.PI / 18);
    expect(derived.pitchRadiusMm).toBeCloseTo(expected, 6);
    expect(derived.outsideDiameterMm).toBeGreaterThan(derived.pitchDiameterMm);
    expect(derived.rootDiameterMm).toBeLessThan(derived.pitchDiameterMm);
  });

  it("winds one counter-clockwise outline with a seat per tooth", () => {
    const outline = sprocketOutline(SPROCKET_DEFAULT_SPEC);
    expect(closed(outline)).toBe(true);
    expect(outline.length).toBeGreaterThan(SPROCKET_DEFAULT_SPEC.teeth * 10);
    const first = outline[0];
    const last = outline[outline.length - 1];
    expect(Math.hypot(first.x - last.x, first.y - last.y)).toBeGreaterThan(0.01);
  });

  it("builds a single watertight shell for the defaults", () => {
    const mesh = buildSprocketMesh(SPROCKET_DEFAULT_SPEC);
    const report = inspectMesh(mesh);
    expect(report.ok).toBe(true);
    expect(report.components).toBe(1);
    expect(report.eulerCharacteristic).toBe(0);
    expect(report.volumeMm3).toBeGreaterThan(1000);
  });

  it("keeps the hub part of the same shell", () => {
    const spec: SprocketSpec = {
      ...SPROCKET_DEFAULT_SPEC,
      hubEnabled: true,
      hubDiameterMm: 30,
      hubHeightMm: 6,
    };
    expect(inspectMesh(buildSprocketMesh(spec)).ok).toBe(true);
  });

  it("builds a hex bore without opening the shell", () => {
    const spec: SprocketSpec = { ...SPROCKET_DEFAULT_SPEC, boreShape: "hex" };
    expect(inspectMesh(buildSprocketMesh(spec)).ok).toBe(true);
  });

  it("rejects a tooth count the seats cannot fit", () => {
    const spec: SprocketSpec = {
      ...SPROCKET_DEFAULT_SPEC,
      pitchMm: 3,
      rollerMm: 2.6,
      teeth: 6,
      toothHeightMm: 1.2,
    };
    const validation = validateSprocket(spec);
    expect(validation.ok).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it("rejects a bore that eats the rim", () => {
    const validation = validateSprocket({ ...SPROCKET_DEFAULT_SPEC, boreMm: 70 });
    expect(validation.ok).toBe(false);
    expect(validation.errors.some((issue) => issue.field === "bore")).toBe(true);
  });

  it("converts form strings into a millimetre spec", () => {
    const { spec, complete } = buildSprocketSpec(
      sprocketDefaultValues(),
      "in",
      { toothProfile: "standard", boreShape: "round", hubEnabled: false },
    );
    expect(complete).toBe(true);
    expect(spec.pitchMm).toBeCloseTo(12.7 * 25.4, 6);
  });
});

describe("rotor geometry", () => {
  it("pairs every bottom vertex with a top vertex", () => {
    const { bottom, top } = rotorOutline(FAN_DEFAULT_SPEC);
    expect(bottom.length).toBe(top.length);
    expect(closed(bottom)).toBe(true);
  });

  it("builds the impeller as one watertight shell", () => {
    const report = inspectMesh(buildRotorMesh(FAN_DEFAULT_SPEC));
    expect(report.ok).toBe(true);
    expect(report.eulerCharacteristic).toBe(0);
    expect(report.volumeMm3).toBeGreaterThan(1000);
  });

  it("leaves a usable passage between blades", () => {
    const derived = deriveRotor(FAN_DEFAULT_SPEC);
    expect(derived.minPassageMm).toBeGreaterThan(1);
    expect(derived.feasible).toBe(true);
    expect(passageAt(FAN_DEFAULT_SPEC, 0, derived.pitchRad)).toBeCloseTo(
      derived.pitchRad * derived.hubRadiusMm - derived.rootWidthMm,
      6,
    );
  });

  it("blocks a lean that would reach the next blade", () => {
    const spec: RotorSpec = {
      ...FAN_DEFAULT_SPEC,
      bladeAngleDeg: 70,
      bladeHeightMm: 120,
    };
    const validation = validateRotor(spec);
    expect(validation.ok).toBe(false);
    expect(validation.errors.some((issue) => issue.field === "bladeAngle")).toBe(true);
  });

  it("rejects blades wider than their pitch", () => {
    const validation = validateRotor({ ...FAN_DEFAULT_SPEC, rootWidthMm: 60 });
    expect(validation.ok).toBe(false);
    expect(validation.geometry).toBeNull();
  });
});

describe("propeller", () => {
  it("derives the blade angle from the pitch at 70 % radius", () => {
    const derived = deriveRotor(PROPELLER_DEFAULT_SPEC);
    expect(derived.bladeAngleDeg).toBeGreaterThan(5);
    expect(derived.pitchMm).toBeCloseTo(150, 3);
  });

  it("builds the default prop as one watertight shell", () => {
    const report = inspectMesh(buildRotorMesh(PROPELLER_DEFAULT_SPEC));
    expect(report.ok).toBe(true);
    expect(report.triangleCount).toBeGreaterThan(100);
  });

  it("keeps the pitch when the diameter changes", () => {
    const values = { ...propellerDefaultValues(), tipDiameter: "120" };
    const { spec } = buildPropellerSpec(values, "mm", "round");
    const derived = deriveRotor(spec as RotorSpec);
    expect(derived.pitchMm).toBeCloseTo(150, 3);
    expect(derived.bladeAngleDeg).toBeGreaterThan(20);
  });

  it("turns a fan form into a spec", () => {
    const { spec, complete } = buildFanSpec(fanDefaultValues(), "mm", "round");
    expect(complete).toBe(true);
    expect(spec.bladeCount).toBe(6);
    expect(spec.bladeAngleDeg).toBe(34);
    expect(spec.tipRoundingMm).toBe(6);
  });

  it("converts the tip rounding with the rest of the lengths", () => {
    const values = { ...propellerDefaultValues(), tipRounding: "0.25" };
    const { spec, complete } = buildPropellerSpec(values, "in", "round");
    expect(complete).toBe(true);
    expect(spec.tipRoundingMm).toBeCloseTo(6.35, 6);
  });
});

/* -------------------------------------------------------- rounded blade tips */

describe("rounded blade tips", () => {
  /** Length of the run of outline points that sits exactly on the tip circle. */
  function rimLength(points: Point2D[], tipRadius: number): number {
    let longest = 0;
    for (let i = 0; i < points.length; i += 1) {
      if (Math.abs(radiusOf(points[i]) - tipRadius) > 1e-9) continue;
      let length = 0;
      let walked = 0;
      let j = i;
      while (
        walked < points.length &&
        Math.abs(radiusOf(points[(j + 1) % points.length]) - tipRadius) <= 1e-9
      ) {
        const a = points[j];
        const b = points[(j + 1) % points.length];
        length += Math.hypot(a.x - b.x, a.y - b.y);
        j += 1;
        walked += 1;
      }
      longest = Math.max(longest, length);
    }
    return longest;
  }

  it("keeps the entered tip diameter for every rounding radius", () => {
    for (const base of [FAN_DEFAULT_SPEC, PROPELLER_DEFAULT_SPEC]) {
      for (const tipRoundingMm of [0, 0.5, 2, 4, 6]) {
        for (const tipEdgeRoundingMm of [0, 3, 8]) {
          const spec: RotorSpec = { ...base, tipRoundingMm, tipEdgeRoundingMm };
          const { rings } = rotorOutline(spec);
          expect(closed(rings[0])).toBe(true);
          for (const ring of rings) {
            expect(maxRadius(ring)).toBeLessThanOrEqual(spec.tipDiameterMm / 2 + 1e-9);
            expect(minRadius(ring)).toBeCloseTo(spec.hubDiameterMm / 2, 6);
          }
          // An edge round only narrows the sections near the faces; the middle
          // still measures the entered tip circle.
          expect(maxRadius(widestRing(rings))).toBeCloseTo(spec.tipDiameterMm / 2, 6);
          expect(shortestEdge(rings[0])).toBeGreaterThan(1e-5);
        }
      }
    }
  });

  it("rounds the corners off instead of squaring the tip", () => {
    const square = polygonArea(
      rotorOutline({ ...FAN_DEFAULT_SPEC, tipRoundingMm: 0, tipEdgeRoundingMm: 0 }).bottom,
    );
    const rounded = polygonArea(
      rotorOutline({ ...FAN_DEFAULT_SPEC, tipRoundingMm: 6, tipEdgeRoundingMm: 0 }).bottom,
    );
    expect(rounded).toBeLessThan(square);
    expect(rounded).toBeGreaterThan(square * 0.85);
  });

  it("shortens the tip land by the two corner rounds", () => {
    const spec: RotorSpec = { ...FAN_DEFAULT_SPEC, tipRoundingMm: 6 };
    const tipRadius = spec.tipDiameterMm / 2;
    const rounding = effectiveTipRoundingMm(spec);
    const uTrim = 1 - rounding / (tipRadius - spec.hubDiameterMm / 2);
    const halfWidth = bladeWidthAt(spec, uTrim) / 2;
    expect(halfWidth).toBeGreaterThanOrEqual(rounding - 1e-9);

    const land = rimLength(widestRing(rotorOutline(spec).rings), tipRadius);
    // The polyline is a chord approximation of that arc, so allow 0.01 mm.
    expect(land).toBeCloseTo(2 * (halfWidth - rounding), 2);

    // With the rounding off, the land spans the whole tip chord again.
    const plain = rimLength(
      widestRing(rotorOutline({ ...spec, tipRoundingMm: 0 }).rings),
      tipRadius,
    );
    expect(plain).toBeCloseTo(spec.tipWidthMm, 1);
  });

  it("clamps an oversized request to a fully round nose", () => {
    const spec: RotorSpec = { ...FAN_DEFAULT_SPEC, tipRoundingMm: 40 };
    const tipRadius = spec.tipDiameterMm / 2;
    const rounding = effectiveTipRoundingMm(spec);
    expect(rounding).toBeGreaterThan(0);
    expect(rounding).toBeLessThan(40);
    // More than the chord allows changes nothing: it is already a round nose.
    expect(
      effectiveTipRoundingMm({ ...spec, tipRoundingMm: 120 }),
    ).toBeCloseTo(rounding, 9);
    // No straight land is left once the corner rounds meet.
    expect(rimLength(widestRing(rotorOutline(spec).rings), tipRadius)).toBeCloseTo(0, 6);
    expect(
      rimLength(
        widestRing(rotorOutline({ ...spec, tipRoundingMm: rounding * 0.9 }).rings),
        tipRadius,
      ),
    ).toBeGreaterThan(0.1);
    expect(
      validateRotor(spec).warnings.some((issue) => issue.field === "tipRounding"),
    ).toBe(true);
    expect(inspectMesh(buildRotorMesh(spec)).ok).toBe(true);
  });

  it("leaves no step or sharp corner in the rounded tip", () => {
    const spec: RotorSpec = { ...PROPELLER_DEFAULT_SPEC, tipRoundingMm: 3 };
    const outline = widestRing(rotorOutline(spec).rings);
    const tipRadius = spec.tipDiameterMm / 2;
    const trimRadius = tipRadius - effectiveTipRoundingMm(spec);
    let tipPoints = 0;
    for (let i = 0; i < outline.length; i += 1) {
      const a = outline[(i - 1 + outline.length) % outline.length];
      const b = outline[i];
      const c = outline[(i + 1) % outline.length];
      if (radiusOf(b) < trimRadius - 1e-9) continue;
      const abx = b.x - a.x;
      const aby = b.y - a.y;
      const bcx = c.x - b.x;
      const bcy = c.y - b.y;
      const turn = Math.acos(
        Math.max(
          -1,
          Math.min(
            1,
            (abx * bcx + aby * bcy) /
              (Math.hypot(abx, aby) * Math.hypot(bcx, bcy)),
          ),
        ),
      );
      expect(turn).toBeLessThan((20 * Math.PI) / 180);
      tipPoints += 1;
    }
    expect(tipPoints).toBeGreaterThan(6);
  });

  it("stays watertight across blade counts, sweeps and roundings", () => {
    for (const bladeCount of [2, 3, 4, 6, 8]) {
      for (const bladeSweepDeg of [-30, 0, 30]) {
        for (const tipRoundingMm of [0, 1, 3, 8, 40]) {
          const spec: RotorSpec = {
            ...FAN_DEFAULT_SPEC,
            bladeCount,
            bladeSweepDeg,
            tipRoundingMm,
            bladeAngleDeg: 24,
            bladeHeightMm: 20,
            tipDiameterMm: 120,
            hubDiameterMm: 44,
            rootWidthMm: 8,
            tipWidthMm: 5,
            boreMm: 6,
          };
          expect(validateRotor(spec).ok).toBe(true);
          const mesh = buildRotorMesh(spec);
          const report = inspectMesh(mesh);
          expect(report.watertight).toBe(true);
          expect(report.manifold).toBe(true);
          expect(report.components).toBe(1);
          expect(minTriangleArea(mesh)).toBeGreaterThan(1e-7);

          let rim = 0;
          for (let i = 0; i < mesh.positions.length; i += 3) {
            rim = Math.max(rim, Math.hypot(mesh.positions[i], mesh.positions[i + 1]));
          }
          expect(rim).toBeCloseTo(spec.tipDiameterMm / 2, 4);
        }
      }
    }
  }, 20000);

  it("ships the rounded mesh through the STL with the same dimensions", () => {
    const spec: RotorSpec = { ...PROPELLER_DEFAULT_SPEC, tipRoundingMm: 3 };
    const mesh = buildRotorMesh(spec);
    const view = new DataView(buildBinaryStl(mesh, "Propeller Designer — tip rounding"));
    const count = view.getUint32(80, true);
    expect(count).toBe(mesh.triangleCount);
    let rim = 0;
    let top = -Infinity;
    let bottom = Infinity;
    for (let t = 0; t < count; t += 1) {
      const offset = 84 + t * 50 + 12;
      for (let corner = 0; corner < 3; corner += 1) {
        const x = view.getFloat32(offset + corner * 12, true);
        const y = view.getFloat32(offset + corner * 12 + 4, true);
        const z = view.getFloat32(offset + corner * 12 + 8, true);
        rim = Math.max(rim, Math.hypot(x, y));
        top = Math.max(top, z);
        bottom = Math.min(bottom, z);
      }
    }
    expect(rim).toBeCloseTo(spec.tipDiameterMm / 2, 4);
    expect(top - bottom).toBeCloseTo(spec.bladeHeightMm, 4);
  });
});

/* -------------------------------------------------------- rounded tip edges */

describe("rounded tip edges", () => {
  it("caps the edge round at half the blade height and at the blade span", () => {
    const spec: RotorSpec = { ...FAN_DEFAULT_SPEC, tipEdgeRoundingMm: 5 };
    expect(effectiveTipEdgeRoundingMm(spec)).toBeCloseTo(5, 9);
    expect(effectiveTipEdgeRoundingMm({ ...spec, tipEdgeRoundingMm: 0 })).toBe(0);
    expect(effectiveTipEdgeRoundingMm({ ...spec, tipEdgeRoundingMm: -3 })).toBe(0);
    expect(effectiveTipEdgeRoundingMm({ ...spec, tipEdgeRoundingMm: Number.NaN })).toBe(0);
    // The two rounds meet at mid-height rather than passing through each other.
    expect(effectiveTipEdgeRoundingMm({ ...spec, tipEdgeRoundingMm: 40 })).toBeCloseTo(13, 9);
    // A blade with no room inboard of the tip round caps it below the request,
    // so the runout cannot reach the hub.
    const stubby: RotorSpec = {
      ...spec,
      tipDiameterMm: 70,
      hubDiameterMm: 58,
      tipRoundingMm: 1,
      tipEdgeRoundingMm: 8,
    };
    const capped = effectiveTipEdgeRoundingMm(stubby);
    expect(capped).toBeGreaterThan(0);
    expect(capped).toBeLessThan(8);
    expect(minRadius(rotorOutline({ ...stubby, tipEdgeRoundingMm: capped }).rings[0])).toBeCloseTo(
      29,
      9,
    );
  });

  it("follows a quarter circle from each face to mid-height", () => {
    const spec: RotorSpec = { ...PROPELLER_DEFAULT_SPEC, tipEdgeRoundingMm: 6 };
    const rounding = effectiveTipEdgeRoundingMm(spec);
    const tipRadius = spec.tipDiameterMm / 2;
    const height = spec.bladeHeightMm;
    const { rings, fractions } = rotorOutline(spec);

    expect(rounding).toBeCloseTo(6, 9);
    expect(fractions[0]).toBe(0);
    expect(fractions[fractions.length - 1]).toBe(1);
    expect(rings.length).toBe(fractions.length);
    expect(rotorRingFractions(spec)).toEqual(fractions);

    rings.forEach((ring, k) => {
      const z = fractions[k] * height;
      expect(maxRadius(ring)).toBeCloseTo(
        tipRadius - tipEdgeInsetMm(rounding, z, height),
        6,
      );
    });

    // The faces are pulled back by the full radius, so this is a round and not
    // a chamfer, and the widest slice is still the entered tip diameter.
    expect(maxRadius(rings[0])).toBeCloseTo(tipRadius - rounding, 6);
    expect(maxRadius(rings[rings.length - 1])).toBeCloseTo(tipRadius - rounding, 6);
    expect(maxRadius(widestRing(rings))).toBeCloseTo(tipRadius, 6);
  });

  it("samples the edge round inside the curve tolerance", () => {
    const spec: RotorSpec = { ...FAN_DEFAULT_SPEC, tipEdgeRoundingMm: 5 };
    const rounding = effectiveTipEdgeRoundingMm(spec);
    const height = spec.bladeHeightMm;
    const { fractions } = rotorOutline(spec);
    // The section through the edge round, in millimetres: height against pull-in.
    const pointAt = (t: number) => ({
      x: t * height,
      y: -tipEdgeInsetMm(rounding, t * height, height),
    });

    for (let k = 0; k < fractions.length - 1; k += 1) {
      const a = pointAt(fractions[k]);
      const b = pointAt(fractions[k + 1]);
      for (let s = 1; s < 8; s += 1) {
        const t = fractions[k] + (fractions[k + 1] - fractions[k]) * (s / 8);
        expect(pointToSegment(pointAt(t), a, b)).toBeLessThanOrEqual(
          CURVE_TOLERANCE_MM * 1.05,
        );
      }
    }
  });

  it("rounds the edge instead of chamfering it and keeps the bottom flat", () => {
    const square: RotorSpec = {
      ...FAN_DEFAULT_SPEC,
      tipRoundingMm: 0,
      tipEdgeRoundingMm: 0,
    };
    const rounded: RotorSpec = { ...square, tipEdgeRoundingMm: 4 };
    const flat = inspectMesh(buildRotorMesh(square));
    const round = inspectMesh(buildRotorMesh(rounded));
    expect(round.ok).toBe(true);
    expect(round.volumeMm3).toBeLessThan(flat.volumeMm3);

    // A chamfer of the same depth joins its two ends with a straight line; the
    // round stands outside that chord all the way between them.
    const rounding = effectiveTipEdgeRoundingMm(rounded);
    const tipRadius = rounded.tipDiameterMm / 2;
    const chord = tipRadius - rounding / 2;
    expect(
      tipRadius - tipEdgeInsetMm(rounding, rounding / 2, rounded.bladeHeightMm),
    ).toBeGreaterThan(chord + 0.2);

    // The round stops short of the hub, so the bottom face still sits flat.
    const { rings } = rotorOutline(rounded);
    expect(minRadius(rings[0])).toBeCloseTo(rounded.hubDiameterMm / 2, 9);
  });

  it("stays watertight across blade counts and edge roundings", () => {
    for (const bladeCount of [2, 3, 5, 8]) {
      for (const tipEdgeRoundingMm of [0, 1, 4, 40]) {
        const spec: RotorSpec = {
          ...FAN_DEFAULT_SPEC,
          bladeCount,
          tipEdgeRoundingMm,
          tipRoundingMm: 4,
          bladeSweepDeg: 18,
          bladeAngleDeg: 28,
          bladeHeightMm: 18,
          tipDiameterMm: 120,
          hubDiameterMm: 40,
          rootWidthMm: 9,
          tipWidthMm: 6,
          boreMm: 6,
        };
        expect(validateRotor(spec).ok).toBe(true);
        const mesh = buildRotorMesh(spec);
        const report = inspectMesh(mesh);
        expect(report.watertight).toBe(true);
        expect(report.manifold).toBe(true);
        expect(report.components).toBe(1);
        expect(minTriangleArea(mesh)).toBeGreaterThan(1e-9);

        let rim = 0;
        for (let i = 0; i < mesh.positions.length; i += 3) {
          rim = Math.max(rim, Math.hypot(mesh.positions[i], mesh.positions[i + 1]));
        }
        expect(rim).toBeCloseTo(spec.tipDiameterMm / 2, 4);
      }
    }
  });

  it("warns when the blade height caps the edge round", () => {
    const spec: RotorSpec = { ...FAN_DEFAULT_SPEC, tipEdgeRoundingMm: 40 };
    expect(effectiveTipEdgeRoundingMm(spec)).toBeCloseTo(13, 9);
    expect(
      validateRotor(spec).warnings.some((issue) => issue.field === "tipEdgeRounding"),
    ).toBe(true);
    expect(inspectMesh(buildRotorMesh(spec)).ok).toBe(true);
  });

  it("carries the edge round through both forms in either unit", () => {
    const fan = buildFanSpec(fanDefaultValues(), "mm", "round");
    expect(fan.spec.tipEdgeRoundingMm).toBe(4);
    const prop = buildPropellerSpec(
      { ...propellerDefaultValues(), tipEdgeRounding: "0.25" },
      "in",
      "round",
    );
    expect(prop.spec.tipEdgeRoundingMm).toBeCloseTo(6.35, 6);
  });

  it("ships the edge-rounded mesh at the entered diameter and height", () => {
    const spec: RotorSpec = { ...PROPELLER_DEFAULT_SPEC, tipEdgeRoundingMm: 7 };
    const mesh = buildRotorMesh(spec);
    const view = new DataView(
      buildBinaryStl(mesh, "Propeller Designer — tip edge rounding"),
    );
    const count = view.getUint32(80, true);
    expect(count).toBe(mesh.triangleCount);
    let rim = 0;
    let top = -Infinity;
    let bottom = Infinity;
    for (let t = 0; t < count; t += 1) {
      const offset = 84 + t * 50 + 12;
      for (let corner = 0; corner < 3; corner += 1) {
        const x = view.getFloat32(offset + corner * 12, true);
        const y = view.getFloat32(offset + corner * 12 + 4, true);
        const z = view.getFloat32(offset + corner * 12 + 8, true);
        rim = Math.max(rim, Math.hypot(x, y));
        top = Math.max(top, z);
        bottom = Math.min(bottom, z);
      }
    }
    expect(rim).toBeCloseTo(spec.tipDiameterMm / 2, 4);
    expect(top - bottom).toBeCloseTo(spec.bladeHeightMm, 4);
  });
});

describe("shared extrusion", () => {
  it("refuses mismatched outlines", () => {
    const outer = circleOutline(20, 48);
    const bore = boreOutline({ boreMm: 8, boreShape: "round" });
    expect(() =>
      buildExtrusion({
        rings: [outer, [...outer, outer[0]]],
        bore,
        thicknessMm: 5,
      }),
    ).toThrow();
  });

  it("welds repeated vertices instead of leaving zero-length edges", () => {
    const ring: Point2D[] = [
      { x: 10, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 10 },
      { x: -10, y: 0 },
    ];
    const [cleaned] = cleanRings([ring]);
    expect(cleaned.length).toBe(3);
    expect(shortestEdge(cleaned)).toBeGreaterThan(0.1);
  });

  it("writes a binary STL of the measured mesh", () => {
    const mesh = buildSprocketMesh(SPROCKET_DEFAULT_SPEC);
    const buffer = buildBinaryStl(mesh, "test");
    expect(buffer.byteLength).toBe(stlByteLength(mesh));
    expect(new DataView(buffer).getUint32(80, true)).toBe(mesh.triangleCount);
  });

  it("keeps the STL header to plain ASCII bytes", () => {
    const mesh = buildSprocketMesh(SPROCKET_DEFAULT_SPEC);
    const buffer = buildBinaryStl(mesh, "Sprocket Designer — units: mm");
    // Zero padding after the text is fine; a truncated multi-byte character is
    // not, so only control bytes above the padding are rejected.
    const header = new Uint8Array(buffer, 0, 80);
    for (const byte of header) {
      expect(byte === 0 || (byte >= 32 && byte < 127)).toBe(true);
    }
  });
});

/* ------------------------------------------------------------ curve sampling */

describe("curve sampling", () => {
  it("subdivides until every chord is inside the tolerance", () => {
    const pointAt = (u: number) => ({
      x: 20 * Math.cos(u * 0.5),
      y: 20 * Math.sin(u * 0.5),
    });
    const us = sampleCurve(pointAt, CURVE_TOLERANCE_MM);
    expect(us[0]).toBe(0);
    expect(us[us.length - 1]).toBe(1);
    expect(us.length).toBeGreaterThan(4);
    for (let i = 0; i < us.length - 1; i += 1) {
      const a = pointAt(us[i]);
      const b = pointAt(us[i + 1]);
      for (let s = 1; s < 8; s += 1) {
        const u = us[i] + ((us[i + 1] - us[i]) * s) / 8;
        expect(pointToSegment(pointAt(u), a, b)).toBeLessThanOrEqual(
          CURVE_TOLERANCE_MM * 1.05,
        );
      }
    }
  });

  it("keeps a straight line to two points", () => {
    const us = sampleCurve((u) => ({ x: u * 10, y: 0 }), CURVE_TOLERANCE_MM);
    expect(us).toEqual([0, 1]);
  });
});

/* ---------------------------------------------------------- dimensional truth */

describe("dimensional accuracy", () => {
  it("cuts every sprocket to its calculated tip and root diameters", () => {
    for (const chain of CHAIN_PRESETS) {
      for (const teeth of [9, 18, 42]) {
        const spec: SprocketSpec = {
          ...SPROCKET_DEFAULT_SPEC,
          pitchMm: chain.pitchMm,
          rollerMm: chain.rollerMm,
          teeth,
          toothHeightMm: 4,
          tipWidthMm: 2,
          boreMm: 6,
        };
        const derived = deriveSprocket(spec);
        const outline = sprocketOutline(spec);
        expect(maxRadius(outline)).toBeCloseTo(derived.tipRadiusMm, 6);
        expect(minRadius(outline)).toBeCloseTo(derived.rootRadiusMm, 4);
      }
    }
  });

  it("measures the extrusions at exactly the entered thickness and height", () => {
    const sprocket = buildSprocketMesh(SPROCKET_DEFAULT_SPEC);
    expect(zExtent(sprocket)).toBeCloseTo(SPROCKET_DEFAULT_SPEC.thicknessMm, 5);
    expect(sprocket.boundingBox.max[2]).toBeCloseTo(
      SPROCKET_DEFAULT_SPEC.thicknessMm / 2,
      5,
    );

    const withHub: SprocketSpec = {
      ...SPROCKET_DEFAULT_SPEC,
      hubEnabled: true,
      hubDiameterMm: 30,
      hubHeightMm: 6,
    };
    expect(zExtent(buildSprocketMesh(withHub))).toBeCloseTo(
      withHub.thicknessMm + withHub.hubHeightMm,
      5,
    );

    for (const spec of [FAN_DEFAULT_SPEC, PROPELLER_DEFAULT_SPEC]) {
      expect(zExtent(buildRotorMesh(spec))).toBeCloseTo(spec.bladeHeightMm, 5);
    }
  });

  it("reaches the full tip radius at mid-height", () => {
    for (const spec of [FAN_DEFAULT_SPEC, PROPELLER_DEFAULT_SPEC]) {
      const { rings } = rotorOutline(spec);
      expect(rings.length).toBeGreaterThan(4);
      expect(maxRadius(widestRing(rings))).toBeCloseTo(spec.tipDiameterMm / 2, 6);
      for (const ring of rings) {
        expect(maxRadius(ring)).toBeLessThanOrEqual(spec.tipDiameterMm / 2 + 1e-9);
        expect(minRadius(ring)).toBeCloseTo(spec.hubDiameterMm / 2, 6);
      }
    }
  });

  it("twists each blade as a rotated cross-section, not a chord", () => {
    const spec = FAN_DEFAULT_SPEC;
    const { rings, fractions } = rotorOutline(spec);
    const derived = deriveRotor(spec);
    const tipRadius = spec.tipDiameterMm / 2;
    const widest = widestRing(rings);
    const tipIndex = widest.findIndex(
      (point) => Math.abs(radiusOf(point) - tipRadius) < 1e-6,
    );
    expect(tipIndex).toBeGreaterThan(-1);

    // The widest slice is the first one the edge round leaves untouched, which
    // need not be the bottom face, so measure the turn from that slice.
    const startT = fractions[rings.indexOf(widest)];
    const start = Math.atan2(widest[tipIndex].y, widest[tipIndex].x);
    rings.forEach((ring, k) => {
      const angle = Math.atan2(ring[tipIndex].y, ring[tipIndex].x);
      let turn = angle - start;
      while (turn > Math.PI) turn -= 2 * Math.PI;
      while (turn < -Math.PI) turn += 2 * Math.PI;
      expect(turn).toBeCloseTo((derived.leanMm * (fractions[k] - startT)) / tipRadius, 6);
    });

    // A deeper lean needs more slices to stay inside the tolerance.
    const steep: RotorSpec = { ...spec, bladeAngleDeg: 55 };
    expect(rotorRingCount(steep)).toBeGreaterThan(rotorRingCount(spec));
  });

  it("cuts each blade tip to the entered chord", () => {
    const spec: RotorSpec = { ...FAN_DEFAULT_SPEC, tipRoundingMm: 0 };
    const tipRadius = spec.tipDiameterMm / 2;
    const bottom = widestRing(rotorOutline(spec).rings);
    const start = bottom.findIndex(
      (point) => Math.abs(radiusOf(point) - tipRadius) < 1e-6,
    );
    expect(start).toBeGreaterThan(-1);
    let arc = 0;
    let i = start;
    while (Math.abs(radiusOf(bottom[(i + 1) % bottom.length]) - tipRadius) < 1e-6) {
      const a = bottom[i];
      const b = bottom[(i + 1) % bottom.length];
      arc += Math.hypot(a.x - b.x, a.y - b.y);
      i += 1;
      if (i - start > bottom.length) break;
    }
    expect(arc).toBeCloseTo(spec.tipWidthMm, 1);
  });

  it("keeps inch input exact to a tenth of a thousandth of an inch", () => {
    const values = {
      ...sprocketDefaultValues(),
      pitch: "0.125",
      thickness: "0.375",
      bore: "0.25",
    };
    const { spec } = buildSprocketSpec(values, "in", {
      toothProfile: "standard",
      boreShape: "round",
      hubEnabled: false,
    });
    expect(spec.pitchMm as number).toBeCloseTo(3.175, 9);
    expect(spec.thicknessMm as number).toBeCloseTo(9.525, 9);
    expect(spec.boreMm as number).toBeCloseTo(6.35, 9);
  });

  it("leaves no zero-length edge in any outline", () => {
    expect(shortestEdge(sprocketOutline(SPROCKET_DEFAULT_SPEC))).toBeGreaterThan(1e-4);
    expect(shortestEdge(rotorOutline(FAN_DEFAULT_SPEC).bottom)).toBeGreaterThan(1e-4);
    expect(shortestEdge(rotorOutline(PROPELLER_DEFAULT_SPEC).bottom)).toBeGreaterThan(1e-4);
  });
});

/* ------------------------------------------------------------ surface finish */

describe("surface finish", () => {
  it("gives the bore one continuous radial normal field", () => {
    const boreRadius = SPROCKET_DEFAULT_SPEC.boreMm / 2;
    const smooth = buildSmoothGeometry(buildSprocketMesh(SPROCKET_DEFAULT_SPEC));
    let checked = 0;
    for (let i = 0; i < smooth.positions.length / 3; i += 1) {
      const x = smooth.positions[i * 3];
      const y = smooth.positions[i * 3 + 1];
      const radius = Math.hypot(x, y);
      if (Math.abs(radius - boreRadius) > 1e-4) continue;
      const nx = smooth.normals[i * 3];
      const ny = smooth.normals[i * 3 + 1];
      const nz = smooth.normals[i * 3 + 2];
      if (Math.abs(nz) > 1e-6) continue; // the flat cap ring, checked below
      expect((nx * x + ny * y) / radius).toBeCloseTo(-1, 4);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(30);
  });

  it("keeps the flat faces flat instead of rounding their edges", () => {
    const half = SPROCKET_DEFAULT_SPEC.thicknessMm / 2;
    const smooth = buildSmoothGeometry(buildSprocketMesh(SPROCKET_DEFAULT_SPEC));
    let caps = 0;
    for (let i = 0; i < smooth.positions.length / 3; i += 1) {
      if (Math.abs(smooth.positions[i * 3 + 2] + half) > 1e-6) continue;
      const nz = smooth.normals[i * 3 + 2];
      const horizontal = Math.abs(nz) < 1e-6;
      const flat = Math.abs(Math.abs(nz) - 1) < 1e-6;
      expect(horizontal || flat).toBe(true);
      if (nz < -0.99) caps += 1;
    }
    expect(caps).toBeGreaterThan(50);
  });

  it("returns unit normals for every designer", () => {
    const meshes = [
      buildSprocketMesh(SPROCKET_DEFAULT_SPEC),
      buildRotorMesh(FAN_DEFAULT_SPEC),
      buildRotorMesh(PROPELLER_DEFAULT_SPEC),
    ];
    for (const mesh of meshes) {
      const smooth = buildSmoothGeometry(mesh);
      expect(smooth.normals.length).toBe(smooth.positions.length);
      for (let i = 0; i < smooth.normals.length; i += 3) {
        expect(
          Math.hypot(smooth.normals[i], smooth.normals[i + 1], smooth.normals[i + 2]),
        ).toBeCloseTo(1, 5);
      }
      expect(smooth.indices.length).toBe(mesh.indices.length);
    }
  });

  it("follows the roller seat as an arc, not a notch", () => {
    const derived = deriveSprocket(SPROCKET_DEFAULT_SPEC);
    const spec = SPROCKET_DEFAULT_SPEC;
    const outline = sprocketOutline(spec);
    // Points on the seat lie on the roller circle centred on its pitch point.
    const pitch = (Math.PI * 2) / derived.teeth;
    let seatPoints = 0;
    for (const point of outline) {
      const angle = Math.atan2(point.y, point.x);
      const tooth = Math.round(angle / pitch);
      const offset = angle - tooth * pitch;
      if (Math.abs(offset) > derived.seatHalfAngleRad + 1e-9) continue;
      const centreX = derived.pitchRadiusMm * Math.cos(tooth * pitch);
      const centreY = derived.pitchRadiusMm * Math.sin(tooth * pitch);
      const distance = Math.hypot(point.x - centreX, point.y - centreY);
      if (distance > derived.seatRadiusMm + 1e-6) continue;
      expect(distance).toBeCloseTo(derived.seatRadiusMm, 3);
      seatPoints += 1;
    }
    expect(seatPoints).toBeGreaterThan(derived.teeth * 6);
  });
});

/* --------------------------------------------------------------- solid matrix */

describe("solid integrity across the parameter space", () => {
  it("stays watertight for every chain, profile, bore and hub", () => {
    for (const chain of CHAIN_PRESETS) {
      for (const toothProfile of TOOTH_PROFILE_ORDER) {
        for (const boreShape of ["round", "hex", "doubleFlat"] as const) {
          for (const hubEnabled of [false, true]) {
            const spec: SprocketSpec = {
              pitchMm: chain.pitchMm,
              rollerMm: chain.rollerMm,
              teeth: 14,
              clearanceMm: 0.15,
              toothHeightMm: 4,
              toothProfile,
              tipWidthMm: 2,
              thicknessMm: 6,
              boreMm: 6,
              boreShape,
              hubEnabled,
              hubDiameterMm: 18,
              hubHeightMm: 4,
            };
            expect(validateSprocket(spec).ok).toBe(true);
            const mesh = buildSprocketMesh(spec);
            const report = inspectMesh(mesh);
            expect(report.watertight).toBe(true);
            expect(report.manifold).toBe(true);
            expect(report.eulerCharacteristic).toBe(0);
            expect(minTriangleArea(mesh)).toBeGreaterThan(1e-6);
          }
        }
      }
    }
  });

  it("closes a tooth narrowed to a point", () => {
    for (const tipWidthMm of [0, 0.01]) {
      const spec: SprocketSpec = {
        ...SPROCKET_DEFAULT_SPEC,
        tipWidthMm,
        toothProfile: "pointed",
      };
      const mesh = buildSprocketMesh(spec);
      const report = inspectMesh(mesh);
      expect(report.ok).toBe(true);
      expect(minTriangleArea(mesh)).toBeGreaterThan(1e-8);
      expect(shortestEdge(sprocketOutline(spec))).toBeGreaterThan(1e-6);
    }
  });

  // More slices per part now that the tip edge carries a round, so allow more
  // than the default budget for the whole matrix.
  it("stays watertight across blade counts, sweeps and leans", () => {
    for (const bladeCount of [2, 3, 4, 6, 8, 10]) {
      for (const bladeSweepDeg of [-40, 0, 25, 45]) {
        for (const bladeAngleDeg of [0, 18, 40]) {
          const spec: RotorSpec = {
            ...FAN_DEFAULT_SPEC,
            bladeCount,
            bladeSweepDeg,
            bladeAngleDeg,
            bladeHeightMm: 20,
            tipDiameterMm: 120,
            hubDiameterMm: 44,
            rootWidthMm: 8,
            tipWidthMm: 5,
            boreMm: 6,
          };
          const mesh = buildRotorMesh(spec);
          const report = inspectMesh(mesh);
          expect(report.watertight).toBe(true);
          expect(report.manifold).toBe(true);
          expect(report.components).toBe(1);
          expect(minTriangleArea(mesh)).toBeGreaterThan(1e-7);
        }
      }
    }
  }, 20000);

  it("keeps the extremes of the input ranges valid", () => {
    const big = buildSprocketMesh({
      ...SPROCKET_DEFAULT_SPEC,
      pitchMm: 6.35,
      rollerMm: 3.3,
      teeth: 72,
      toothHeightMm: 2,
      tipWidthMm: 1,
      thicknessMm: 4,
      boreMm: 8,
    });
    expect(inspectMesh(big).ok).toBe(true);

    const small = buildSprocketMesh({
      ...SPROCKET_DEFAULT_SPEC,
      pitchMm: 6.35,
      rollerMm: 3.3,
      teeth: 9,
      toothHeightMm: 2,
      tipWidthMm: 1,
      thicknessMm: 3,
      boreMm: 4,
    });
    expect(inspectMesh(small).ok).toBe(true);

    const flatProp = buildRotorMesh({ ...PROPELLER_DEFAULT_SPEC, bladeAngleDeg: 0 });
    expect(inspectMesh(flatProp).ok).toBe(true);
    expect(zExtent(flatProp)).toBeCloseTo(PROPELLER_DEFAULT_SPEC.bladeHeightMm, 5);
  });
});

/* -------------------------------------------------------------------- the STL */

describe("STL export", () => {
  it("writes the measured geometry, not a resampled copy", () => {
    const mesh = buildRotorMesh(PROPELLER_DEFAULT_SPEC);
    const buffer = buildBinaryStl(mesh, "Propeller Designer — units: mm");
    const view = new DataView(buffer);
    const count = view.getUint32(80, true);
    expect(count).toBe(mesh.triangleCount);
    expect(buffer.byteLength).toBe(84 + count * 50);
    expect(
      new TextDecoder().decode(new Uint8Array(buffer, 0, 9)),
    ).toBe("Propeller");

    const { positions, indices } = mesh;
    for (let t = 0; t < count; t += 1) {
      const offset = 84 + t * 50;
      const nx = view.getFloat32(offset, true);
      const ny = view.getFloat32(offset + 4, true);
      const nz = view.getFloat32(offset + 8, true);
      expect(Math.hypot(nx, ny, nz)).toBeCloseTo(1, 5);
      for (let corner = 0; corner < 3; corner += 1) {
        const source = indices[t * 3 + corner] * 3;
        expect(view.getFloat32(offset + 12 + corner * 12, true)).toBe(positions[source]);
        expect(view.getFloat32(offset + 16 + corner * 12, true)).toBe(positions[source + 1]);
        expect(view.getFloat32(offset + 20 + corner * 12, true)).toBe(positions[source + 2]);
      }
    }
  });

  it("round-trips to the same enclosed volume", () => {
    const mesh = buildSprocketMesh(SPROCKET_DEFAULT_SPEC);
    const view = new DataView(buildBinaryStl(mesh, "sprocket"));
    const count = view.getUint32(80, true);
    let volume6 = 0;
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
      volume6 +=
        ax * (by * cz - cy * bz) -
        bx * (ay * cz - cy * az) +
        cx * (ay * bz - by * az);
    }
    expect(Math.abs(volume6) / 6).toBeCloseTo(mesh.volumeMm3, 1);
  });

  it("measures the file the download reports", () => {
    for (const mesh of [
      buildSprocketMesh(SPROCKET_DEFAULT_SPEC),
      buildRotorMesh(FAN_DEFAULT_SPEC),
      buildRotorMesh(PROPELLER_DEFAULT_SPEC),
    ]) {
      expect(stlByteLength(mesh)).toBe(84 + mesh.triangleCount * 50);
      expect(buildBinaryStl(mesh, "test").byteLength).toBe(stlByteLength(mesh));
    }
  });
});
