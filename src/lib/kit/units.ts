/**
 * Shared units, outlines and validation helpers.
 *
 * Every designer measures in millimetres internally and converts at the edge of
 * the interface, so geometry never has to know which unit the form is showing.
 */

export const MM_PER_INCH = 25.4;
export const TWO_PI = Math.PI * 2;

/** Minimum material left between a hole and the outside of a part. */
export const MIN_WALL_MM = 1.6;
/** How far a chord may stray from the curve it replaces. */
export const CURVE_TOLERANCE_MM = 0.02;
/** Smallest gap or land the app models as a distinct feature. */
export const MIN_FEATURE_MM = 0.8;

export type LengthUnit = "mm" | "in";
export type BoreShape = "round" | "hex" | "doubleFlat";

export interface Point2D {
  x: number;
  y: number;
}

export const BORE_SHAPES: Record<BoreShape, { label: string; description: string }> = {
  round: { label: "Round", description: "Plain shaft bore." },
  hex: { label: "Hex", description: "Six flats drive a hex shaft." },
  doubleFlat: {
    label: "Double flat",
    description: "Two flats for a D-shaft or a grub screw.",
  },
};

export const BORE_SHAPE_ORDER: BoreShape[] = ["round", "hex", "doubleFlat"];

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

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

export function signedArea(points: Point2D[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2;
}

export function polygonArea(points: Point2D[]): number {
  return Math.abs(signedArea(points));
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
 * The centre hole, scaled so a hex or double-flat bore still fits inside the
 * entered bore diameter. Every outline is counter-clockwise.
 */
export function boreOutline(spec: { boreMm: number; boreShape: BoreShape }): Point2D[] {
  const radius = Math.max(0.05, spec.boreMm / 2);
  if (spec.boreShape === "hex") {
    const points: Point2D[] = [];
    for (let i = 0; i < 6; i += 1) {
      const angle = (i / 6) * TWO_PI + Math.PI / 6;
      points.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
    }
    return points;
  }
  if (spec.boreShape === "doubleFlat") {
    const flatHalf = radius * 0.78;
    const y = Math.sqrt(Math.max(0, radius * radius - flatHalf * flatHalf));
    const a0 = Math.acos(Math.min(1, flatHalf / radius));
    const arcSteps = 24;
    const points: Point2D[] = [
      { x: flatHalf, y: -y },
      { x: flatHalf, y },
    ];
    for (let i = 1; i <= arcSteps; i += 1) {
      const angle = a0 + ((Math.PI - 2 * a0) * i) / arcSteps;
      points.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
    }
    points.push({ x: -flatHalf, y }, { x: -flatHalf, y: -y });
    for (let i = 1; i <= arcSteps; i += 1) {
      const angle = Math.PI + a0 + ((Math.PI - 2 * a0) * i) / arcSteps;
      points.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
    }
    return points;
  }
  return circleOutline(radius, circleSegments(radius));
}

/** Parses a form field, accepting the decimal comma as a decimal point. */
export function parseInput(raw: string): number | null {
  const trimmed = raw.trim().replace(/\s+/g, "").replace(/,/g, ".");
  if (trimmed === "") return null;
  if (!/^-?\d*(\.\d*)?$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

export function decimalsFor(units: LengthUnit): number {
  return units === "in" ? 4 : 2;
}

/**
 * Precision the canonical millimetre lengths are rounded to. An inch entry
 * carries 0.001 in ≈ 0.025 mm, so four decimals keep the millimetre value
 * inside a thousandth of an inch without pretending to more.
 */
export function lengthPrecisionMm(units: LengthUnit): number {
  return units === "in" ? 4 : 6;
}

/**
 * Picks parameters along a curve so no chord strays further than `toleranceMm`.
 *
 * Fixed step counts either waste triangles on the flat parts of a profile or
 * leave the curved parts visibly faceted. Subdividing until each chord's
 * midpoint sits inside the tolerance gives the same finish everywhere, and keeps
 * the STL as small as the requested smoothness allows.
 */
export function sampleCurve(
  pointAt: (u: number) => Point2D,
  toleranceMm: number,
  maxDepth = 6,
): number[] {
  const tolerance = Math.max(1e-4, toleranceMm);
  const us: number[] = [0];

  const deviationBetween = (u0: number, u1: number): number => {
    const p0 = pointAt(u0);
    const p1 = pointAt(u1);
    const pm = pointAt((u0 + u1) / 2);
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const length = Math.hypot(dx, dy);
    return length > 1e-9
      ? Math.abs((pm.x - p0.x) * dy - (pm.y - p0.y) * dx) / length
      : Math.hypot(pm.x - p0.x, pm.y - p0.y);
  };

  // Each kept segment contributes its far end only, so the list is strictly
  // increasing and the start is never repeated.
  const refine = (u0: number, u1: number, depth: number) => {
    if (depth < maxDepth && deviationBetween(u0, u1) > tolerance) {
      const um = (u0 + u1) / 2;
      refine(u0, um, depth + 1);
      refine(um, u1, depth + 1);
      return;
    }
    us.push(u1);
  };

  refine(0, 1, 0);
  return us;
}

export interface Issue {
  field: string;
  level: "error" | "warning";
  message: string;
}

function shown(valueMm: number, unit: LengthUnit): string {
  return `${formatNumber(mmToUnit(valueMm, unit), unit === "in" ? 4 : 2)} ${unit}`;
}

/** Records an error and returns false when a value is missing or out of range. */
export function pushRange(
  errors: Issue[],
  unit: LengthUnit,
  field: string,
  label: string,
  value: unknown,
  min: number,
  max: number,
): boolean {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push({
      field,
      level: "error",
      message: `Enter a ${label.toLowerCase()} between ${shown(min, unit)} and ${shown(max, unit)}.`,
    });
    return false;
  }
  if (value < min - 1e-9 || value > max + 1e-9) {
    errors.push({
      field,
      level: "error",
      message: `${label} must be between ${shown(min, unit)} and ${shown(max, unit)}.`,
    });
    return false;
  }
  return true;
}

/** Whole-number variant of pushRange, for counts and angles in degrees. */
export function pushInteger(
  errors: Issue[],
  field: string,
  label: string,
  value: unknown,
  min: number,
  max: number,
): boolean {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value)) {
    errors.push({
      field,
      level: "error",
      message: `Enter a whole number for ${label.toLowerCase()}, ${min} to ${max}.`,
    });
    return false;
  }
  if (value < min || value > max) {
    errors.push({
      field,
      level: "error",
      message: `${label} must be between ${min} and ${max}.`,
    });
    return false;
  }
  return true;
}
