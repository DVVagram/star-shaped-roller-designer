/**
 * Star-spiked roller geometry.
 *
 * Every length in this module is millimetres, measured around the wheel's axis:
 *
 *   tip diameter      D  — across the points
 *   valley diameter   d  =  D − 2 · spike depth   (the core between the spikes)
 *   tip radius        R  =  D / 2
 *   valley radius     r  =  R − depth
 *
 * One spike owns one pitch of 2π / N. Inside that pitch the profile spends an
 * angular slice on a flat tip land, another slice on a flat valley land, and the
 * remainder climbing a flank from r to R. Because the lands are entered in
 * millimetres, the number of spikes a wheel can carry before those features
 * collide is pure arithmetic — which is what lets the builder fit as many points
 * as the dimensions allow.
 */

export const MM_PER_INCH = 25.4;
export const TWO_PI = Math.PI * 2;

/** Bambu Lab A1 Mini build volume, matching the other designers in this family. */
export const BUILD_VOLUME_MM = { x: 180, y: 180, z: 180 } as const;

/** Minimum radial wall left between the centre hole and the valley floor. */
export const MIN_WALL_MM = 1.6;
/** Smallest flat land the app calls printable. */
export const MIN_FEATURE_MM = 0.8;
/** Shortest flank, measured along the flank, that still prints cleanly. */
export const MIN_FLANK_MM = 0.75;
/** A spike needs at least this fraction of its height available as base width. */
export const BASE_TO_DEPTH_RATIO = 0.45;
/** Smallest spike height the profile will build. */
export const MIN_SPIKE_HEIGHT_MM = 0.5;

export const LIMITS = {
  outerDiameterMm: { min: 20, max: 180 },
  thicknessMm: { min: 1, max: 60 },
  spikeCount: { min: 3, max: 96 },
  spikeDepthMm: { min: 0.5, max: 80 },
  tipWidthMm: { min: 0, max: 40 },
  valleyWidthMm: { min: 0, max: 30 },
  taperMm: { min: 0, max: 40 },
  boreMm: { min: 0.8, max: 120 },
  hubDiameterMm: { min: 3, max: 170 },
  hubHeightMm: { min: 0.4, max: 60 },
} as const;

export type LengthUnit = "mm" | "in";
export type SpikeShape = "rounded" | "truncated" | "paddle" | "sharp" | "claw";
export type BoreShape = "round" | "hex" | "doubleFlat";

export interface Point2D {
  x: number;
  y: number;
}

export interface SpikeShapePreset {
  label: string;
  description: string;
  /** Fraction of the entered tip width the shape keeps as a flat tip land. */
  tipWidthFactor: number;
  /** > 1 narrows the flank near the base, < 1 sweeps it out. */
  flankExponent: number;
  /** Smoothstep flanks meet the tip and the valley with zero slope. */
  smooth: boolean;
  /**
   * Flanks are straight lines in plan, square to the tip width, with a flat tip
   * chord: the spike is a true rectangle instead of a polar profile.
   */
  straightSides?: boolean;
}

export const SPIKE_SHAPES: Record<SpikeShape, SpikeShapePreset> = {
  rounded: {
    label: "Rounded",
    description: "S-curve flanks that blend into the tip and valley.",
    tipWidthFactor: 1,
    flankExponent: 1,
    smooth: true,
  },
  truncated: {
    label: "Truncated",
    description: "Straight flanks with a flat tip land.",
    tipWidthFactor: 1,
    flankExponent: 1,
    smooth: false,
  },
  paddle: {
    label: "Rectangle",
    description: "Round core with rectangular flaps instead of points.",
    tipWidthFactor: 1,
    flankExponent: 1,
    smooth: false,
    straightSides: true,
  },
  sharp: {
    label: "Sharp",
    description: "Straight flanks meeting in a single point.",
    tipWidthFactor: 0,
    flankExponent: 1,
    smooth: false,
  },
  claw: {
    label: "Swept claw",
    description: "Concave flanks rising fast from a wide base.",
    tipWidthFactor: 0.55,
    flankExponent: 0.55,
    smooth: false,
  },
};

export const SPIKE_SHAPE_ORDER: SpikeShape[] = [
  "rounded",
  "truncated",
  "paddle",
  "sharp",
  "claw",
];

export const BORE_SHAPES: Record<BoreShape, { label: string; description: string }> = {
  round: { label: "Round", description: "Plain shaft bore." },
  hex: { label: "Hex", description: "Six flats hold a hex shaft against spinning." },
  doubleFlat: {
    label: "Double flat",
    description: "Two flats for a D-shaft or a locking grub screw.",
  },
};

export const BORE_SHAPE_ORDER: BoreShape[] = ["round", "hex", "doubleFlat"];

export interface StarSpec {
  outerDiameterMm: number;
  thicknessMm: number;
  spikeCount: number;
  spikeDepthMm: number;
  spikeShape: SpikeShape;
  tipWidthMm: number;
  valleyWidthMm: number;
  taperMm: number;
  boreMm: number;
  boreShape: BoreShape;
  hubEnabled: boolean;
  hubDiameterMm: number;
  hubHeightMm: number;
}

export type StarField =
  | "outerDiameter"
  | "thickness"
  | "spikeCount"
  | "spikeDepth"
  | "tipWidth"
  | "valleyWidth"
  | "taper"
  | "bore"
  | "hubDiameter"
  | "hubHeight";

export interface StarIssue {
  field: StarField | "general";
  level: "error" | "warning";
  message: string;
}

export class StarGeometryError extends Error {}

/* ------------------------------------------------------------------ helpers */

export function mmToUnit(valueMm: number, unit: LengthUnit): number {
  return unit === "in" ? valueMm / MM_PER_INCH : valueMm;
}

export function unitToMm(value: number, unit: LengthUnit): number {
  return unit === "in" ? value * MM_PER_INCH : value;
}

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Trim trailing zeros so 1.500 reads as "1.5". */
export function formatNumber(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return "—";
  return String(Number(value.toFixed(decimals)));
}

export function formatMeasure(
  valueMm: number,
  unit: LengthUnit,
  decimals = unit === "in" ? 3 : 2,
): string {
  return `${formatNumber(mmToUnit(valueMm, unit), decimals)} ${unit}`;
}

export function polygonArea(points: Point2D[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area) / 2;
}

export function circleOutline(radius: number, segments: number): Point2D[] {
  const points: Point2D[] = [];
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * TWO_PI;
    points.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
  }
  return points;
}

export function circleSegments(radius: number): number {
  return Math.min(256, Math.max(32, Math.ceil((TWO_PI * radius) / 0.4)));
}

/**
 * The centre hole, scaled so a hex or double-flat hole still fits inside the
 * entered bore diameter. Every outline is counter-clockwise.
 */
export function boreOutline(spec: Pick<StarSpec, "boreMm" | "boreShape">): Point2D[] {
  const radius = Math.max(0.05, spec.boreMm / 2);
  if (spec.boreShape === "hex") {
    const points: Point2D[] = [];
    const segments = 6;
    for (let i = 0; i < segments; i += 1) {
      const angle = (i / segments) * TWO_PI + Math.PI / 6;
      points.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
    }
    return points;
  }
  if (spec.boreShape === "doubleFlat") {
    const flatHalf = radius * 0.78;
    const y = Math.sqrt(Math.max(0, radius * radius - flatHalf * flatHalf));
    const a0 = Math.acos(Math.min(1, flatHalf / radius));
    const arcSteps = 24;
    // Each arc stops one step short of the far flat: that corner is pushed
    // explicitly, and repeating it would leave a zero-length wall edge and a
    // facet with no normal in the STL.
    const points: Point2D[] = [{ x: flatHalf, y: -y }, { x: flatHalf, y }];
    for (let i = 1; i < arcSteps; i += 1) {
      const angle = a0 + ((Math.PI - 2 * a0) * i) / arcSteps;
      points.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
    }
    points.push({ x: -flatHalf, y }, { x: -flatHalf, y: -y });
    for (let i = 1; i < arcSteps; i += 1) {
      const angle = Math.PI + a0 + ((Math.PI - 2 * a0) * i) / arcSteps;
      points.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
    }
    return points;
  }
  return circleOutline(radius, circleSegments(radius));
}

/* ------------------------------------------------------- spike distribution */

export interface SpikeLayout {
  pitchRad: number;
  halfPitchRad: number;
  /** Half-angle the tip land subtends at the tip radius. */
  tipHalfAngleRad: number;
  /** Widest half-angle a flank occupies — at the valley for a rectangle. */
  flankHalfAngleRad: number;
  valleyHalfAngleRad: number;
  /** Angular room left for one flank; negative means the features collide. */
  flankSpanRad: number;
  tipLandMm: number;
  valleyLandMm: number;
  /** True when the spike is a rectangle in plan rather than a polar profile. */
  straightSides: boolean;
  /** Half-width of a rectangular flap, measured square to its radius. */
  flapHalfWidthMm: number;
}

export function spikeLayout(
  spec: Pick<StarSpec, "spikeCount" | "spikeShape" | "tipWidthMm" | "valleyWidthMm">,
  tipRadius: number,
  valleyRadius: number,
): SpikeLayout {
  const preset = SPIKE_SHAPES[spec.spikeShape] ?? SPIKE_SHAPES.rounded;
  const count = Math.max(1, spec.spikeCount);
  const pitch = TWO_PI / count;
  const half = pitch / 2;
  const straight = preset.straightSides === true;
  const tipLand = Math.max(0, spec.tipWidthMm) * preset.tipWidthFactor;
  const flapHalfWidth = tipLand / 2;
  const valleyLand = Math.max(0, spec.valleyWidthMm);
  // A polar profile measures its tip land as an arc. A rectangular flap is
  // measured square to its radius, so its sides leave the valley circle at the
  // wider angle asin(halfWidth / r) — that is the angle the count has to fit.
  const tipHalf = straight
    ? Math.asin(Math.min(1, tipRadius > 0 ? flapHalfWidth / tipRadius : 1))
    : tipRadius > 0
      ? tipLand / (2 * tipRadius)
      : 0;
  const flankHalf = straight
    ? Math.asin(Math.min(1, valleyRadius > 0 ? flapHalfWidth / valleyRadius : 1))
    : tipHalf;
  const valleyHalf = valleyRadius > 0 ? valleyLand / (2 * valleyRadius) : 0;

  return {
    pitchRad: pitch,
    halfPitchRad: half,
    tipHalfAngleRad: tipHalf,
    flankHalfAngleRad: flankHalf,
    valleyHalfAngleRad: valleyHalf,
    flankSpanRad: half - flankHalf - valleyHalf,
    tipLandMm: straight ? 2 * flapHalfWidth : tipLand,
    valleyLandMm: valleyLand,
    straightSides: straight,
    flapHalfWidthMm: flapHalfWidth,
  };
}

export interface SpikeFitInput {
  outerDiameterMm: number;
  spikeDepthMm: number;
  tipWidthMm: number;
  valleyWidthMm: number;
  spikeShape: SpikeShape;
}

export interface CountEvaluation {
  ok: boolean;
  /** Why this count does not fit, worded for the interface. */
  limitedBy: string | null;
}

/**
 * Decides whether a spike count can be built in the given dimensions. Four
 * independent limits apply, and each is reported with the feature it breaks.
 */
export function evaluateSpikeCount(
  fit: SpikeFitInput,
  count: number,
): CountEvaluation {
  const tipRadius = fit.outerDiameterMm / 2;
  const valleyRadius = tipRadius - fit.spikeDepthMm;

  if (!(tipRadius > 0) || !(valleyRadius > 0) || count < LIMITS.spikeCount.min) {
    return { ok: false, limitedBy: "the wheel dimensions" };
  }

  const layout = spikeLayout({ ...fit, spikeCount: count }, tipRadius, valleyRadius);

  if (layout.straightSides) {
    const halfWidth = layout.flapHalfWidthMm;
    if (!(halfWidth > 0) || halfWidth >= valleyRadius) {
      return { ok: false, limitedBy: "the flap width" };
    }
    if (layout.flankSpanRad <= 0.004) {
      return { ok: false, limitedBy: "spike spacing" };
    }
    // A flap's sides are parallel, so what matters is how far it reaches out of
    // the core and whether the flap itself is thick enough to print.
    const baseX = Math.sqrt(valleyRadius * valleyRadius - halfWidth * halfWidth);
    const tipX = Math.sqrt(tipRadius * tipRadius - halfWidth * halfWidth);
    if (tipX - baseX < MIN_FLANK_MM) {
      return { ok: false, limitedBy: "flank length" };
    }
    if (layout.tipLandMm < 2 * MIN_FEATURE_MM) {
      return { ok: false, limitedBy: "the flap width" };
    }
    const flapTipLandArc = 2 * layout.tipHalfAngleRad * tipRadius;
    if (layout.pitchRad * tipRadius - flapTipLandArc < MIN_FEATURE_MM) {
      return { ok: false, limitedBy: "the gap between the tips" };
    }
    return { ok: true, limitedBy: null };
  }

  if (layout.flankSpanRad <= 0.004) {
    return { ok: false, limitedBy: "spike spacing" };
  }

  const midRadius = (tipRadius + valleyRadius) / 2;
  if (layout.flankSpanRad * midRadius < MIN_FLANK_MM) {
    return { ok: false, limitedBy: "flank length" };
  }

  const tipLandArc = 2 * layout.tipHalfAngleRad * tipRadius;
  if (layout.pitchRad * tipRadius - tipLandArc < MIN_FEATURE_MM) {
    return { ok: false, limitedBy: "the gap between the tips" };
  }

  const valleyLandArc = 2 * layout.valleyHalfAngleRad * valleyRadius;
  const baseArc = layout.pitchRad * valleyRadius - valleyLandArc;
  const requiredBase = Math.max(
    BASE_TO_DEPTH_RATIO * fit.spikeDepthMm,
    2 * MIN_FEATURE_MM,
  );
  if (baseArc < requiredBase) {
    return { ok: false, limitedBy: "spike base width" };
  }

  return { ok: true, limitedBy: null };
}

export interface SpikeFit {
  count: number;
  /** What stops one more spike from fitting; null when already at the ceiling. */
  limitedBy: string | null;
}

/** The largest spike count that still builds cleanly in these dimensions. */
export function autoSpikeCount(fit: SpikeFitInput): SpikeFit {
  for (let count = LIMITS.spikeCount.max; count >= LIMITS.spikeCount.min; count -= 1) {
    if (evaluateSpikeCount(fit, count).ok) {
      const blocked = count < LIMITS.spikeCount.max
        ? evaluateSpikeCount(fit, count + 1).limitedBy
        : null;
      return { count, limitedBy: blocked };
    }
  }
  return { count: LIMITS.spikeCount.min, limitedBy: "the wheel dimensions" };
}

/* ---------------------------------------------------------------- derivation */

export interface DerivedStar {
  spikeCount: number;
  tipDiameterMm: number;
  valleyDiameterMm: number;
  tipRadiusMm: number;
  valleyRadiusMm: number;
  topTipRadiusMm: number;
  topValleyRadiusMm: number;
  spikeHeightMm: number;
  pitchAngleRad: number;
  pitchAngleDeg: number;
  tipLandMm: number;
  valleyLandMm: number;
  spikeBaseArcMm: number;
  flankLengthMm: number;
  boreRadiusMm: number;
  boreInscribedRadiusMm: number;
  hubEnabled: boolean;
  hubRadiusMm: number;
  hubHeightMm: number;
  thicknessMm: number;
  taperMm: number;
  totalHeightMm: number;
  fitsBuildVolume: boolean;
  feasible: boolean;
  limitingFactor: string | null;
  maxSpikeCount: number;
  maxSpikeLimit: string | null;
}

export function deriveStar(spec: StarSpec): DerivedStar {
  const tipRadius = Math.max(0.05, spec.outerDiameterMm / 2);
  const valleyRadius = Math.max(0.02, tipRadius - spec.spikeDepthMm);
  const layout = spikeLayout(spec, tipRadius, valleyRadius);
  const fitInput: SpikeFitInput = {
    outerDiameterMm: spec.outerDiameterMm,
    spikeDepthMm: spec.spikeDepthMm,
    tipWidthMm: spec.tipWidthMm,
    valleyWidthMm: spec.valleyWidthMm,
    spikeShape: spec.spikeShape,
  };
  const evaluation = evaluateSpikeCount(fitInput, spec.spikeCount);
  const auto = autoSpikeCount(fitInput);

  const boreRadius = Math.max(0.02, spec.boreMm / 2);
  const boreInscribedRadius =
    spec.boreShape === "hex"
      ? boreRadius * Math.cos(Math.PI / 6)
      : spec.boreShape === "doubleFlat"
        ? boreRadius * 0.78
        : boreRadius;

  const hubEnabled = Boolean(spec.hubEnabled);
  const hubRadius = hubEnabled ? Math.max(0, spec.hubDiameterMm / 2) : 0;
  const totalHeightMm =
    spec.thicknessMm + (hubEnabled ? Math.max(0, spec.hubHeightMm) : 0);
  const topTipRadius = Math.max(valleyRadius, tipRadius - Math.max(0, spec.taperMm));
  const midRadius = (tipRadius + valleyRadius) / 2;

  return {
    spikeCount: spec.spikeCount,
    tipDiameterMm: tipRadius * 2,
    valleyDiameterMm: valleyRadius * 2,
    tipRadiusMm: tipRadius,
    valleyRadiusMm: valleyRadius,
    topTipRadiusMm: topTipRadius,
    topValleyRadiusMm: valleyRadius,
    spikeHeightMm: tipRadius - valleyRadius,
    pitchAngleRad: layout.pitchRad,
    pitchAngleDeg: (layout.pitchRad * 180) / Math.PI,
    tipLandMm: layout.tipLandMm,
    valleyLandMm: layout.valleyLandMm,
    spikeBaseArcMm: layout.straightSides
      ? 2 * layout.flankHalfAngleRad * valleyRadius
      : layout.pitchRad * valleyRadius - 2 * layout.valleyHalfAngleRad * valleyRadius,
    flankLengthMm: Math.max(0, layout.flankSpanRad) * midRadius,
    boreRadiusMm: boreRadius,
    boreInscribedRadiusMm: boreInscribedRadius,
    hubEnabled,
    hubRadiusMm: hubRadius,
    hubHeightMm: hubEnabled ? Math.max(0, spec.hubHeightMm) : 0,
    thicknessMm: spec.thicknessMm,
    taperMm: Math.max(0, spec.taperMm),
    totalHeightMm,
    fitsBuildVolume:
      spec.outerDiameterMm <= BUILD_VOLUME_MM.x + 1e-9 &&
      totalHeightMm <= BUILD_VOLUME_MM.z + 1e-9,
    feasible: evaluation.ok,
    limitingFactor: evaluation.limitedBy,
    maxSpikeCount: auto.count,
    maxSpikeLimit: auto.limitedBy,
  };
}

/* ---------------------------------------------------------------- validation */

export interface StarValidation {
  ok: boolean;
  errors: StarIssue[];
  warnings: StarIssue[];
  geometry: DerivedStar | null;
}

interface ValidateOptions {
  unit?: LengthUnit;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function validateStar(
  input: Partial<StarSpec> | null | undefined,
  options: ValidateOptions = {},
): StarValidation {
  const unit = options.unit ?? "mm";
  const spec = input ?? {};
  const errors: StarIssue[] = [];
  const warnings: StarIssue[] = [];

  const shown = (valueMm: number, decimals = 2) =>
    `${formatNumber(mmToUnit(valueMm, unit), unit === "in" ? decimals + 2 : decimals)} ${unit}`;

  const range = (
    field: StarField,
    label: string,
    value: unknown,
    min: number,
    max: number,
  ) => {
    if (!isNumber(value)) {
      errors.push({
        field,
        level: "error",
        message: `Enter a ${label.toLowerCase()} between ${shown(min)} and ${shown(max)}.`,
      });
      return false;
    }
    if (value < min - 1e-9 || value > max + 1e-9) {
      errors.push({
        field,
        level: "error",
        message: `${label} must be between ${shown(min)} and ${shown(max)}.`,
      });
      return false;
    }
    return true;
  };

  const outerOk = range(
    "outerDiameter",
    "Wheel diameter",
    spec.outerDiameterMm,
    LIMITS.outerDiameterMm.min,
    LIMITS.outerDiameterMm.max,
  );
  const thicknessOk = range(
    "thickness",
    "Thickness",
    spec.thicknessMm,
    LIMITS.thicknessMm.min,
    LIMITS.thicknessMm.max,
  );
  const depthOk = range(
    "spikeDepth",
    "Spike depth",
    spec.spikeDepthMm,
    LIMITS.spikeDepthMm.min,
    LIMITS.spikeDepthMm.max,
  );
  const tipOk = range(
    "tipWidth",
    "Tip width",
    spec.tipWidthMm,
    LIMITS.tipWidthMm.min,
    LIMITS.tipWidthMm.max,
  );
  const valleyOk = range(
    "valleyWidth",
    "Valley width",
    spec.valleyWidthMm,
    LIMITS.valleyWidthMm.min,
    LIMITS.valleyWidthMm.max,
  );
  const taperOk = range(
    "taper",
    "Tip taper",
    spec.taperMm,
    LIMITS.taperMm.min,
    LIMITS.taperMm.max,
  );
  const boreOk = range("bore", "Centre hole", spec.boreMm, LIMITS.boreMm.min, LIMITS.boreMm.max);

  if (!isNumber(spec.spikeCount) || !Number.isInteger(spec.spikeCount)) {
    errors.push({
      field: "spikeCount",
      level: "error",
      message: `Enter a whole number of spikes between ${LIMITS.spikeCount.min} and ${LIMITS.spikeCount.max}.`,
    });
  } else if (
    spec.spikeCount < LIMITS.spikeCount.min ||
    spec.spikeCount > LIMITS.spikeCount.max
  ) {
    errors.push({
      field: "spikeCount",
      level: "error",
      message: `Spike count must be between ${LIMITS.spikeCount.min} and ${LIMITS.spikeCount.max}.`,
    });
  }

  if (spec.hubEnabled) {
    range(
      "hubDiameter",
      "Hub diameter",
      spec.hubDiameterMm,
      LIMITS.hubDiameterMm.min,
      LIMITS.hubDiameterMm.max,
    );
    range(
      "hubHeight",
      "Hub height",
      spec.hubHeightMm,
      LIMITS.hubHeightMm.min,
      LIMITS.hubHeightMm.max,
    );
  }

  const complete =
    outerOk &&
    thicknessOk &&
    depthOk &&
    tipOk &&
    valleyOk &&
    taperOk &&
    boreOk &&
    isNumber(spec.spikeCount) &&
    Number.isInteger(spec.spikeCount);

  let geometry: DerivedStar | null = null;

  if (complete) {
    const specFull = spec as StarSpec;
    geometry = deriveStar(specFull);
    const derived = geometry;
    const unitShown = (valueMm: number) => shown(valueMm);
    // A rectangular flap is exactly as wide as the entered tip width.
    const paddle = specFull.spikeShape === "paddle";
    const flapWidthMm = paddle ? derived.tipLandMm : 0;

    if (specFull.spikeDepthMm >= derived.tipRadiusMm - MIN_SPIKE_HEIGHT_MM) {
      errors.push({
        field: "spikeDepth",
        level: "error",
        message: `A ${unitShown(specFull.spikeDepthMm)} spike depth leaves no core: keep it below ${unitShown(
          derived.tipRadiusMm - MIN_SPIKE_HEIGHT_MM,
        )}.`,
      });
    }

    if (derived.spikeHeightMm < MIN_SPIKE_HEIGHT_MM) {
      errors.push({
        field: "spikeDepth",
        level: "error",
        message: `Spikes must stand at least ${unitShown(MIN_SPIKE_HEIGHT_MM)} proud of the valley.`,
      });
    }

    if (paddle && !(flapWidthMm > 0)) {
      errors.push({
        field: "tipWidth",
        level: "error",
        message: "Rectangular flaps need a tip width — the flap is that wide.",
      });
    } else if (paddle && flapWidthMm >= derived.valleyRadiusMm * 2) {
      errors.push({
        field: "tipWidth",
        level: "error",
        message: `A ${unitShown(flapWidthMm)} flap is wider than the ${unitShown(
          derived.valleyRadiusMm * 2,
        )} valley circle. Keep the tip width under ${unitShown(
          derived.valleyRadiusMm * 2,
        )}.`,
      });
    } else if (paddle && flapWidthMm < 2 * MIN_FEATURE_MM) {
      errors.push({
        field: "tipWidth",
        level: "error",
        message: `Flaps narrower than ${unitShown(
          2 * MIN_FEATURE_MM,
        )} will not print; widen the tip width or pick another spike shape.`,
      });
    }

    if (!derived.feasible && !(paddle && derived.limitingFactor === "the flap width")) {
      errors.push({
        field: "spikeCount",
        level: "error",
        message: `${specFull.spikeCount} spikes do not fit in this wheel — they run out of ${
          derived.limitingFactor ?? "room"
        }. Use ${derived.maxSpikeCount} spikes or fewer, or enlarge the wheel.`,
      });
    }

    if (derived.taperMm >= derived.spikeHeightMm - MIN_SPIKE_HEIGHT_MM) {
      errors.push({
        field: "taper",
        level: "error",
        message: `The taper must leave at least ${unitShown(
          MIN_SPIKE_HEIGHT_MM,
        )} of spike at the top face.`,
      });
    }

    const wall = derived.valleyRadiusMm - derived.boreRadiusMm;
    if (wall < MIN_WALL_MM - 1e-9) {
      errors.push({
        field: "bore",
        level: "error",
        message:
          wall <= 0
            ? "The centre hole is wider than the valley floor — there would be no wheel left."
            : `A ${unitShown(
                derived.boreRadiusMm * 2,
              )} centre hole leaves only ${unitShown(wall)} of material at the valley. Keep at least ${unitShown(
                MIN_WALL_MM,
              )}, or make the wheel bigger.`,
      });
    }

    if (derived.hubEnabled) {
      const hubLimit = derived.valleyRadiusMm * 2 * 0.85;
      if (specFull.hubDiameterMm > hubLimit + 1e-9) {
        errors.push({
          field: "hubDiameter",
          level: "error",
          message: `The hub must stay inside the valley circle (${unitShown(
            hubLimit,
          )} at most) so it does not cut through the spikes.`,
        });
      }
      if (derived.hubRadiusMm - derived.boreRadiusMm < MIN_WALL_MM - 1e-9) {
        errors.push({
          field: "hubDiameter",
          level: "error",
          message: `The hub wall is only ${unitShown(
            Math.max(0, derived.hubRadiusMm - derived.boreRadiusMm),
          )}; keep at least ${unitShown(MIN_WALL_MM)} around the centre hole.`,
        });
      }
    }

    if (!derived.fitsBuildVolume) {
      const widthBlocked = specFull.outerDiameterMm > BUILD_VOLUME_MM.x + 1e-9;
      errors.push({
        field: widthBlocked ? "outerDiameter" : "thickness",
        level: "error",
        message: widthBlocked
          ? `A ${unitShown(
              specFull.outerDiameterMm,
            )} wheel does not fit the 180 × 180 × 180 mm build volume.`
          : `${unitShown(
              derived.totalHeightMm,
            )} tall (wheel plus hub) does not fit the 180 × 180 × 180 mm build volume.`,
      });
    }

    // ------------------------------------------------------------- warnings
    const effectiveTipWidth = derived.tipLandMm;
    if (specFull.spikeShape !== "sharp") {
      if (effectiveTipWidth < 1) {
        warnings.push({
          field: "tipWidth",
          level: "warning",
          message: `Tips are ${formatNumber(
            mmToUnit(effectiveTipWidth, unit),
            2,
          )} ${unit} wide — thin tips chip off printed parts.`,
        });
      }
    }

    if (paddle && flapWidthMm > 0 && derived.spikeHeightMm > 4 * flapWidthMm) {
      warnings.push({
        field: "tipWidth",
        level: "warning",
        message: `Flaps ${unitShown(derived.spikeHeightMm)} tall on a ${unitShown(
          flapWidthMm,
        )} base are flexible; widen the tip width or reduce the spike depth.`,
      });
    }

    if (specFull.valleyWidthMm > 0 && specFull.valleyWidthMm < 1) {
      warnings.push({
        field: "valleyWidth",
        level: "warning",
        message:
          "Narrow valleys are stress risers and hard to print cleanly; 2 mm or more is safer.",
      });
    }

    if (specFull.spikeCount >= 36) {
      warnings.push({
        field: "spikeCount",
        level: "warning",
        message: `${specFull.spikeCount} spikes means small features — use a 0.4 mm nozzle and slow the outer walls down.`,
      });
    }

    if (specFull.thicknessMm < 2) {
      warnings.push({
        field: "thickness",
        level: "warning",
        message: "Under 2 mm thick this roller flexes and may warp.",
      });
    }

    if (derived.spikeHeightMm > derived.valleyRadiusMm * 1.4) {
      warnings.push({
        field: "spikeDepth",
        level: "warning",
        message:
          "Spikes taller than the core radius are fragile in impact; consider a shallower depth.",
      });
    }

    if (specFull.taperMm > specFull.spikeDepthMm * 0.7) {
      warnings.push({
        field: "taper",
        level: "warning",
        message: "A taper this strong leaves very little spike at the top face.",
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

/** Short human code for the current design, used in the preview header. */
export function designCode(spec: StarSpec): string {
  return `SR${formatNumber(spec.outerDiameterMm, 0)}-${spec.spikeCount}-${formatNumber(
    spec.thicknessMm,
    0,
  )}`;
}
