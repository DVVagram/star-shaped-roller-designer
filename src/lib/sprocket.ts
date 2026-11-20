/**
 * Roller-chain sprocket geometry.
 *
 * A sprocket is a disc carrying N roller seats on a pitch circle, so the chain's
 * pitch sets the circle and the chain's roller sets the seat:
 *
 *   pitch radius   Rp = (p / 2) / sin(π / N)
 *   seat radius    rr = roller / 2 + clearance
 *   seat half arc  α  = asin(rr / Rp)
 *   seat floor     Rp − rr        root radius
 *   tip radius     Rt = Rp + tooth height above the pitch circle
 *
 * Inside one pitch the profile runs: seat arc (±α), rising flank, tip land and
 * falling flank. The seat is the part of the roller circle that faces the axis,
 * which is exactly the surface a chain roller bears on.
 */

import {
  BUILD_VOLUME_MM,
  CURVE_TOLERANCE_MM,
  MIN_FEATURE_MM,
  MIN_WALL_MM,
  TWO_PI,
  boreOutline,
  circleOutline,
  circleSegments,
  clamp,
  formatMeasure,
  formatNumber,
  lengthPrecisionMm,
  parseInput,
  pushInteger,
  pushRange,
  roundTo,
  sampleCurve,
  unitToMm,
  type BoreShape,
  type Issue,
  type LengthUnit,
  type Point2D,
} from "./kit/units";
import { buildExtrusion, type Mesh } from "./kit/solid";

export interface ChainPreset {
  id: string;
  label: string;
  pitchMm: number;
  rollerMm: number;
}

/** ANSI roller chain dimensions in millimetres. */
export const CHAIN_PRESETS: ChainPreset[] = [
  { id: "#25", label: "#25 · 1/4\"", pitchMm: 6.35, rollerMm: 3.3 },
  { id: "#35", label: "#35 · 3/8\"", pitchMm: 9.525, rollerMm: 5.08 },
  { id: "#40", label: "#40 · 1/2\"", pitchMm: 12.7, rollerMm: 7.92 },
  { id: "#50", label: "#50 · 5/8\"", pitchMm: 15.875, rollerMm: 10.16 },
];

export type ToothProfile = "standard" | "rounded" | "pointed";

export interface ToothProfilePreset {
  label: string;
  description: string;
  /** Flank curvature exponent: 1 is a straight flank. */
  exponent: number;
  /** Smoothstep flanks meet the tip and the seat with zero slope. */
  smooth: boolean;
  /** Fraction of the entered tip width the profile keeps. */
  tipFactor: number;
}

export const TOOTH_PROFILES: Record<ToothProfile, ToothProfilePreset> = {
  standard: {
    label: "Standard",
    description: "Straight flanks with a full tip land.",
    exponent: 1,
    smooth: false,
    tipFactor: 1,
  },
  rounded: {
    label: "Rounded",
    description: "S-curve flanks that blend into the tip and seat.",
    exponent: 1,
    smooth: true,
    tipFactor: 1,
  },
  pointed: {
    label: "Pointed",
    description: "Narrow gripping teeth for light loads.",
    exponent: 0.65,
    smooth: false,
    tipFactor: 0.3,
  },
};

export const TOOTH_PROFILE_ORDER: ToothProfile[] = ["standard", "rounded", "pointed"];

export interface SprocketSpec {
  pitchMm: number;
  rollerMm: number;
  teeth: number;
  clearanceMm: number;
  toothHeightMm: number;
  toothProfile: ToothProfile;
  tipWidthMm: number;
  thicknessMm: number;
  boreMm: number;
  boreShape: BoreShape;
  hubEnabled: boolean;
  hubDiameterMm: number;
  hubHeightMm: number;
}

export const SPROCKET_LIMITS = {
  pitchMm: { min: 3, max: 40 },
  rollerMm: { min: 1, max: 24 },
  teeth: { min: 6, max: 72 },
  clearanceMm: { min: 0, max: 2 },
  toothHeightMm: { min: 0.8, max: 20 },
  tipWidthMm: { min: 0, max: 14 },
  thicknessMm: { min: 1, max: 40 },
  boreMm: { min: 0.8, max: 120 },
  hubDiameterMm: { min: 3, max: 170 },
  hubHeightMm: { min: 0.4, max: 40 },
} as const;

export class SprocketGeometryError extends Error {}

function polar(angle: number, radius: number): Point2D {
  return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
}

export interface SprocketDerived {
  teeth: number;
  pitchMm: number;
  pitchRadiusMm: number;
  pitchDiameterMm: number;
  seatRadiusMm: number;
  seatHalfAngleRad: number;
  seatEdgeRadiusMm: number;
  rootRadiusMm: number;
  rootDiameterMm: number;
  tipRadiusMm: number;
  outsideDiameterMm: number;
  tipHalfAngleRad: number;
  tipLandMm: number;
  toothDepthMm: number;
  pitchAngleDeg: number;
  flankLengthMm: number;
  boreRadiusMm: number;
  rimWidthMm: number;
  hubEnabled: boolean;
  hubRadiusMm: number;
  hubHeightMm: number;
  thicknessMm: number;
  totalHeightMm: number;
  circumferenceMm: number;
  fitsBuildVolume: boolean;
  feasible: boolean;
  limitingFactor: string | null;
}

export function deriveSprocket(spec: SprocketSpec): SprocketDerived {
  const teeth = Math.max(3, Math.round(spec.teeth));
  const pitch = Math.max(0.5, spec.pitchMm);
  const pitchRadius = pitch / 2 / Math.max(1e-6, Math.sin(Math.PI / teeth));
  const seatRadius = Math.max(0.1, spec.rollerMm / 2 + Math.max(0, spec.clearanceMm));
  const seatHalf = Math.asin(clamp(seatRadius / pitchRadius, 0, 1));
  const seatEdge = Math.sqrt(Math.max(0, pitchRadius * pitchRadius - seatRadius * seatRadius));
  const tipRadius = pitchRadius + Math.max(0.1, spec.toothHeightMm);
  const profile = TOOTH_PROFILES[spec.toothProfile] ?? TOOTH_PROFILES.standard;
  const tipLand = Math.max(0, spec.tipWidthMm) * profile.tipFactor;
  const tipHalf = tipRadius > 0 ? tipLand / 2 / tipRadius : 0;
  const halfPitch = Math.PI / teeth;
  const flankSpan = halfPitch - seatHalf - tipHalf;
  const flankLength = Math.max(0, flankSpan) * (seatEdge + tipRadius) * 0.5;
  const rootRadius = pitchRadius - seatRadius;
  const boreRadius = Math.max(0.02, spec.boreMm / 2);
  const hubEnabled = Boolean(spec.hubEnabled);
  const hubRadius = hubEnabled ? Math.max(0, spec.hubDiameterMm / 2) : 0;
  const totalHeight = spec.thicknessMm + (hubEnabled ? Math.max(0, spec.hubHeightMm) : 0);

  let limitingFactor: string | null = null;
  if (flankSpan <= 0.002) limitingFactor = "the space between the roller seats";
  else if (flankLength < MIN_FEATURE_MM * 0.6) limitingFactor = "the flank length";

  return {
    teeth,
    pitchMm: pitch,
    pitchRadiusMm: pitchRadius,
    pitchDiameterMm: pitchRadius * 2,
    seatRadiusMm: seatRadius,
    seatHalfAngleRad: seatHalf,
    seatEdgeRadiusMm: seatEdge,
    rootRadiusMm: rootRadius,
    rootDiameterMm: rootRadius * 2,
    tipRadiusMm: tipRadius,
    outsideDiameterMm: tipRadius * 2,
    tipHalfAngleRad: tipHalf,
    tipLandMm: tipLand,
    toothDepthMm: tipRadius - rootRadius,
    pitchAngleDeg: 360 / teeth,
    flankLengthMm: flankLength,
    boreRadiusMm: boreRadius,
    rimWidthMm: rootRadius - boreRadius,
    hubEnabled,
    hubRadiusMm: hubRadius,
    hubHeightMm: hubEnabled ? Math.max(0, spec.hubHeightMm) : 0,
    thicknessMm: spec.thicknessMm,
    totalHeightMm: totalHeight,
    circumferenceMm: TWO_PI * pitchRadius,
    fitsBuildVolume:
      tipRadius * 2 <= BUILD_VOLUME_MM.x + 1e-9 &&
      totalHeight <= BUILD_VOLUME_MM.z + 1e-9,
    feasible: limitingFactor === null && rootRadius > 0.2,
    limitingFactor: rootRadius > 0.2 ? limitingFactor : "the roller seat depth",
  };
}

/**
 * One closed counter-clockwise outline around every tooth.
 *
 * Each feature (seat arc, flank, tip land) is sampled until its chords sit
 * within `CURVE_TOLERANCE_MM` of the real curve, so the drawn and printed
 * profile is the calculated one at every tooth count and tooth size.
 */
export function sprocketOutline(spec: SprocketSpec): Point2D[] {
  const derived = deriveSprocket(spec);
  if (!derived.feasible) {
    throw new SprocketGeometryError(
      "The teeth do not fit around this pitch circle — add teeth or shorten the tip land.",
    );
  }
  const { teeth, pitchRadiusMm: R, seatRadiusMm: seat } = derived;
  const pitch = TWO_PI / teeth;
  const halfPitch = pitch / 2;
  const half = derived.seatHalfAngleRad;
  const tipHalf = derived.tipHalfAngleRad;
  const tipRadius = derived.tipRadiusMm;
  const edge = derived.seatEdgeRadiusMm;
  const span = halfPitch - half - tipHalf;
  const profile = TOOTH_PROFILES[spec.toothProfile] ?? TOOTH_PROFILES.standard;
  const ease = (u: number) =>
    profile.smooth ? u * u * (3 - 2 * u) : Math.pow(u, profile.exponent);

  /** Radius of the roller seat at angular offset `delta` from the tooth centre. */
  const seatAt = (centre: number, u: number) => {
    const delta = -half + 2 * half * u;
    const sin = Math.sin(delta);
    const radius = Math.max(
      0.05,
      R * Math.cos(delta) - Math.sqrt(Math.max(0, seat * seat - R * R * sin * sin)),
    );
    return polar(centre + delta, radius);
  };
  const flankAt = (centre: number, u: number) =>
    polar(centre + half + u * span, edge + (tipRadius - edge) * ease(u));
  const tipAt = (centre: number, u: number) =>
    polar(centre + halfPitch - tipHalf + 2 * tipHalf * u, tipRadius);
  const fallAt = (centre: number, u: number) =>
    polar(
      centre + halfPitch + tipHalf + (1 - u) * span,
      edge + (tipRadius - edge) * ease(u),
    );

  const points: Point2D[] = [];

  for (let i = 0; i < teeth; i += 1) {
    const centre = i * pitch;

    // The previous tooth's flank already placed the seat's first vertex, so the
    // seat is sampled without its opening point and closes without a repeat.
    const seatPoints = sampleCurve(
      (u) => seatAt(centre, u),
      CURVE_TOLERANCE_MM,
      7,
    ).map((u) => seatAt(centre, u));
    for (let j = 1; j < seatPoints.length; j += 1) points.push(seatPoints[j]);

    // Rising flank: its first point is the seat's last vertex, its last point
    // is the start of the tip land.
    const flankPoints = sampleCurve(
      (u) => flankAt(centre, u),
      CURVE_TOLERANCE_MM,
      7,
    ).map((u) => flankAt(centre, u));
    for (let j = 1; j < flankPoints.length; j += 1) points.push(flankPoints[j]);

    // Tip land. A tooth narrowed to a point has no land: the flank's last point
    // is the apex and the falling flank starts from the next sample down, so no
    // vertex is repeated.
    if (tipHalf > 1e-9) {
      const tipPoints = sampleCurve(
        (u) => tipAt(centre, u),
        CURVE_TOLERANCE_MM,
      ).map((u) => tipAt(centre, u));
      for (let j = 1; j < tipPoints.length; j += 1) points.push(tipPoints[j]);
    }

    // Falling flank: back down to the seat of the next tooth, whose first vertex
    // this last point places.
    const fallPoints = sampleCurve(
      (u) => fallAt(centre, u),
      CURVE_TOLERANCE_MM,
      7,
    ).map((u) => fallAt(centre, u));
    for (let j = fallPoints.length - 2; j >= 0; j -= 1) points.push(fallPoints[j]);
  }

  return points;
}

export function buildSprocketMesh(spec: SprocketSpec): Mesh {
  const outline = sprocketOutline(spec);
  const hubRadius = spec.hubEnabled ? Math.max(0, spec.hubDiameterMm / 2) : 0;
  return buildExtrusion({
    rings: [outline, outline],
    bore: boreOutline(spec),
    thicknessMm: spec.thicknessMm,
    hub:
      hubRadius > 0 && spec.hubHeightMm > 0
        ? {
            outline: circleOutline(hubRadius, circleSegments(hubRadius)),
            heightMm: spec.hubHeightMm,
          }
        : null,
  });
}

export interface SprocketValidation {
  ok: boolean;
  errors: Issue[];
  warnings: Issue[];
  geometry: SprocketDerived | null;
}

export function validateSprocket(
  input: Partial<SprocketSpec> | null | undefined,
  options: { unit?: LengthUnit } = {},
): SprocketValidation {
  const unit = options.unit ?? "mm";
  const spec = input ?? {};
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const shown = (value: number) => formatMeasure(value, unit);

  const pitchOk = pushRange(errors, unit, "pitch", "Chain pitch", spec.pitchMm, SPROCKET_LIMITS.pitchMm.min, SPROCKET_LIMITS.pitchMm.max);
  const rollerOk = pushRange(errors, unit, "roller", "Roller diameter", spec.rollerMm, SPROCKET_LIMITS.rollerMm.min, SPROCKET_LIMITS.rollerMm.max);
  const clearanceOk = pushRange(errors, unit, "clearance", "Seat clearance", spec.clearanceMm, SPROCKET_LIMITS.clearanceMm.min, SPROCKET_LIMITS.clearanceMm.max);
  const heightOk = pushRange(errors, unit, "toothHeight", "Tooth height", spec.toothHeightMm, SPROCKET_LIMITS.toothHeightMm.min, SPROCKET_LIMITS.toothHeightMm.max);
  const tipOk = pushRange(errors, unit, "tipWidth", "Tip width", spec.tipWidthMm, SPROCKET_LIMITS.tipWidthMm.min, SPROCKET_LIMITS.tipWidthMm.max);
  const thicknessOk = pushRange(errors, unit, "thickness", "Thickness", spec.thicknessMm, SPROCKET_LIMITS.thicknessMm.min, SPROCKET_LIMITS.thicknessMm.max);
  const boreOk = pushRange(errors, unit, "bore", "Centre hole", spec.boreMm, SPROCKET_LIMITS.boreMm.min, SPROCKET_LIMITS.boreMm.max);
  const teethOk = pushInteger(errors, "teeth", "Teeth", spec.teeth, SPROCKET_LIMITS.teeth.min, SPROCKET_LIMITS.teeth.max);

  if (spec.hubEnabled) {
    pushRange(errors, unit, "hubDiameter", "Hub diameter", spec.hubDiameterMm, SPROCKET_LIMITS.hubDiameterMm.min, SPROCKET_LIMITS.hubDiameterMm.max);
    pushRange(errors, unit, "hubHeight", "Hub height", spec.hubHeightMm, SPROCKET_LIMITS.hubHeightMm.min, SPROCKET_LIMITS.hubHeightMm.max);
  }

  const complete =
    pitchOk && rollerOk && clearanceOk && heightOk && tipOk && thicknessOk && boreOk && teethOk;

  let geometry: SprocketDerived | null = null;

  if (complete) {
    const full = spec as SprocketSpec;
    geometry = deriveSprocket(full);
    const derived = geometry;

    if (derived.seatRadiusMm >= derived.pitchRadiusMm) {
      errors.push({
        field: "roller",
        level: "error",
        message: `A ${shown(full.rollerMm)} roller plus clearance is wider than the ${shown(
          derived.pitchDiameterMm,
        )} pitch circle — add teeth or use a smaller chain.`,
      });
    } else if (!derived.feasible) {
      errors.push({
        field: "teeth",
        level: "error",
        message: `${derived.teeth} teeth run out of ${derived.limitingFactor ?? "room"} — shorten the tip land, reduce the tooth height or add teeth.`,
      });
    }

    if (derived.rootRadiusMm <= 0.5) {
      errors.push({
        field: "roller",
        level: "error",
        message: "The roller seats meet at the axis, leaving no disc — add teeth or use a smaller roller.",
      });
    }

    if (derived.rimWidthMm < MIN_WALL_MM - 1e-9) {
      errors.push({
        field: "bore",
        level: "error",
        message:
          derived.rimWidthMm <= 0
            ? "The centre hole is wider than the root circle — there would be no sprocket left."
            : `A ${shown(derived.boreRadiusMm * 2)} bore leaves only ${shown(
                derived.rimWidthMm,
              )} of rim; keep at least ${shown(MIN_WALL_MM)}.`,
      });
    }

    if (derived.toothDepthMm < 1) {
      errors.push({
        field: "toothHeight",
        level: "error",
        message: "The teeth need at least 1 mm of depth to hold the chain.",
      });
    }

    if (derived.hubEnabled) {
      const hubLimit = derived.rootRadiusMm * 2 * 0.85;
      if (full.hubDiameterMm > hubLimit + 1e-9) {
        errors.push({
          field: "hubDiameter",
          level: "error",
          message: `The hub must stay inside the root circle (${shown(hubLimit)} at most) so it does not cut into the teeth.`,
        });
      }
      if (derived.hubRadiusMm - derived.boreRadiusMm < MIN_WALL_MM - 1e-9) {
        errors.push({
          field: "hubDiameter",
          level: "error",
          message: `The hub wall is only ${shown(
            Math.max(0, derived.hubRadiusMm - derived.boreRadiusMm),
          )}; keep at least ${shown(MIN_WALL_MM)} around the bore.`,
        });
      }
    }

    if (!derived.fitsBuildVolume) {
      const widthBlocked = derived.outsideDiameterMm > BUILD_VOLUME_MM.x + 1e-9;
      errors.push({
        field: widthBlocked ? "pitch" : "thickness",
        level: "error",
        message: widthBlocked
          ? `${shown(derived.outsideDiameterMm)} across does not fit the 180 × 180 × 180 mm build volume.`
          : `${shown(derived.totalHeightMm)} tall (wheel plus hub) does not fit the 180 × 180 × 180 mm build volume.`,
      });
    }

    if (derived.teeth < 9) {
      warnings.push({
        field: "teeth",
        level: "warning",
        message: "Under nine teeth the chain runs rough and the linkage wears quickly.",
      });
    }
    if (full.clearanceMm < 0.05) {
      warnings.push({
        field: "clearance",
        level: "warning",
        message: "No seat clearance means a printed chain will bind; 0.1 mm or more is safer.",
      });
    }
    if (derived.tipLandMm < MIN_FEATURE_MM) {
      warnings.push({
        field: "tipWidth",
        level: "warning",
        message: "Pointed teeth chip; a tip land of about 1 mm survives printing better.",
      });
    }
    if (full.thicknessMm < 3) {
      warnings.push({
        field: "thickness",
        level: "warning",
        message: "Thin sprockets deflect under chain load — 4 mm or more is safer.",
      });
    }
    if (derived.teeth > 48) {
      warnings.push({
        field: "teeth",
        level: "warning",
        message: "Above 48 teeth the pitch is fine enough that a printed chain may skip.",
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

export function sprocketCode(spec: SprocketSpec): string {
  return `SP${spec.teeth}-${formatNumber(spec.pitchMm, 2)}`;
}

/* ------------------------------------------------------------------ builder */

export type SprocketField =
  | "pitch"
  | "roller"
  | "teeth"
  | "toothHeight"
  | "clearance"
  | "tipWidth"
  | "thickness"
  | "bore"
  | "hubDiameter"
  | "hubHeight";

export const SPROCKET_LENGTH_FIELDS: SprocketField[] = [
  "pitch",
  "roller",
  "toothHeight",
  "clearance",
  "tipWidth",
  "thickness",
  "bore",
  "hubDiameter",
  "hubHeight",
];

export function sprocketDefaultValues(): Record<SprocketField, string> {
  return {
    pitch: "12.7",
    roller: "7.92",
    teeth: "18",
    toothHeight: "5.7",
    clearance: "0.15",
    tipWidth: "2",
    thickness: "8",
    bore: "8",
    hubDiameter: "30",
    hubHeight: "6",
  };
}

export interface SprocketFormOptions {
  toothProfile: ToothProfile;
  boreShape: BoreShape;
  hubEnabled: boolean;
}

/** Parses form strings into a millimetre spec. */
export function buildSprocketSpec(
  values: Record<SprocketField, string>,
  units: LengthUnit,
  options: SprocketFormOptions,
): { spec: Partial<SprocketSpec>; complete: boolean } {
  const length = (field: SprocketField): number | undefined => {
    const parsed = parseInput(values[field]);
    return parsed === null
      ? undefined
      : roundTo(unitToMm(parsed, units), lengthPrecisionMm(units));
  };
  const teeth = parseInput(values.teeth);

  const spec: Partial<SprocketSpec> = {
    pitchMm: length("pitch"),
    rollerMm: length("roller"),
    teeth: teeth !== null && Number.isInteger(teeth) ? teeth : undefined,
    clearanceMm: length("clearance"),
    toothHeightMm: length("toothHeight"),
    toothProfile: options.toothProfile,
    tipWidthMm: length("tipWidth"),
    thicknessMm: length("thickness"),
    boreMm: length("bore"),
    boreShape: options.boreShape,
    hubEnabled: options.hubEnabled,
    hubDiameterMm: length("hubDiameter"),
    hubHeightMm: length("hubHeight"),
  };

  const complete =
    spec.pitchMm !== undefined &&
    spec.rollerMm !== undefined &&
    spec.teeth !== undefined &&
    spec.clearanceMm !== undefined &&
    spec.toothHeightMm !== undefined &&
    spec.tipWidthMm !== undefined &&
    spec.thicknessMm !== undefined &&
    spec.boreMm !== undefined &&
    spec.hubDiameterMm !== undefined &&
    spec.hubHeightMm !== undefined;

  return { spec, complete };
}

export const SPROCKET_DEFAULT_SPEC: SprocketSpec = buildSprocketSpec(
  sprocketDefaultValues(),
  "mm",
  { toothProfile: "standard", boreShape: "round", hubEnabled: false },
).spec as SprocketSpec;
