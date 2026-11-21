/** Small helpers shared by the prism designers. */

import {
  BUILD_VOLUME_MM,
  MIN_WALL_MM,
  boreOutline,
  formatMeasure,
  formatNumber,
  type LengthUnit,
  type Point2D,
} from "@/lib/kit/units";

import {
  previewOf,
  type DesignIssue,
  type DesignResult,
} from "./types";

export const measure = (value: number, units: LengthUnit) => formatMeasure(value, units);
export const round = (value: number, decimals = 2) => formatNumber(value, decimals);

export function checkSize(
  errors: DesignIssue[],
  units: LengthUnit,
  field: string,
  diameterMm: number,
  heightMm: number,
): boolean {
  let ok = true;
  if (diameterMm > BUILD_VOLUME_MM.x + 1e-9) {
    errors.push({
      field,
      level: "error",
      message: `${measure(diameterMm, units)} across does not fit the 180 mm bed.`,
    });
    ok = false;
  }
  if (heightMm > BUILD_VOLUME_MM.z + 1e-9) {
    errors.push({
      field,
      level: "error",
      message: `${measure(heightMm, units)} tall does not fit the 180 mm build height.`,
    });
    ok = false;
  }
  return ok;
}

export function checkWall(
  errors: DesignIssue[],
  units: LengthUnit,
  field: string,
  label: string,
  wallMm: number,
): boolean {
  if (wallMm < MIN_WALL_MM - 1e-9) {
    errors.push({
      field,
      level: "error",
      message: `Only ${measure(Math.max(0, wallMm), units)} of ${label}; keep at least ${measure(
        MIN_WALL_MM,
        units,
      )}.`,
    });
    return false;
  }
  return true;
}

export function boreHoles(boreMm: number): Point2D[][] {
  return [boreOutline({ boreMm, boreShape: "round" })];
}

export function circle(radius: number): Point2D[] {
  const segments = Math.max(48, Math.min(320, Math.ceil(Math.PI * 2 * radius * 4)));
  const points: Point2D[] = [];
  for (let i = 0; i < segments; i += 1) {
    const angle = (Math.PI * 2 * i) / segments;
    points.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
  }
  return points;
}

/** A round hole anywhere on the plate. */
export function circleAt(
  cx: number,
  cy: number,
  radius: number,
  segments = 40,
): Point2D[] {
  const points: Point2D[] = [];
  for (let i = 0; i < segments; i += 1) {
    const angle = (Math.PI * 2 * i) / segments;
    points.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
  }
  return points;
}

/** Evenly spaced holes on a pitch-circle diameter. */
export function boltCircle(
  count: number,
  pcdMm: number,
  holeMm: number,
  phaseRad = 0,
): Point2D[][] {
  const holes: Point2D[][] = [];
  const n = Math.max(1, Math.round(count));
  for (let i = 0; i < n; i += 1) {
    const angle = phaseRad + (Math.PI * 2 * i) / n;
    holes.push(
      circleAt(
        (pcdMm / 2) * Math.cos(angle),
        (pcdMm / 2) * Math.sin(angle),
        holeMm / 2,
      ),
    );
  }
  return holes;
}

/** A rectangular grid of holes, centred on the origin. */
export function holeGrid(
  rows: number,
  cols: number,
  pitchXMm: number,
  pitchYMm: number,
  holeMm: number,
): Point2D[][] {
  const holes: Point2D[][] = [];
  const r = Math.max(1, Math.round(rows));
  const c = Math.max(1, Math.round(cols));
  for (let i = 0; i < r; i += 1) {
    for (let j = 0; j < c; j += 1) {
      holes.push(
        circleAt(
          (j - (c - 1) / 2) * pitchXMm,
          (i - (r - 1) / 2) * pitchYMm,
          holeMm / 2,
        ),
      );
    }
  }
  return holes;
}

/**
 * Four stacked outlines that break both outer edges with a 45° chamfer.
 * Scaling a regular outline towards its centre is an exact chamfer on the flats
 * and a close one at the corners.
 */
export function chamferRings(outline: Point2D[], thicknessMm: number, chamferMm: number): {
  rings: Point2D[][];
  fractions: number[];
} {
  const c = Math.max(0, Math.min(chamferMm, thicknessMm * 0.45));
  if (c < 1e-6) {
    return { rings: [outline, outline], fractions: [0, 1] };
  }
  let maxRadius = 0;
  for (const point of outline) maxRadius = Math.max(maxRadius, Math.hypot(point.x, point.y));
  const faceScale = Math.max(0.2, (maxRadius - c) / maxRadius);
  const shrink = (point: Point2D): Point2D => ({
    x: point.x * faceScale,
    y: point.y * faceScale,
  });
  return {
    rings: [outline.map(shrink), outline, outline, outline.map(shrink)],
    fractions: [0, c / thicknessMm, 1 - c / thicknessMm, 1],
  };
}

export function emptyResult(
  errors: DesignIssue[],
  warnings: DesignIssue[],
): DesignResult {
  return {
    errors,
    warnings,
    readout: [],
    preview: previewOf("Waiting for valid input", "—", 40, 10, [
      { label: "Width", value: "—" },
      { label: "Height", value: "—" },
      { label: "Depth", value: "—" },
    ]),
  };
}

export function pointInRing(point: Point2D, ring: Point2D[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[i];
    const b = ring[j];
    const crosses =
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function distanceToRing(point: Point2D, ring: Point2D[]): number {
  let shortest = Infinity;
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    const t =
      lengthSq < 1e-18
        ? 0
        : Math.max(
            0,
            Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq),
          );
    shortest = Math.min(
      shortest,
      Math.hypot(point.x - (a.x + dx * t), point.y - (a.y + dy * t)),
    );
  }
  return shortest;
}

/** A hole must sit inside the outline with a printable wall all round. */
export function checkHoleFits(
  errors: DesignIssue[],
  units: LengthUnit,
  field: string,
  label: string,
  centre: Point2D,
  radius: number,
  outline: Point2D[],
): boolean {
  if (!pointInRing(centre, outline)) {
    errors.push({ field, level: "error", message: `${label} falls outside the part.` });
    return false;
  }
  const clearance = distanceToRing(centre, outline) - radius;
  if (clearance < MIN_WALL_MM - 1e-9) {
    errors.push({
      field,
      level: "error",
      message: `${label} leaves ${measure(Math.max(0, clearance), units)} to the edge; keep ${measure(
        MIN_WALL_MM,
        units,
      )}.`,
    });
    return false;
  }
  return true;
}
