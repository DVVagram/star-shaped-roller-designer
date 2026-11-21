/**
 * Solids of revolution.
 *
 * A closed profile in the (radius, height) plane is swept once around the Z axis.
 * The surface is closed automatically: the profile loop has no ends, so neither
 * does the swept surface. Points on the axis become single pole vertices and the
 * quads that touch them degenerate into triangles, which keeps a solid cone or a
 * vase's floor watertight without any special-case caps.
 *
 * The profile may be concave — a flywheel section is one closed loop with a rim,
 * a web and a hub — which is what lets a lathe part carry grooves and undercuts.
 */

import { cleanRings, type Mesh } from "./solid";
import { TWO_PI, type Point2D } from "./units";

export interface RevolutionInput {
  /** Closed loop in (radius, height) millimetres, radius ≥ 0. */
  profile: Point2D[];
  /** Segments around the axis. */
  segments: number;
}

export class RevolutionGeometryError extends Error {}

const AXIS_EPS = 1e-7;

function distance(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
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

function simplify(profile: Point2D[]): Point2D[] {
  let ring = cleanRings([profile])[0];
  let changed = true;
  while (changed && ring.length > 3) {
    changed = false;
    const out: Point2D[] = [];
    for (let i = 0; i < ring.length; i += 1) {
      const previous = out.length > 0 ? out[out.length - 1] : ring[ring.length - 1];
      const next = ring[(i + 1) % ring.length];
      const current = ring[i];
      if (
        distance(previous, next) > 1e-7 &&
        distanceToSegment(current, previous, next) < 1e-7
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

export function buildRevolution(input: RevolutionInput): Mesh {
  const profile = simplify(input.profile);
  if (profile.length < 3) {
    throw new RevolutionGeometryError("A revolution needs a closed profile.");
  }
  const segments = Math.max(8, Math.min(512, Math.round(input.segments)));

  const onAxis = profile.map((point) => point.x <= AXIS_EPS);
  if (!onAxis.some(Boolean) && Math.min(...profile.map((p) => p.x)) <= AXIS_EPS) {
    throw new RevolutionGeometryError("A profile point sits on the axis.");
  }

  const base: number[] = [];
  const positions: number[] = [];
  let cursor = 0;
  profile.forEach((point, index) => {
    if (onAxis[index]) {
      base[index] = cursor;
      positions.push(0, 0, point.y);
      cursor += 1;
      return;
    }
    base[index] = cursor;
    for (let j = 0; j < segments; j += 1) {
      const angle = (TWO_PI * j) / segments;
      positions.push(point.x * Math.cos(angle), point.x * Math.sin(angle), point.y);
      cursor += 1;
    }
  });

  const vertex = (profileIndex: number, segment: number): number => {
    if (onAxis[profileIndex]) return base[profileIndex];
    const wrapped = ((segment % segments) + segments) % segments;
    return base[profileIndex] + wrapped;
  };

  const indices: number[] = [];
  const count = profile.length;
  for (let i = 0; i < count; i += 1) {
    const k = (i + 1) % count;
    if (onAxis[i] && onAxis[k]) continue;
    for (let j = 0; j < segments; j += 1) {
      const a = vertex(i, j);
      const b = vertex(i, j + 1);
      const c = vertex(k, j + 1);
      const d = vertex(k, j);
      if (a !== b && c !== d) {
        indices.push(a, b, c, a, c, d);
      } else if (a === b && c !== d) {
        indices.push(a, c, d);
      } else if (a !== b && c === d) {
        indices.push(a, b, c);
      }
    }
  }

  if (indices.length === 0) {
    throw new RevolutionGeometryError("The profile sweeps no surface.");
  }

  const boundingBox: Mesh["boundingBox"] = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
  const measure = (indicesToUse: number[]) => {
    let volume6 = 0;
    for (let i = 0; i < indicesToUse.length; i += 3) {
      const a = indicesToUse[i] * 3;
      const b = indicesToUse[i + 1] * 3;
      const c = indicesToUse[i + 2] * 3;
      volume6 +=
        positions[a] *
          (positions[b + 1] * positions[c + 2] -
            positions[c + 1] * positions[b + 2]) -
        positions[b] *
          (positions[a + 1] * positions[c + 2] -
            positions[c + 1] * positions[a + 2]) +
        positions[c] *
          (positions[a + 1] * positions[b + 2] -
            positions[b + 1] * positions[a + 2]);
    }
    return volume6;
  };

  // The profile winding decides the surface normal direction. Measuring the
  // enclosed volume is a robust way to pick the outward one, whatever order the
  // caller wrote the loop in.
  if (measure(indices) < 0) {
    for (let i = 0; i < indices.length; i += 3) {
      const swap = indices[i + 1];
      indices[i + 1] = indices[i + 2];
      indices[i + 2] = swap;
    }
  }

  for (let index = 0; index < cursor; index += 1) {
    for (let axis = 0; axis < 3; axis += 1) {
      const value = positions[index * 3 + axis];
      boundingBox.min[axis] = Math.min(boundingBox.min[axis], value);
      boundingBox.max[axis] = Math.max(boundingBox.max[axis], value);
    }
  }

  const indexArray = new Uint32Array(indices);
  return {
    positions: new Float32Array(positions),
    indices: indexArray,
    triangleCount: indexArray.length / 3,
    volumeMm3: Math.abs(measure(indices)) / 6,
    boundingBox,
  };
}

/**
 * Profile helpers: a closed loop is assembled from runs, and each run carries its
 * own sampling. The first point of a run is dropped when it repeats the last one,
 * so the loop never contains a zero-length edge.
 */
export class ProfileBuilder {
  private points: Point2D[] = [];

  line(to: Point2D): this {
    this.push(to);
    return this;
  }

  point(to: Point2D): this {
    this.push(to);
    return this;
  }

  arc(
    cx: number,
    cz: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    steps: number,
  ): this {
    const count = Math.max(1, Math.round(steps));
    for (let i = 0; i <= count; i += 1) {
      const angle = startAngle + ((endAngle - startAngle) * i) / count;
      this.push({ x: cx + radius * Math.cos(angle), y: cz + radius * Math.sin(angle) });
    }
    return this;
  }

  /** Samples a curve in (radius, height) until the chords are inside tolerance. */
  curve(
    pointAt: (u: number) => Point2D,
    steps: number,
  ): this {
    const count = Math.max(1, Math.round(steps));
    for (let i = 0; i <= count; i += 1) this.push(pointAt(i / count));
    return this;
  }

  build(): Point2D[] {
    return this.points;
  }

  private push(point: Point2D) {
    const previous = this.points[this.points.length - 1];
    if (previous && distance(previous, point) < 1e-7) return;
    this.points.push(point);
  }
}

export function profile(points: Point2D[]): Point2D[] {
  return points;
}
