/**
 * Outline primitives shared by the prism designers.
 *
 * Every function returns one counter-clockwise closed loop of points in
 * millimetres. Loops never repeat their first point: the mesh builders close the
 * ring themselves.
 */

import { TWO_PI, type Point2D } from "./units";

export function polar(radius: number, angle: number): Point2D {
  return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
}

export function distance(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Removes consecutive duplicates and the repeated closing point.
 *
 * A profile that clamps a land to zero width emits the same vertex twice; those
 * repeats leave zero-length wall edges and facets with no normal.
 */
export function dedupe(points: Point2D[], eps = 1e-7): Point2D[] {
  const out: Point2D[] = [];
  for (const point of points) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    const previous = out[out.length - 1];
    if (previous && distance(previous, point) <= eps) continue;
    out.push(point);
  }
  while (out.length > 1 && distance(out[0], out[out.length - 1]) <= eps) out.pop();
  return out;
}

function distanceToSegment(point: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq < 1e-18) return distance(point, a);
  const t = Math.max(
    0,
    Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq),
  );
  return Math.hypot(point.x - (a.x + dx * t), point.y - (a.y + dy * t));
}

/**
 * Drops vertices that lie on the straight line between their neighbours.
 *
 * The cap triangulator removes collinear points, and a vertex dropped from a cap
 * but kept on the wall would leave the shell open by one edge pair. Removing
 * them from the outline first keeps the caps and the walls on the same vertices.
 */
export function dropCollinear(points: Point2D[], eps = 1e-7): Point2D[] {
  let ring = dedupe(points, eps);
  let changed = true;
  while (changed && ring.length > 3) {
    changed = false;
    const out: Point2D[] = [];
    for (let i = 0; i < ring.length; i += 1) {
      const previous = out.length > 0 ? out[out.length - 1] : ring[ring.length - 1];
      const next = ring[(i + 1) % ring.length];
      const current = ring[i];
      if (
        distance(previous, next) > eps &&
        distanceToSegment(current, previous, next) < eps
      ) {
        changed = true;
        continue;
      }
      out.push(current);
    }
    if (out.length < 3) break;
    ring = out;
  }
  return ring;
}

/** Counter-clockwise arc; the first point is included, the last is not. */
export function arcPoints(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  steps: number,
): Point2D[] {
  const count = Math.max(1, Math.round(steps));
  const points: Point2D[] = [];
  for (let i = 0; i < count; i += 1) {
    const angle = startAngle + ((endAngle - startAngle) * i) / count;
    points.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
  }
  return points;
}

/** Full circle, counter-clockwise, starting on +X. */
export function circleOutline(radius: number, segments: number): Point2D[] {
  const points: Point2D[] = [];
  const count = Math.max(8, Math.round(segments));
  for (let i = 0; i < count; i += 1) {
    points.push(polar(radius, (TWO_PI * i) / count));
  }
  return points;
}

export function segmentsForRadius(radius: number, chordTolerance = 0.05): number {
  const safe = Math.max(0.05, radius);
  const ratio = Math.max(-1, Math.min(1, 1 - chordTolerance / safe));
  const step = 2 * Math.acos(ratio);
  return Math.min(320, Math.max(24, Math.ceil(TWO_PI / Math.max(1e-4, step))));
}

/** Rounded rectangle centred on the origin, counter-clockwise. */
export function roundedRect(
  width: number,
  height: number,
  radius: number,
  stepsPerCorner = 6,
): Point2D[] {
  const halfW = width / 2;
  const halfH = height / 2;
  const r = Math.max(0, Math.min(radius, Math.min(halfW, halfH) - 1e-4));
  if (r <= 1e-6) {
    return [
      { x: -halfW, y: -halfH },
      { x: halfW, y: -halfH },
      { x: halfW, y: halfH },
      { x: -halfW, y: halfH },
    ];
  }
  const points: Point2D[] = [];
  const corners: [number, number, number][] = [
    [halfW - r, -halfH + r, -Math.PI / 2],
    [halfW - r, halfH - r, 0],
    [-halfW + r, halfH - r, Math.PI / 2],
    [-halfW + r, -halfH + r, Math.PI],
  ];
  for (const [cx, cy, start] of corners) {
    points.push(...arcPoints(cx, cy, r, start, start + Math.PI / 2, stepsPerCorner));
  }
  return points;
}

export function regularPolygon(sides: number, radius: number, phase = 0): Point2D[] {
  const count = Math.max(3, Math.round(sides));
  const points: Point2D[] = [];
  for (let i = 0; i < count; i += 1) {
    points.push(polar(radius, phase + (TWO_PI * i) / count));
  }
  return points;
}

/**
 * One obround (stadium) hole, counter-clockwise.
 *
 * `length` is the centre-to-centre distance of the two end arcs, so the overall
 * length is `length + width`.
 */
export function obround(
  cx: number,
  cy: number,
  length: number,
  width: number,
  angle: number,
  stepsPerEnd = 8,
): Point2D[] {
  const half = Math.max(0, length) / 2;
  const r = Math.max(1e-4, width / 2);
  const points: Point2D[] = [];
  // Local frame: +X along the slot. Right end arc from -90° to +90°.
  const ends: [number, number][] = [
    [half, -Math.PI / 2],
    [-half, Math.PI / 2],
  ];
  for (const [x, start] of ends) {
    for (const point of arcPoints(x, 0, r, start, start + Math.PI, stepsPerEnd)) {
      points.push(point);
    }
  }
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return points.map((point) => ({
    x: cx + point.x * cos - point.y * sin,
    y: cy + point.x * sin + point.y * cos,
  }));
}

/**
 * A smooth multi-lobe knob outline: `lobes` rounded bumps around a circle.
 *
 * The radius follows a raised cosine, so the lobes meet the valleys with zero
 * slope and the outline is a real grip rather than a polygon with corners.
 */
export function lobedOutline(
  lobes: number,
  rootRadius: number,
  tipRadius: number,
  phase = 0,
  samplesPerLobe = 18,
): Point2D[] {
  const count = Math.max(3, Math.round(lobes));
  const points: Point2D[] = [];
  const steps = count * Math.max(6, Math.round(samplesPerLobe));
  for (let i = 0; i < steps; i += 1) {
    const angle = phase + (TWO_PI * i) / steps;
    const wave = (1 - Math.cos(count * angle)) / 2;
    const radius = rootRadius + (tipRadius - rootRadius) * wave;
    points.push(polar(radius, angle));
  }
  return points;
}
