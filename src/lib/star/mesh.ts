import { ShapeUtils, Vector2 } from "three";

import { cleanRings } from "../kit/solid";
import {
  boreOutline,
  circleOutline,
  circleSegments,
  polygonArea,
  type Point2D,
  type StarSpec,
} from "./geometry";
import { createStarProfile } from "./profile";

export interface StarMesh {
  /** Indexed positions as x, y, z triples in millimetres, centred on the origin. */
  positions: Float32Array;
  indices: Uint32Array;
  triangleCount: number;
  volumeMm3: number;
  boundingBox: {
    min: [number, number, number];
    max: [number, number, number];
  };
}

type Face = [number, number, number];

function signedArea(points: Point2D[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2;
}

/** Earcut over an outer contour plus holes. */
function capFaces(outer: Point2D[], holes: Point2D[][]): Face[] {
  const contour = outer.map((point) => new Vector2(point.x, point.y));
  const holeContours = holes.map((hole) =>
    hole.map((point) => new Vector2(point.x, point.y)),
  );
  return ShapeUtils.triangulateShape(contour, holeContours) as Face[];
}

/**
 * Builds the printable solid as one indexed triangle mesh.
 *
 * The roller is a star prism with a hole: both flat faces are triangulated with
 * the same earcut implementation three.js uses, so the cap boundaries are the
 * exact profile vertices, and every wall is an explicit strip of quads joining
 * matching vertices. Each edge ends up in exactly two triangles with opposite
 * winding, which makes the solid watertight by construction instead of by CSG
 * cleanup. A hub is triangulated as a hole in the top face, with its own wall
 * and top cap closing the surface, so the boss stays part of the same shell.
 */
export function buildStarMesh(spec: StarSpec): StarMesh {
  const profile = createStarProfile(spec);
  // Outlines are cleaned as a set, so a profile that repeats a vertex (a flat
  // clamped to zero width, say) cannot leave zero-length wall edges or facets
  // with no normal behind in the exported file.
  const [baseRing, topRing] = cleanRings([profile.points, profile.topPoints]);
  const flip = signedArea(baseRing) < 0;
  const bottomOuter = flip ? [...baseRing].reverse() : baseRing;
  const topOuter = flip ? [...topRing].reverse() : topRing;

  const bore = cleanRings([boreOutline(spec)])[0];
  const halfThickness = spec.thicknessMm / 2;
  const hubRadius = spec.hubEnabled ? Math.max(0, spec.hubDiameterMm / 2) : 0;
  const hubEnabled = hubRadius > 0 && spec.hubHeightMm > 0;
  const hubOutline = hubEnabled
    ? circleOutline(hubRadius, circleSegments(hubRadius))
    : [];
  const topFaceZ = hubEnabled ? halfThickness + spec.hubHeightMm : halfThickness;

  const outerCount = bottomOuter.length;
  const boreCount = bore.length;
  const hubCount = hubOutline.length;

  const outerBottom = 0;
  const outerTop = outerCount;
  const boreBottom = outerCount * 2;
  const boreTop = outerCount * 2 + boreCount;
  const hubBottom = outerCount * 2 + boreCount * 2;
  const hubTop = hubBottom + hubCount;
  const vertexCount = outerCount * 2 + boreCount * 2 + hubCount * 2;

  const positions = new Float32Array(vertexCount * 3);
  const write = (index: number, point: Point2D, z: number) => {
    positions[index * 3] = point.x;
    positions[index * 3 + 1] = point.y;
    positions[index * 3 + 2] = z;
  };

  // The top ring is the tapered outline, not a copy of the base: writing the
  // base points at both heights would export a straight prism and silently
  // drop the tip taper from the mesh, the volume and the STL.
  bottomOuter.forEach((point, i) => {
    write(outerBottom + i, point, -halfThickness);
  });
  topOuter.forEach((point, i) => {
    write(outerTop + i, point, halfThickness);
  });
  bore.forEach((point, i) => {
    write(boreBottom + i, point, -halfThickness);
    write(boreTop + i, point, topFaceZ);
  });
  if (hubEnabled) {
    hubOutline.forEach((point, i) => {
      write(hubBottom + i, point, halfThickness);
      write(hubTop + i, point, topFaceZ);
    });
  }

  const indices: number[] = [];
  const triangle = (a: number, b: number, c: number) => {
    indices.push(a, b, c);
  };

  /**
   * Emits one triangulated face. Winding is decided from the 2D orientation of
   * each triangle rather than trusting earcut's output order, so every cap
   * agrees with the walls it shares edges with.
   */
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

  // Bottom face: the star, pierced by the centre hole.
  emitCap(
    capFaces(bottomOuter, [bore]),
    [...bottomOuter, ...bore],
    (index) =>
      index < outerCount ? outerBottom + index : boreBottom + (index - outerCount),
    false,
  );

  // Top face, with or without the hub shoulder.
  if (hubEnabled) {
    emitCap(
      capFaces(topOuter, [hubOutline]),
      [...topOuter, ...hubOutline],
      (index) =>
        index < outerCount
          ? outerTop + index
          : hubBottom + (index - outerCount),
      true,
    );
    emitCap(
      capFaces(hubOutline, [bore]),
      [...hubOutline, ...bore],
      (index) =>
        index < hubCount ? hubTop + index : boreTop + (index - hubCount),
      true,
    );
  } else {
    emitCap(
      capFaces(topOuter, [bore]),
      [...topOuter, ...bore],
      (index) => (index < outerCount ? outerTop + index : boreTop + (index - outerCount)),
      true,
    );
  }

  // Outer wall: normals point away from the axis.
  for (let i = 0; i < outerCount; i += 1) {
    const next = (i + 1) % outerCount;
    triangle(outerBottom + i, outerBottom + next, outerTop + next);
    triangle(outerBottom + i, outerTop + next, outerTop + i);
  }

  // Centre-hole wall: reversed winding, normals point towards the axis.
  for (let i = 0; i < boreCount; i += 1) {
    const next = (i + 1) % boreCount;
    triangle(boreBottom + next, boreBottom + i, boreTop + i);
    triangle(boreBottom + next, boreTop + i, boreTop + next);
  }

  // Hub wall, outward like the outer wall.
  if (hubEnabled) {
    for (let i = 0; i < hubCount; i += 1) {
      const next = (i + 1) % hubCount;
      triangle(hubBottom + i, hubBottom + next, hubTop + next);
      triangle(hubBottom + i, hubTop + next, hubTop + i);
    }
  }

  const indexArray = new Uint32Array(indices);
  const boundingBox: StarMesh["boundingBox"] = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
  let volume6 = 0;

  for (let i = 0; i < indexArray.length; i += 3) {
    const a = indexArray[i] * 3;
    const b = indexArray[i + 1] * 3;
    const c = indexArray[i + 2] * 3;
    // Signed tetrahedron volume from the origin (divergence theorem).
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

export interface SolidReport {
  ok: boolean;
  /** Every triangle edge is shared by exactly two triangles. */
  watertight: boolean;
  /** Each shared edge runs in opposite directions: consistent face winding. */
  manifold: boolean;
  /** Every triangle belongs to one connected shell. */
  connected: boolean;
  components: number;
  /**
   * Euler characteristic V − E + F. One closed shell with one through-hole has
   * χ = 0; a solid with no hole has χ = 2, and extra shells change it too.
   */
  eulerCharacteristic: number;
  validFaces: boolean;
  volumeMm3: number;
  /** Independent profile-area estimate used as a cross-check. */
  referenceVolumeMm3: number;
  triangleCount: number;
}

/**
 * Inspects the solid the preview renders. The volume is the divergence-theorem
 * volume of the closed triangle mesh — real spikes, valleys and bore — and is
 * only reported when every edge is shared by two consistently wound triangles.
 */
export function inspectStarSolid(spec: StarSpec): SolidReport {
  const mesh = buildStarMesh(spec);
  const { indices } = mesh;
  const triangleCount = indices.length / 3;

  const openEdges = new Map<string, number>();
  for (let i = 0; i < indices.length; i += 3) {
    const tri = [indices[i], indices[i + 1], indices[i + 2]];
    for (let e = 0; e < 3; e += 1) {
      const a = tri[e];
      const b = tri[(e + 1) % 3];
      const backward = `${b}:${a}`;
      const forward = `${a}:${b}`;
      const twin = openEdges.get(backward);
      if (twin !== undefined) {
        if (twin > 1) openEdges.set(backward, twin - 1);
        else openEdges.delete(backward);
      } else {
        openEdges.set(forward, (openEdges.get(forward) ?? 0) + 1);
      }
    }
  }

  let unmatched = 0;
  let duplicated = 0;
  for (const count of openEdges.values()) {
    unmatched += 1;
    if (count > 1) duplicated += count - 1;
  }

  const watertight = unmatched === 0;
  const manifold = watertight && duplicated === 0;

  // No repeated triangle and no zero-area face.
  const faceKeys = new Set<string>();
  let validFaces = true;
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i];
    const b = indices[i + 1];
    const c = indices[i + 2];
    if (a === b || b === c || a === c) {
      validFaces = false;
      break;
    }
    const key = [a, b, c].sort((x, y) => x - y).join(":");
    if (faceKeys.has(key)) {
      validFaces = false;
      break;
    }
    faceKeys.add(key);
  }

  // Connectivity: triangles sharing an undirected edge belong to one shell.
  const edgeOwners = new Map<string, number[]>();
  for (let t = 0; t < triangleCount; t += 1) {
    const a = indices[t * 3];
    const b = indices[t * 3 + 1];
    const c = indices[t * 3 + 2];
    for (const [from, to] of [
      [a, b],
      [b, c],
      [c, a],
    ]) {
      const key = from < to ? `${from}:${to}` : `${to}:${from}`;
      const list = edgeOwners.get(key);
      if (list) list.push(t);
      else edgeOwners.set(key, [t]);
    }
  }

  const parent = new Int32Array(triangleCount);
  for (let i = 0; i < triangleCount; i += 1) parent[i] = i;
  const find = (x: number): number => {
    let root = x;
    while (parent[root] !== root) root = parent[root];
    while (parent[x] !== root) {
      const next = parent[x];
      parent[x] = root;
      x = next;
    }
    return root;
  };
  for (const owners of edgeOwners.values()) {
    for (let i = 1; i < owners.length; i += 1) {
      const a = find(owners[0]);
      const b = find(owners[i]);
      if (a !== b) parent[b] = a;
    }
  }
  const roots = new Set<number>();
  for (let i = 0; i < triangleCount; i += 1) roots.add(find(i));
  const components = triangleCount === 0 ? 0 : roots.size;
  const connected = components === 1;

  let usedVertices = new Set<number>();
  for (let i = 0; i < indices.length; i += 1) usedVertices.add(indices[i]);
  const eulerCharacteristic =
    usedVertices.size - edgeOwners.size + triangleCount;

  // Reference areas come from the same outlines the mesh is built from, so a
  // hex or double-flat hole is measured as the polygon it really is.
  const profile = createStarProfile(spec);
  const boreArea = polygonArea(boreOutline(spec));
  const layerArea =
    ((profile.baseAreaMm2 + profile.topAreaMm2) / 2 - boreArea) *
    spec.thicknessMm;
  const hubLayer = spec.hubEnabled
    ? Math.max(
        0,
        polygonArea(
          circleOutline(
            spec.hubDiameterMm / 2,
            circleSegments(spec.hubDiameterMm / 2),
          ),
        ) - boreArea,
      ) * spec.hubHeightMm
    : 0;

  return {
    ok: watertight && manifold && connected && validFaces && eulerCharacteristic === 0,
    watertight,
    manifold,
    connected,
    components,
    eulerCharacteristic,
    validFaces,
    volumeMm3: watertight ? mesh.volumeMm3 : 0,
    referenceVolumeMm3: layerArea + hubLayer,
    triangleCount,
  };
}
