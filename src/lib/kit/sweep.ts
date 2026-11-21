/**
 * Swept tubes: a helical spring wire and a pipe elbow.
 *
 * Both are closed by construction. A tube gets a triangle fan at each end, and
 * the elbow's two open ends are closed with annular quads between the outer and
 * inner rings — so the shell is watertight without any cap stitching.
 */

import type { Mesh } from "./solid";
import { TWO_PI } from "./units";

interface RawMesh {
  positions: number[];
  indices: number[];
}

function finalize(raw: RawMesh): Mesh {
  const { positions, indices } = raw;
  let volume6 = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3;
    const b = indices[i + 1] * 3;
    const c = indices[i + 2] * 3;
    volume6 +=
      positions[a] *
        (positions[b + 1] * positions[c + 2] - positions[c + 1] * positions[b + 2]) -
      positions[b] *
        (positions[a + 1] * positions[c + 2] - positions[c + 1] * positions[a + 2]) +
      positions[c] *
        (positions[a + 1] * positions[b + 2] - positions[b + 1] * positions[a + 2]);
  }
  if (volume6 < 0) {
    for (let i = 0; i < indices.length; i += 3) {
      const swap = indices[i + 1];
      indices[i + 1] = indices[i + 2];
      indices[i + 2] = swap;
    }
  }
  const boundingBox: Mesh["boundingBox"] = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
  for (let index = 0; index < positions.length / 3; index += 1) {
    for (let axis = 0; axis < 3; axis += 1) {
      const value = positions[index * 3 + axis];
      boundingBox.min[axis] = Math.min(boundingBox.min[axis], value);
      boundingBox.max[axis] = Math.max(boundingBox.max[axis], value);
    }
  }
  return {
    positions: new Float32Array(positions),
    indices: new Uint32Array(indices),
    triangleCount: indices.length / 3,
    volumeMm3: Math.abs(volume6) / 6,
    boundingBox,
  };
}

export interface HelicalTubeInput {
  coilRadiusMm: number;
  wireRadiusMm: number;
  coils: number;
  pitchMm: number;
  /** Samples along the helix. */
  pathSteps: number;
  /** Samples around the wire. */
  wireSegments: number;
}

/**
 * A helical wire of circular cross-section.
 *
 * The frame is built from the radial direction (which is exactly perpendicular
 * to the helix tangent) and a binormal, so the wire never twists about its own
 * axis as it climbs. Both ends are square-cut fans perpendicular to the path.
 */
export function buildHelicalTube(input: HelicalTubeInput): Mesh {
  const R = Math.max(0.2, input.coilRadiusMm);
  const wire = Math.max(0.05, input.wireRadiusMm);
  const coils = Math.max(0.5, input.coils);
  const pitch = Math.max(0.1, input.pitchMm);
  const stations = Math.max(12, Math.round(input.pathSteps));
  const around = Math.max(6, Math.round(input.wireSegments));

  const positions: number[] = [];
  const indices: number[] = [];

  const total = TWO_PI * coils;
  const zOffset = wire;

  for (let i = 0; i <= stations; i += 1) {
    const theta = (total * i) / stations;
    const cx = R * Math.cos(theta);
    const cy = R * Math.sin(theta);
    const cz = (pitch * theta) / TWO_PI + zOffset;

    const nx = Math.cos(theta);
    const ny = Math.sin(theta);
    const tx = -R * Math.sin(theta);
    const ty = R * Math.cos(theta);
    const tz = pitch / TWO_PI;
    const tLen = Math.hypot(tx, ty, tz);
    const bx = (ty * 0 - tz * ny) / tLen;
    const by = (tz * nx - tx * 0) / tLen;
    const bz = (tx * ny - ty * nx) / tLen;

    for (let j = 0; j < around; j += 1) {
      const phi = (TWO_PI * j) / around;
      const cos = Math.cos(phi);
      const sin = Math.sin(phi);
      positions.push(
        cx + wire * (cos * nx + sin * bx),
        cy + wire * (cos * ny + sin * by),
        cz + wire * (cos * 0 + sin * bz),
      );
    }
  }

  const ring = (station: number, index: number) =>
    station * around + ((index % around) + around) % around;

  for (let i = 0; i < stations; i += 1) {
    for (let j = 0; j < around; j += 1) {
      const a = ring(i, j);
      const b = ring(i, j + 1);
      const c = ring(i + 1, j + 1);
      const d = ring(i + 1, j);
      indices.push(a, b, c, a, c, d);
    }
  }

  // End caps, wound against the first and last band.
  const startCentre = positions.length / 3;
  positions.push(R * Math.cos(0), R * Math.sin(0), zOffset);
  for (let j = 0; j < around; j += 1) {
    indices.push(startCentre, ring(0, j + 1), ring(0, j));
  }
  const endCentre = positions.length / 3;
  const thetaEnd = total;
  positions.push(
    R * Math.cos(thetaEnd),
    R * Math.sin(thetaEnd),
    (pitch * thetaEnd) / TWO_PI + zOffset,
  );
  for (let j = 0; j < around; j += 1) {
    indices.push(endCentre, ring(stations, j), ring(stations, j + 1));
  }

  return finalize({ positions, indices });
}

export interface SweptAnnulusInput {
  bendRadiusMm: number;
  outerRadiusMm: number;
  innerRadiusMm: number;
  /** Bend angle in radians. */
  angleRad: number;
  pathSteps: number;
  segments: number;
}

/**
 * A pipe elbow: an annulus swept along a circular arc.
 *
 * The cross-section is a true annulus, so the bore is round; the ends are square
 * to the path and closed with annular faces.
 */
export function buildSweptAnnulus(input: SweptAnnulusInput): Mesh {
  const bend = Math.max(0.2, input.bendRadiusMm);
  const outer = Math.max(0.2, input.outerRadiusMm);
  const inner = Math.max(0.05, Math.min(input.innerRadiusMm, outer - 0.2));
  const angle = Math.max(0.05, Math.min(Math.PI * 1.5, input.angleRad));
  const stations = Math.max(4, Math.round(input.pathSteps));
  const around = Math.max(8, Math.round(input.segments));

  const positions: number[] = [];
  const indices: number[] = [];

  const pushRing = (theta: number) => {
    const cx = bend * Math.cos(theta);
    const cz = bend * Math.sin(theta);
    for (const radius of [outer, inner]) {
      for (let j = 0; j < around; j += 1) {
        const phi = (TWO_PI * j) / around;
        const radial = radius * Math.cos(phi);
        const axial = radius * Math.sin(phi);
        positions.push(cx + radial * Math.cos(theta), axial, cz + radial * Math.sin(theta));
      }
    }
  };

  for (let i = 0; i <= stations; i += 1) pushRing((angle * i) / stations);

  const outerIndex = (station: number, j: number) =>
    station * 2 * around + (((j % around) + around) % around);
  const innerIndex = (station: number, j: number) =>
    station * 2 * around + around + (((j % around) + around) % around);

  for (let i = 0; i < stations; i += 1) {
    for (let j = 0; j < around; j += 1) {
      indices.push(
        outerIndex(i, j),
        outerIndex(i, j + 1),
        outerIndex(i + 1, j + 1),
        outerIndex(i, j),
        outerIndex(i + 1, j + 1),
        outerIndex(i + 1, j),
      );
      indices.push(
        innerIndex(i, j),
        innerIndex(i + 1, j),
        innerIndex(i + 1, j + 1),
        innerIndex(i, j),
        innerIndex(i + 1, j + 1),
        innerIndex(i, j + 1),
      );
    }
  }

  // Annular end faces, wound against both tube walls.
  for (let j = 0; j < around; j += 1) {
    indices.push(
      outerIndex(0, j),
      innerIndex(0, j),
      innerIndex(0, j + 1),
      outerIndex(0, j),
      innerIndex(0, j + 1),
      outerIndex(0, j + 1),
    );
    indices.push(
      outerIndex(stations, j),
      outerIndex(stations, j + 1),
      innerIndex(stations, j + 1),
      outerIndex(stations, j),
      innerIndex(stations, j + 1),
      innerIndex(stations, j),
    );
  }

  return finalize({ positions, indices });
}
