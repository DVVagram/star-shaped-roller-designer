/**
 * Bladed rotor geometry shared by the impeller and propeller designers.
 *
 * The plan view is a hub disc with N blade bands sweeping from the hub to the
 * tip. Each band is bounded by two offset curves of its centre line, so the
 * passages between blades stay open all the way out. The solid is that plan
 * extruded along the axis, with the top face displaced tangentially by the blade
 * lean: the wall between the two outlines is a twisted ruled surface, and the
 * shell stays closed because both outlines share their vertex order.
 *
 *   pitch angle  = 360° / N
 *   passage(r)   = pitch·r − blade width(r)
 *   lean         = blade height · tan(blade angle)
 */

import {
  BUILD_VOLUME_MM,
  CURVE_TOLERANCE_MM,
  MIN_FEATURE_MM,
  MIN_WALL_MM,
  TWO_PI,
  boreOutline,
  clamp,
  formatMeasure,
  formatNumber,
  pushInteger,
  pushRange,
  sampleCurve,
  type BoreShape,
  type Issue,
  type LengthUnit,
  type Point2D,
} from "./kit/units";
import { buildExtrusion, type Mesh } from "./kit/solid";

export interface RotorSpec {
  tipDiameterMm: number;
  hubDiameterMm: number;
  bladeCount: number;
  rootWidthMm: number;
  tipWidthMm: number;
  /** Radius of the round on each outer blade end. 0 leaves a square tip. */
  tipRoundingMm: number;
  bladeHeightMm: number;
  bladeAngleDeg: number;
  bladeSweepDeg: number;
  boreMm: number;
  boreShape: BoreShape;
}

export const ROTOR_LIMITS = {
  tipDiameterMm: { min: 20, max: 180 },
  hubDiameterMm: { min: 5, max: 150 },
  bladeCount: { min: 2, max: 24 },
  rootWidthMm: { min: 1, max: 80 },
  tipWidthMm: { min: 0.8, max: 80 },
  tipRoundingMm: { min: 0, max: 40 },
  bladeHeightMm: { min: 2, max: 120 },
  bladeAngleDeg: { min: 0, max: 70 },
  bladeSweepDeg: { min: -60, max: 60 },
  boreMm: { min: 0.8, max: 120 },
} as const;

export class RotorGeometryError extends Error {}

/** Blade width at a fraction u of the way from hub to tip. */
export function bladeWidthAt(spec: RotorSpec, u: number): number {
  const t = clamp(u, 0, 1);
  return Math.max(0.3, spec.rootWidthMm + (spec.tipWidthMm - spec.rootWidthMm) * t);
}

/** Gap left between two neighbouring blades, measured as an arc length. */
export function passageAt(spec: RotorSpec, u: number, pitchRad: number): number {
  const hubRadius = Math.max(0.5, spec.hubDiameterMm / 2);
  const tipRadius = Math.max(hubRadius + 0.5, spec.tipDiameterMm / 2);
  const radius = hubRadius + (tipRadius - hubRadius) * clamp(u, 0, 1);
  return pitchRad * radius - bladeWidthAt(spec, u);
}

/**
 * Rounded tip radius actually used, in millimetres.
 *
 * A blade can only be rounded as far as its own half chord at the point the
 * round starts, so an oversized request is capped instead of rejected: asking
 * for more than the chord allows simply gives a fully round nose. The result is
 * still exact at the rim, because the round always closes onto a land on the
 * entered tip circle.
 */
export function effectiveTipRoundingMm(spec: RotorSpec): number {
  const requested = spec.tipRoundingMm;
  if (typeof requested !== "number" || !Number.isFinite(requested) || requested <= 0) {
    return 0;
  }
  const hubRadius = Math.max(0.5, spec.hubDiameterMm / 2);
  const tipRadius = Math.max(hubRadius + 0.5, spec.tipDiameterMm / 2);
  const span = tipRadius - hubRadius;
  const tipWidth = bladeWidthAt(spec, 1);
  const rootWidth = bladeWidthAt(spec, 0);

  // The round starts at tipRadius − R, where the chord has already tapered to
  // tip − (tip − root)·R/span. Its half must still be at least R:
  //   R ≤ tip·span / (2·span + tip − root)
  const denominator = 2 * span + tipWidth - rootWidth;
  const chordLimit =
    denominator > 1e-9 ? (tipWidth * span) / denominator : tipWidth / 2;
  return Math.min(requested, Math.max(0, chordLimit), span * 0.9);
}

export interface RotorDerived {
  bladeCount: number;
  tipRadiusMm: number;
  hubRadiusMm: number;
  bladeLengthMm: number;
  pitchAngleDeg: number;
  pitchRad: number;
  rootWidthMm: number;
  tipWidthMm: number;
  meanWidthMm: number;
  /** Rounding actually applied; capped by the tip chord. */
  tipRoundingMm: number;
  minPassageMm: number;
  leanMm: number;
  leanLimitMm: number;
  bladeAngleDeg: number;
  bladeSweepDeg: number;
  /** Advance per revolution at 70 % radius — the propeller's pitch. */
  pitchMm: number;
  bladeAreaMm2: number;
  discAreaMm2: number;
  boreRadiusMm: number;
  hubWallMm: number;
  heightMm: number;
  fitsBuildVolume: boolean;
  feasible: boolean;
  limitingFactor: string | null;
}

export function deriveRotor(spec: RotorSpec): RotorDerived {
  const bladeCount = Math.max(2, Math.round(spec.bladeCount));
  const hubRadius = Math.max(0.5, spec.hubDiameterMm / 2);
  const tipRadius = Math.max(hubRadius + 0.5, spec.tipDiameterMm / 2);
  const pitchRad = TWO_PI / bladeCount;
  const bladeAngle = clamp(spec.bladeAngleDeg, 0, 75);
  const lean = Math.max(0, spec.bladeHeightMm) * Math.tan((bladeAngle * Math.PI) / 180);
  const tipRounding = effectiveTipRoundingMm(spec);

  let minPassage = Infinity;
  for (let i = 0; i <= 24; i += 1) {
    minPassage = Math.min(minPassage, passageAt(spec, i / 24, pitchRad));
  }

  const leanLimit = 0.55 * pitchRad * tipRadius;
  const boreRadius = Math.max(0.02, spec.boreMm / 2);
  const totalHeight = spec.bladeHeightMm;

  let limitingFactor: string | null = null;
  if (tipRadius - hubRadius < 2) limitingFactor = "the blade length";
  else if (minPassage < MIN_FEATURE_MM) limitingFactor = "the passage between the blades";
  else if (lean > leanLimit) limitingFactor = "how far a blade can lean before it meets its neighbour";

  return {
    bladeCount,
    tipRadiusMm: tipRadius,
    hubRadiusMm: hubRadius,
    bladeLengthMm: tipRadius - hubRadius,
    pitchAngleDeg: 360 / bladeCount,
    pitchRad,
    rootWidthMm: spec.rootWidthMm,
    tipWidthMm: spec.tipWidthMm,
    meanWidthMm: (spec.rootWidthMm + spec.tipWidthMm) / 2,
    tipRoundingMm: tipRounding,
    minPassageMm: Number.isFinite(minPassage) ? minPassage : 0,
    leanMm: lean,
    leanLimitMm: leanLimit,
    bladeAngleDeg: bladeAngle,
    bladeSweepDeg: spec.bladeSweepDeg,
    pitchMm: TWO_PI * 0.7 * tipRadius * Math.tan((bladeAngle * Math.PI) / 180),
    bladeAreaMm2:
      bladeCount *
      ((spec.rootWidthMm + spec.tipWidthMm) / 2) *
      Math.max(0, tipRadius - hubRadius),
    discAreaMm2: Math.PI * tipRadius * tipRadius,
    boreRadiusMm: boreRadius,
    hubWallMm: hubRadius - boreRadius,
    heightMm: totalHeight,
    fitsBuildVolume:
      tipRadius * 2 <= BUILD_VOLUME_MM.x + 1e-9 &&
      totalHeight <= BUILD_VOLUME_MM.z + 1e-9,
    feasible: limitingFactor === null,
    limitingFactor,
  };
}

export interface RotorOutline {
  /** Cross-sections stacked from the bottom face up, sharing their vertices. */
  rings: Point2D[][];
  /** Plan view at the bottom face. */
  bottom: Point2D[];
  /** The same vertices after the full lean, at the top face. */
  top: Point2D[];
}

/**
 * Vertical slices the twist needs to stay inside the curve tolerance.
 *
 * Building the wall between only the two faces would make it one long chord
 * between two rotated copies of the profile: halfway up the blade is pulled
 * towards the axis by R(1 − cos(Δθ/2)) — about a millimetre on a 150 mm rotor —
 * and the blade face is a single flat facet. Stacking rotated slices keeps every
 * horizontal section the real blade profile.
 */
export function rotorRingCount(spec: RotorSpec): number {
  const hubRadius = Math.max(0.5, spec.hubDiameterMm / 2);
  const tipRadius = Math.max(hubRadius + 0.5, spec.tipDiameterMm / 2);
  const lean =
    Math.max(0, spec.bladeHeightMm) *
    Math.tan((clamp(spec.bladeAngleDeg, 0, 75) * Math.PI) / 180);
  if (!(lean > 1e-6)) return 2;
  const turn = lean / tipRadius;
  const step = 2 * Math.acos(clamp(1 - CURVE_TOLERANCE_MM / tipRadius, -1, 1));
  if (!(step > 1e-9)) return 48;
  return Math.min(48, Math.max(2, Math.ceil(turn / step) + 1));
}

export function rotorOutline(spec: RotorSpec): RotorOutline {
  const bladeCount = Math.max(2, Math.round(spec.bladeCount));
  const hubRadius = Math.max(0.5, spec.hubDiameterMm / 2);
  const tipRadius = Math.max(hubRadius + 0.5, spec.tipDiameterMm / 2);
  if (!(tipRadius > hubRadius + 0.2)) {
    throw new RotorGeometryError("The hub leaves no room for a blade.");
  }
  const pitch = TWO_PI / bladeCount;
  const sweep = (clamp(spec.bladeSweepDeg, -80, 80) * Math.PI) / 180;
  const lean =
    Math.max(0, spec.bladeHeightMm) *
    Math.tan((clamp(spec.bladeAngleDeg, 0, 75) * Math.PI) / 180);
  const span = tipRadius - hubRadius;

  const deltaAt = (u: number) =>
    Math.min(Math.PI * 0.48, bladeWidthAt(spec, u) / 2 / (hubRadius + span * clamp(u, 0, 1)));

  const bottom: Point2D[] = [];
  const radii: number[] = [];
  const angles: number[] = [];

  const push = (radius: number, angle: number) => {
    bottom.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
    radii.push(radius);
    angles.push(angle);
  };

  /** Samples a polar edge and records the points it produces. */
  const pushEdge = (
    radiusAt: (u: number) => number,
    angleAt: (u: number) => number,
    options: {
      skipFirst?: boolean;
      skipLast?: boolean;
      reverse?: boolean;
      /** Fraction of the edge to walk from the hub end, for a trimmed tip. */
      until?: number;
    } = {},
  ) => {
    const until = options.until ?? 1;
    const us = sampleCurve((t) => {
      const u = t * until;
      const r = radiusAt(u);
      const a = angleAt(u);
      return { x: r * Math.cos(a), y: r * Math.sin(a) };
    }, CURVE_TOLERANCE_MM);
    const from = options.skipFirst ? 1 : 0;
    const to = options.skipLast ? us.length - 2 : us.length - 1;
    if (options.reverse) {
      for (let j = to; j >= from; j -= 1) {
        const u = us[j] * until;
        push(radiusAt(u), angleAt(u));
      }
    } else {
      for (let j = from; j <= to; j += 1) {
        const u = us[j] * until;
        push(radiusAt(u), angleAt(u));
      }
    }
  };

  // A rounded tip pulls both sides in by the rounding radius and closes the
  // blade with a quarter round into a straight land on the entered tip circle.
  // Rounding the corners of the tip land this way keeps the outside diameter
  // exact instead of shrinking it, and the land length falls out of the trim.
  const rounding = effectiveTipRoundingMm(spec);
  const uTrim = rounding > 1e-9 ? Math.max(0, 1 - rounding / span) : 1;

  /** Maps a point from the blade tip frame (tangential a, inboard b) to polar. */
  const pushTipPoint = (centre: number, a: number, b: number) => {
    const radius = tipRadius - b;
    const u = clamp((radius - hubRadius) / span, 0, 1);
    push(radius, centre + sweep * u + a / radius);
  };

  /** Samples a curve in the tip frame adaptively, then maps it into place. */
  const pushTipCurve = (
    centre: number,
    pointAt: (v: number) => { a: number; b: number },
    skipFirst: boolean,
  ) => {
    const us = sampleCurve((v) => {
      const point = pointAt(v);
      return { x: point.a, y: point.b };
    }, CURVE_TOLERANCE_MM);
    for (let j = skipFirst ? 1 : 0; j < us.length; j += 1) {
      const point = pointAt(us[j]);
      pushTipPoint(centre, point.a, point.b);
    }
  };

  for (let i = 0; i < bladeCount; i += 1) {
    const centre = i * pitch;

    // Trailing side, hub to the start of the rounded tip.
    pushEdge(
      (u) => hubRadius + span * u,
      (u) => centre + sweep * u - deltaAt(u),
      { until: uTrim },
    );

    if (rounding > 1e-9) {
      const trimRadius = tipRadius - rounding;
      const halfWidth = deltaAt(uTrim) * trimRadius;
      const corner = Math.min(rounding, Math.max(0, halfWidth));
      const land = Math.max(0, halfWidth - corner);

      // Trailing corner: a quarter round from the side into the tip land.
      pushTipCurve(
        centre,
        (v) => {
          const angle = Math.PI + (Math.PI / 2) * v;
          return {
            a: -land + corner * Math.cos(angle),
            b: corner + corner * Math.sin(angle),
          };
        },
        true,
      );

      // The land itself sits exactly on the entered tip diameter, sampled on
      // the tip circle rather than as one chord across it: a single chord would
      // cut inside the rim by R(1 − cos(θ/2)) and shrink the measured diameter.
      if (land > 1e-9) {
        const landAngle = land / tipRadius;
        const fromAngle = centre + sweep - landAngle;
        const toAngle = centre + sweep + landAngle;
        const us = sampleCurve((v) => {
          const angle = fromAngle + (toAngle - fromAngle) * v;
          return { x: tipRadius * Math.cos(angle), y: tipRadius * Math.sin(angle) };
        }, CURVE_TOLERANCE_MM);
        for (let j = 1; j < us.length; j += 1) {
          push(tipRadius, fromAngle + (toAngle - fromAngle) * us[j]);
        }
      }

      // Leading corner, mirroring the trailing one.
      pushTipCurve(
        centre,
        (v) => {
          const angle = -Math.PI / 2 + (Math.PI / 2) * v;
          return {
            a: land + corner * Math.cos(angle),
            b: corner + corner * Math.sin(angle),
          };
        },
        true,
      );
    } else {
      // Tip land, starting where the trailing side ended.
      const tipDelta = deltaAt(1);
      if (tipDelta > 1e-9) {
        pushEdge(
          () => tipRadius,
          (u) => centre + sweep - tipDelta + 2 * tipDelta * u,
          { skipFirst: true },
        );
      }
    }

    // Leading side, from the tip rounding back to the hub.
    pushEdge(
      (u) => hubRadius + span * u,
      (u) => centre + sweep * u + deltaAt(u),
      { until: uTrim, skipLast: true, reverse: true },
    );

    // Hub arc across to the next blade, whose trailing side places both ends.
    const hubDelta = deltaAt(0);
    const from = centre + hubDelta;
    const to = centre + pitch - hubDelta;
    if (to - from > 1e-9) {
      pushEdge(
        () => hubRadius,
        (u) => from + (to - from) * u,
        { skipFirst: true, skipLast: true },
      );
    }
  }

  const ringCount = rotorRingCount(spec);
  const rings: Point2D[][] = [];
  for (let k = 0; k < ringCount; k += 1) {
    const t = ringCount === 1 ? 1 : k / (ringCount - 1);
    rings.push(
      bottom.map((_, index) => {
        const radius = radii[index];
        const u = clamp((radius - hubRadius) / span, 0, 1);
        const shifted = angles[index] + (lean * u * t) / radius;
        return { x: radius * Math.cos(shifted), y: radius * Math.sin(shifted) };
      }),
    );
  }

  return { rings, bottom: rings[0], top: rings[rings.length - 1] };
}

export function buildRotorMesh(spec: RotorSpec): Mesh {
  const { rings } = rotorOutline(spec);
  return buildExtrusion({
    rings,
    bore: boreOutline(spec),
    thicknessMm: spec.bladeHeightMm,
  });
}

export interface RotorValidation {
  ok: boolean;
  errors: Issue[];
  warnings: Issue[];
  geometry: RotorDerived | null;
}

export function validateRotor(
  input: Partial<RotorSpec> | null | undefined,
  options: { unit?: LengthUnit } = {},
): RotorValidation {
  const unit = options.unit ?? "mm";
  const spec = input ?? {};
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const shown = (value: number) => formatMeasure(value, unit);

  const tipOk = pushRange(errors, unit, "tipDiameter", "Tip diameter", spec.tipDiameterMm, ROTOR_LIMITS.tipDiameterMm.min, ROTOR_LIMITS.tipDiameterMm.max);
  const hubOk = pushRange(errors, unit, "hubDiameter", "Hub diameter", spec.hubDiameterMm, ROTOR_LIMITS.hubDiameterMm.min, ROTOR_LIMITS.hubDiameterMm.max);
  const countOk = pushInteger(errors, "bladeCount", "Blade count", spec.bladeCount, ROTOR_LIMITS.bladeCount.min, ROTOR_LIMITS.bladeCount.max);
  const rootOk = pushRange(errors, unit, "rootWidth", "Root width", spec.rootWidthMm, ROTOR_LIMITS.rootWidthMm.min, ROTOR_LIMITS.rootWidthMm.max);
  const tipWidthOk = pushRange(errors, unit, "tipWidth", "Tip width", spec.tipWidthMm, ROTOR_LIMITS.tipWidthMm.min, ROTOR_LIMITS.tipWidthMm.max);
  const roundingOk = pushRange(errors, unit, "tipRounding", "Tip rounding", spec.tipRoundingMm ?? 0, ROTOR_LIMITS.tipRoundingMm.min, ROTOR_LIMITS.tipRoundingMm.max);
  const heightOk = pushRange(errors, unit, "bladeHeight", "Blade height", spec.bladeHeightMm, ROTOR_LIMITS.bladeHeightMm.min, ROTOR_LIMITS.bladeHeightMm.max);
  const angleOk = pushRange(errors, unit, "bladeAngle", "Blade angle", spec.bladeAngleDeg, ROTOR_LIMITS.bladeAngleDeg.min, ROTOR_LIMITS.bladeAngleDeg.max);
  const sweepOk = pushRange(errors, unit, "bladeSweep", "Blade sweep", spec.bladeSweepDeg, ROTOR_LIMITS.bladeSweepDeg.min, ROTOR_LIMITS.bladeSweepDeg.max);
  const boreOk = pushRange(errors, unit, "bore", "Centre hole", spec.boreMm, ROTOR_LIMITS.boreMm.min, ROTOR_LIMITS.boreMm.max);

  const complete =
    tipOk &&
    hubOk &&
    countOk &&
    rootOk &&
    tipWidthOk &&
    roundingOk &&
    heightOk &&
    angleOk &&
    sweepOk &&
    boreOk;

  let geometry: RotorDerived | null = null;

  if (complete) {
    const full = spec as RotorSpec;
    geometry = deriveRotor(full);
    const derived = geometry;

    if (full.hubDiameterMm >= full.tipDiameterMm - 1) {
      errors.push({
        field: "hubDiameter",
        level: "error",
        message: "The hub must be smaller than the tip circle so the blades have somewhere to go.",
      });
    }

    if (derived.minPassageMm < MIN_FEATURE_MM - 1e-9) {
      errors.push({
        field: "rootWidth",
        level: "error",
        message:
          derived.minPassageMm <= 0
            ? "The blades overlap — narrow them or reduce the blade count."
            : `Only ${shown(derived.minPassageMm)} is left between blades; keep at least ${shown(MIN_FEATURE_MM)}.`,
      });
    }

    if (derived.leanMm > derived.leanLimitMm + 1e-9) {
      errors.push({
        field: "bladeAngle",
        level: "error",
        message: `At this height a ${formatNumber(derived.bladeAngleDeg, 0)}° blade leans ${shown(
          derived.leanMm,
        )}, far enough to meet its neighbour (${shown(derived.leanLimitMm)} is the limit). Lower the blade height or the angle.`,
      });
    }

    if (derived.hubWallMm < MIN_WALL_MM - 1e-9) {
      errors.push({
        field: "bore",
        level: "error",
        message:
          derived.hubWallMm <= 0
            ? "The centre hole is wider than the hub — there would be nothing left to hold the blades."
            : `Only ${shown(derived.hubWallMm)} of hub is left around the bore; keep at least ${shown(MIN_WALL_MM)}.`,
      });
    }

    if (!derived.fitsBuildVolume) {
      const widthBlocked = derived.tipRadiusMm * 2 > BUILD_VOLUME_MM.x + 1e-9;
      errors.push({
        field: widthBlocked ? "tipDiameter" : "bladeHeight",
        level: "error",
        message: widthBlocked
          ? `${shown(derived.tipRadiusMm * 2)} across does not fit the 180 × 180 × 180 mm build volume.`
          : `${shown(derived.heightMm)} tall does not fit the 180 × 180 × 180 mm build volume.`,
      });
    }

    if (derived.bladeCount < 3) {
      warnings.push({
        field: "bladeCount",
        level: "warning",
        message: "Two blades balance poorly at speed; three or more runs smoother.",
      });
    }
    if (derived.pitchMm > derived.tipRadiusMm * 3) {
      warnings.push({
        field: "bladeAngle",
        level: "warning",
        message: "A pitch this coarse relative to the disc stalls; try a finer pitch.",
      });
    }
    if ((full.tipRoundingMm ?? 0) > derived.tipRoundingMm + 1e-6) {
      warnings.push({
        field: "tipRounding",
        level: "warning",
        message: `The tip chord caps the end rounding at ${shown(derived.tipRoundingMm)}.`,
      });
    }
    if (derived.meanWidthMm < 2) {
      warnings.push({
        field: "tipWidth",
        level: "warning",
        message: "Blades under 2 mm wide are fragile in a printed part.",
      });
    }
    if (derived.leanMm > derived.leanLimitMm * 0.8) {
      warnings.push({
        field: "bladeAngle",
        level: "warning",
        message: "The blades lean close to their neighbours — check the gaps before printing.",
      });
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    geometry: errors.length === 0 ? geometry : null,
  };
}

/** Short human code for the preview header. */
export function rotorCode(spec: RotorSpec, prefix: string): string {
  return `${prefix}${formatNumber(spec.tipDiameterMm, 0)}-${Math.round(spec.bladeCount)}`;
}

/** Pitch angle (degrees) that gives the requested advance per revolution at 70 % radius. */
export function bladeAngleForPitch(pitchMm: number, tipDiameterMm: number): number {
  const radius = Math.max(1, tipDiameterMm * 0.35);
  return (Math.atan(pitchMm / (TWO_PI * radius)) * 180) / Math.PI;
}
