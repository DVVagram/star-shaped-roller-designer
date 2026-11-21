/**
 * Prismatic solids: a stack of matching outlines with any number of through-holes.
 *
 * This is the multi-hole generalisation of `buildExtrusion`. Every ring shares
 * its vertex order, so the walls stitch index-for-index; the caps are cut with
 * three.js' earcut, and the winding of every cap triangle is decided from its own
 * 2D orientation. The result is closed by construction — no booleans, no repair.
 *
 * Stacking rotated rings gives a true twisted (helical) wall: the tooth flanks
 * follow the helix instead of shearing across it.
 */

import { ShapeUtils, Vector2 } from "three";

import { cleanRings, type Mesh } from "./solid";
import { signedArea, type Point2D } from "./units";

type Face = [number, number, number];

export interface PrismInput {
  /** Outlines from the bottom face upward, all with the same vertex order. */
  rings: Point2D[][];
  /** Through-holes, identical at both ends. May be empty. */
  holes?: Point2D[][];
  thicknessMm: number;
  /** Height of each ring as a fraction of the thickness (0 … 1). */
  ringFractions?: number[];
}

export class PrismGeometryError extends Error {}

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

/**
 * Indices to keep, dropping only points that sit on the line between their
 * neighbours. Applied to every stacked ring at once so the stack stays paired.
 */
function collinearMask(ring: Point2D[], eps = 1e-6): boolean[] {
  let keep = ring.map(() => true);
  let changed = true;
  while (changed) {
    changed = false;
    const alive: number[] = [];
    for (let i = 0; i < ring.length; i += 1) if (keep[i]) alive.push(i);
    if (alive.length <= 3) break;
    for (let k = 0; k < alive.length; k += 1) {
      const previous = ring[alive[(k - 1 + alive.length) % alive.length]];
      const next = ring[alive[(k + 1) % alive.length]];
      const current = ring[alive[k]];
      if (
        distance(previous, next) > eps &&
        distanceToSegment(current, previous, next) < eps
      ) {
        keep[alive[k]] = false;
        changed = true;
      }
    }
  }
  return keep;
}

function applyMask(rings: Point2D[][], mask: boolean[]): Point2D[][] {
  return rings.map((ring) => ring.filter((_, index) => mask[index]));
}

function pointInPolygon(point: Point2D, ring: Point2D[]): boolean {
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

function capFaces(outer: Point2D[], holes: Point2D[][]): Face[] {
  const contour = outer.map((point) => new Vector2(point.x, point.y));
  const holeContours = holes.map((hole) =>
    hole.map((point) => new Vector2(point.x, point.y)),
  );
  return ShapeUtils.triangulateShape(contour, holeContours) as Face[];
}

function ccw(points: Point2D[]): Point2D[] {
  return signedArea(points) < 0 ? [...points].reverse() : points;
}

export function buildPrism(input: PrismInput): Mesh {
  const { thicknessMm } = input;
  if (!(thicknessMm > 0)) throw new PrismGeometryError("The part needs a positive thickness.");

  const cleaned = cleanRings(input.rings);
  if (cleaned.length < 2) {
    throw new PrismGeometryError("A prism needs a bottom and a top outline.");
  }
  const mask = collinearMask(cleaned[0]);
  if (mask.filter(Boolean).length < 3) {
    throw new PrismGeometryError("The outline collapses to fewer than three corners.");
  }
  const rings = applyMask(cleaned, mask).map(ccw);

  const holes = (input.holes ?? [])
    .map((hole) => ccw(cleanRings([hole])[0]))
    .map((hole) => {
      const holeMask = collinearMask(hole);
      if (holeMask.filter(Boolean).length < 3) {
        throw new PrismGeometryError("A hole collapses to fewer than three corners.");
      }
      return hole.filter((_, index) => holeMask[index]);
    });

  for (const hole of holes) {
    for (const point of hole) {
      if (!pointInPolygon(point, rings[0])) {
        throw new PrismGeometryError("A hole crosses the outside of the part.");
      }
    }
  }

  const ringCount = rings.length;
  const outerCount = rings[0].length;
  const holeCounts = holes.map((hole) => hole.length);

  const fractions = input.ringFractions;
  if (fractions) {
    if (fractions.length !== ringCount) {
      throw new PrismGeometryError("Every ring needs a height fraction.");
    }
    for (let k = 0; k < ringCount; k += 1) {
      const previous = k === 0 ? -Infinity : fractions[k - 1];
      if (!(fractions[k] > previous) || fractions[k] < 0 || fractions[k] > 1) {
        throw new PrismGeometryError("Height fractions must rise from 0 to 1.");
      }
    }
    if (Math.abs(fractions[0]) > 1e-9 || Math.abs(fractions[ringCount - 1] - 1) > 1e-9) {
      throw new PrismGeometryError("Height fractions must start at 0 and end at 1.");
    }
  }

  const halfThickness = thicknessMm / 2;
  const zAt = (index: number) =>
    fractions
      ? -halfThickness + thicknessMm * fractions[index]
      : -halfThickness + (thicknessMm * index) / (ringCount - 1);

  const holeBottomBase: number[] = [];
  const holeTopBase: number[] = [];
  let cursor = ringCount * outerCount;
  for (const count of holeCounts) {
    holeBottomBase.push(cursor);
    cursor += count;
    holeTopBase.push(cursor);
    cursor += count;
  }
  const vertexCount = cursor;

  const positions = new Float32Array(vertexCount * 3);
  const write = (index: number, point: Point2D, z: number) => {
    positions[index * 3] = point.x;
    positions[index * 3 + 1] = point.y;
    positions[index * 3 + 2] = z;
  };

  rings.forEach((ring, k) => {
    ring.forEach((point, i) => write(k * outerCount + i, point, zAt(k)));
  });
  holes.forEach((hole, h) => {
    hole.forEach((point, i) => {
      write(holeBottomBase[h] + i, point, -halfThickness);
      write(holeTopBase[h] + i, point, halfThickness);
    });
  });

  const indices: number[] = [];
  const triangle = (a: number, b: number, c: number) => indices.push(a, b, c);

  const emitCap = (
    faces: Face[],
    combined: Point2D[],
    mapIndex: (index: number) => number,
    upward: boolean,
  ) => {
    for (const face of faces) {
      const [a, b, c] = face;
      const pa = combined[a];
      const pb = combined[b];
      const pc = combined[c];
      const cross =
        (pb.x - pa.x) * (pc.y - pa.y) - (pb.y - pa.y) * (pc.x - pa.x);
      const order: Face = cross >= 0 ? [a, b, c] : [c, b, a];
      if (upward) {
        triangle(mapIndex(order[0]), mapIndex(order[1]), mapIndex(order[2]));
      } else {
        triangle(mapIndex(order[2]), mapIndex(order[1]), mapIndex(order[0]));
      }
    }
  };

  const bottom = rings[0];
  const top = rings[ringCount - 1];
  // Each cap is oriented from its own outline. A twisted stack has a rotated top
  // ring, and earcut may triangulate it differently from the bottom; testing the
  // top triangles against the bottom coordinates would then pick the wrong
  // winding for some of them and leave the shell open along the tip land.
  const combinedBottom = [...bottom, ...holes.flat()];
  const combinedTop = [...top, ...holes.flat()];
  const mapBottom = (index: number): number => {
    if (index < outerCount) return index;
    let offset = index - outerCount;
    for (let h = 0; h < holes.length; h += 1) {
      if (offset < holeCounts[h]) return holeBottomBase[h] + offset;
      offset -= holeCounts[h];
    }
    throw new PrismGeometryError("Cap vertex out of range.");
  };
  const mapTop = (index: number): number => {
    if (index < outerCount) return (ringCount - 1) * outerCount + index;
    let offset = index - outerCount;
    for (let h = 0; h < holes.length; h += 1) {
      if (offset < holeCounts[h]) return holeTopBase[h] + offset;
      offset -= holeCounts[h];
    }
    throw new PrismGeometryError("Cap vertex out of range.");
  };

  emitCap(capFaces(bottom, holes), combinedBottom, mapBottom, false);
  emitCap(capFaces(top, holes), combinedTop, mapTop, true);

  for (let k = 0; k < ringCount - 1; k += 1) {
    const lower = k * outerCount;
    const upper = lower + outerCount;
    for (let i = 0; i < outerCount; i += 1) {
      const next = (i + 1) % outerCount;
      triangle(lower + i, lower + next, upper + next);
      triangle(lower + i, upper + next, upper + i);
    }
  }

  holes.forEach((_, h) => {
    const count = holeCounts[h];
    for (let i = 0; i < count; i += 1) {
      const next = (i + 1) % count;
      const bottomA = holeBottomBase[h];
      const topA = holeTopBase[h];
      triangle(bottomA + next, bottomA + i, topA + i);
      triangle(bottomA + next, topA + i, topA + next);
    }
  });

  const indexArray = new Uint32Array(indices);
  const boundingBox: Mesh["boundingBox"] = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
  let volume6 = 0;
  for (let i = 0; i < indexArray.length; i += 3) {
    const a = indexArray[i] * 3;
    const b = indexArray[i + 1] * 3;
    const c = indexArray[i + 2] * 3;
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
  for (let index = 0; index < vertexCount; index += 1) {
    for (let axis = 0; axis < 3; axis += 1) {
      const value = positions[index * 3 + axis];
      boundingBox.min[axis] = Math.min(boundingBox.min[axis], value);
      boundingBox.max[axis] = Math.max(boundingBox.max[axis], value);
    }
  }

  return {
    positions,
    indices: indexArray,
    triangleCount: indexArray.length / 3,
    volumeMm3: Math.abs(volume6) / 6,
    boundingBox,
  };
}
