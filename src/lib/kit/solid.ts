import { ShapeUtils, Vector2 } from "three";

import { signedArea, type Point2D } from "./units";

/** Anything with indexed triangles, which is all shading needs to know. */
export interface IndexedGeometry {
  positions: Float32Array;
  indices: Uint32Array;
}

export interface Mesh extends IndexedGeometry {
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

/** Two points closer than this are the same vertex. */
const WELD_MM = 1e-6;

function capFaces(outer: Point2D[], holes: Point2D[][]): Face[] {
  const contour = outer.map((point) => new Vector2(point.x, point.y));
  const holeContours = holes.map((hole) =>
    hole.map((point) => new Vector2(point.x, point.y)),
  );
  return ShapeUtils.triangulateShape(contour, holeContours) as Face[];
}

function samePoint(a: Point2D, b: Point2D): boolean {
  return Math.abs(a.x - b.x) < WELD_MM && Math.abs(a.y - b.y) < WELD_MM;
}

/**
 * Drops vertices that repeat their predecessor in any outline.
 *
 * A profile that clamps a feature to zero width — a sprocket tooth with no tip
 * land, for instance — can emit the same point several times. Those repeats give
 * the wall zero-length edges, the caps degenerate triangles and the STL faces
 * with no normal, so they are removed before anything is stitched together.
 * Indices are removed from every ring at once, which keeps the rings pairable.
 */
export function cleanRings(rings: Point2D[][]): Point2D[][] {
  if (rings.length === 0) return [];
  const count = rings[0].length;
  for (const ring of rings) {
    if (ring.length !== count) {
      throw new Error("Every profile ring must share its vertex order.");
    }
  }
  if (count < 3) throw new Error("A profile needs at least three vertices.");

  const keep: number[] = [0];
  for (let i = 1; i < count; i += 1) {
    const repeated = rings.some((ring) =>
      samePoint(ring[i], ring[keep[keep.length - 1]]),
    );
    if (!repeated) keep.push(i);
  }

  // The closing edge must not be a zero-length repeat of the first vertex either.
  while (keep.length > 1) {
    const wrapsClean = rings.every(
      (ring) => !samePoint(ring[keep[keep.length - 1]], ring[keep[0]]),
    );
    if (wrapsClean) break;
    keep.pop();
  }

  if (keep.length < 3) {
    throw new Error("The profile collapses to fewer than three distinct vertices.");
  }

  return rings.map((ring) => keep.map((index) => ring[index]));
}

export interface ExtrusionInput {
  /**
   * Outlines stacked from the bottom face upward. Every ring holds the same
   * vertices in the same order and sits at an even height between the two faces,
   * so a twisted wall is a stack of bands rather than one long chord.
   */
  rings: Point2D[][];
  /** Through-hole, identical at both ends. */
  bore: Point2D[];
  thicknessMm: number;
  /** Optional boss standing proud of the top face. */
  hub?: { outline: Point2D[]; heightMm: number } | null;
}

/**
 * Builds a closed solid from stacked outlines and a through-hole.
 *
 * Every face is triangulated with the same earcut implementation three.js uses,
 * so cap boundaries are exactly the profile vertices, and every wall is an
 * explicit strip of quads joining matching vertices. Each edge then belongs to
 * exactly two triangles with opposite winding: the shell is watertight by
 * construction rather than by CSG repair.
 *
 * Stacking rotated outlines makes the twist follow the real sweep instead of
 * cutting across it, and each band stays a twisted ruled surface, so the solid
 * is closed at every level.
 */
export function buildExtrusion(input: ExtrusionInput): Mesh {
  const { thicknessMm } = input;
  if (!(thicknessMm > 0)) {
    throw new Error("The part needs a positive thickness.");
  }

  const rings = cleanRings(input.rings);
  const [boreRing] = cleanRings([input.bore]);
  if (rings.length < 2) {
    throw new Error("An extrusion needs a bottom and a top outline.");
  }
  if (boreRing.length < 3) {
    throw new Error("A profile needs at least three vertices.");
  }

  const ringCount = rings.length;
  const outerCount = rings[0].length;
  const boreCount = boreRing.length;

  const flip = signedArea(rings[0]) < 0;
  for (const ring of rings) {
    if ((signedArea(ring) < 0) !== flip) {
      throw new Error("The profile rings must wind the same way.");
    }
  }
  const stacked = rings.map((ring) => (flip ? [...ring].reverse() : ring));
  const hole = signedArea(boreRing) < 0 ? [...boreRing].reverse() : boreRing;

  const hubInput = input.hub && input.hub.heightMm > 0 ? input.hub : null;
  const [hubRing] = hubInput ? cleanRings([hubInput.outline]) : [[]];
  const hubOutline =
    hubRing.length >= 3 ? (signedArea(hubRing) < 0 ? [...hubRing].reverse() : hubRing) : [];

  const halfThickness = thicknessMm / 2;
  const hubEnabled = hubOutline.length >= 3;
  const hubCount = hubOutline.length;
  const topFaceZ = hubEnabled ? halfThickness + (hubInput?.heightMm ?? 0) : halfThickness;
  const zAt = (index: number) => -halfThickness + (thicknessMm * index) / (ringCount - 1);

  const boreBottom = ringCount * outerCount;
  const boreTop = boreBottom + boreCount;
  const hubBottom = boreTop + boreCount;
  const hubTop = hubBottom + hubCount;
  const vertexCount = hubTop + hubCount;

  const positions = new Float32Array(vertexCount * 3);
  const write = (index: number, point: Point2D, z: number) => {
    positions[index * 3] = point.x;
    positions[index * 3 + 1] = point.y;
    positions[index * 3 + 2] = z;
  };

  stacked.forEach((ring, k) => {
    const z = zAt(k);
    ring.forEach((point, i) => write(k * outerCount + i, point, z));
  });
  hole.forEach((point, i) => {
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

  const bottomRing = stacked[0];
  const topRing = stacked[ringCount - 1];
  const topBase = (ringCount - 1) * outerCount;

  // Bottom face: the outer profile, pierced by the centre hole.
  emitCap(
    capFaces(bottomRing, [hole]),
    [...bottomRing, ...hole],
    (index) =>
      index < outerCount ? index : boreBottom + (index - outerCount),
    false,
  );

  // Top face, with or without the hub shoulder.
  if (hubEnabled) {
    emitCap(
      capFaces(topRing, [hubOutline]),
      [...topRing, ...hubOutline],
      (index) =>
        index < outerCount ? topBase + index : hubBottom + (index - outerCount),
      true,
    );
    emitCap(
      capFaces(hubOutline, [hole]),
      [...hubOutline, ...hole],
      (index) =>
        index < hubCount ? hubTop + index : boreTop + (index - hubCount),
      true,
    );
  } else {
    emitCap(
      capFaces(topRing, [hole]),
      [...topRing, ...hole],
      (index) => (index < outerCount ? topBase + index : boreTop + (index - outerCount)),
      true,
    );
  }

  // Outer wall: one band per pair of neighbouring outlines, normals outward.
  for (let k = 0; k < ringCount - 1; k += 1) {
    const lower = k * outerCount;
    const upper = lower + outerCount;
    for (let i = 0; i < outerCount; i += 1) {
      const next = (i + 1) % outerCount;
      triangle(lower + i, lower + next, upper + next);
      triangle(lower + i, upper + next, upper + i);
    }
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

export interface SmoothGeometry {
  /** Positions with one vertex per shading group. */
  positions: Float32Array;
  /** Unit normals matching `positions`. */
  normals: Float32Array;
  indices: Uint32Array;
}

/**
 * Builds renderable normals that smooth a curved wall but keep a real edge.
 *
 * Averaging every face at a vertex would round off the flat faces of the part;
 * shading each face on its own leaves the whole surface looking chipped. Faces
 * that meet at less than `creaseAngleDeg` are grouped and share one averaged
 * normal, so a fine bore or a twisted blade shades continuously while the rim of
 * a face stays sharp.
 */
export function buildSmoothGeometry(
  mesh: IndexedGeometry,
  creaseAngleDeg = 32,
): SmoothGeometry {
  const { positions, indices } = mesh;
  const faceCount = indices.length / 3;

  const unit = new Float32Array(faceCount * 3);
  /** Corner angle of each face at each of its vertices, in radians. */
  const cornerAngles = new Float32Array(faceCount * 3);
  for (let f = 0; f < faceCount; f += 1) {
    const a = indices[f * 3] * 3;
    const b = indices[f * 3 + 1] * 3;
    const c = indices[f * 3 + 2] * 3;
    const abx = positions[b] - positions[a];
    const aby = positions[b + 1] - positions[a + 1];
    const abz = positions[b + 2] - positions[a + 2];
    const acx = positions[c] - positions[a];
    const acy = positions[c + 1] - positions[a + 1];
    const acz = positions[c + 2] - positions[a + 2];
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;
    const length = Math.hypot(nx, ny, nz);
    if (length > 1e-12) {
      unit[f * 3] = nx / length;
      unit[f * 3 + 1] = ny / length;
      unit[f * 3 + 2] = nz / length;
    }

    // Angles rather than areas: splitting a quad into two triangles gives the
    // two halves different areas, which would tilt the normal at a vertex that
    // sits on the seam. Corner angles add up to the same total however the quad
    // is cut, so neighbouring bands are weighted evenly.
    const tri = [indices[f * 3], indices[f * 3 + 1], indices[f * 3 + 2]];
    for (let corner = 0; corner < 3; corner += 1) {
      const cur = tri[corner] * 3;
      const next = tri[(corner + 1) % 3] * 3;
      const prev = tri[(corner + 2) % 3] * 3;
      const ux = positions[next] - positions[cur];
      const uy = positions[next + 1] - positions[cur + 1];
      const uz = positions[next + 2] - positions[cur + 2];
      const vx = positions[prev] - positions[cur];
      const vy = positions[prev + 1] - positions[cur + 1];
      const vz = positions[prev + 2] - positions[cur + 2];
      const lu = Math.hypot(ux, uy, uz);
      const lv = Math.hypot(vx, vy, vz);
      cornerAngles[f * 3 + corner] =
        lu > 1e-12 && lv > 1e-12
          ? Math.acos(
              Math.max(-1, Math.min(1, (ux * vx + uy * vy + uz * vz) / (lu * lv))),
            )
          : 0;
    }
  }

  const vertexFaces = new Map<number, number[]>();
  for (let f = 0; f < faceCount; f += 1) {
    for (let corner = 0; corner < 3; corner += 1) {
      const vertex = indices[f * 3 + corner];
      const list = vertexFaces.get(vertex);
      if (list) list.push(f);
      else vertexFaces.set(vertex, [f]);
    }
  }

  const cosCrease = Math.cos((Math.max(1, Math.min(179, creaseAngleDeg)) * Math.PI) / 180);
  const cornerOutput = new Int32Array(indices.length);
  const outPositions: number[] = [];
  const outNormals: number[] = [];

  for (const [vertex, faces] of vertexFaces) {
    const slots: number[] = [];
    for (const face of faces) {
      for (let corner = 0; corner < 3; corner += 1) {
        if (indices[face * 3 + corner] === vertex) slots.push(face * 3 + corner);
      }
    }

    const parent = new Int32Array(slots.length);
    for (let i = 0; i < slots.length; i += 1) parent[i] = i;
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

    for (let i = 0; i < slots.length; i += 1) {
      for (let j = i + 1; j < slots.length; j += 1) {
        const fi = Math.floor(slots[i] / 3);
        const fj = Math.floor(slots[j] / 3);
        if (fi === fj) continue;
        const dot =
          unit[fi * 3] * unit[fj * 3] +
          unit[fi * 3 + 1] * unit[fj * 3 + 1] +
          unit[fi * 3 + 2] * unit[fj * 3 + 2];
        if (dot >= cosCrease) {
          const a = find(i);
          const b = find(j);
          if (a !== b) parent[b] = a;
        }
      }
    }

    const groups = new Map<number, number[]>();
    for (let i = 0; i < slots.length; i += 1) {
      const root = find(i);
      const members = groups.get(root);
      if (members) members.push(i);
      else groups.set(root, [i]);
    }

    for (const members of groups.values()) {
      let nx = 0;
      let ny = 0;
      let nz = 0;
      let px = 0;
      let py = 0;
      let pz = 0;
      for (const slot of members) {
        const face = Math.floor(slots[slot] / 3);
        const weight = cornerAngles[slots[slot]];
        nx += unit[face * 3] * weight;
        ny += unit[face * 3 + 1] * weight;
        nz += unit[face * 3 + 2] * weight;
        px += unit[face * 3];
        py += unit[face * 3 + 1];
        pz += unit[face * 3 + 2];
      }
      if (Math.hypot(nx, ny, nz) < 1e-9) {
        nx = px;
        ny = py;
        nz = pz;
      }
      const length = Math.hypot(nx, ny, nz);
      outPositions.push(positions[vertex * 3], positions[vertex * 3 + 1], positions[vertex * 3 + 2]);
      if (length > 1e-12) {
        outNormals.push(nx / length, ny / length, nz / length);
      } else {
        outNormals.push(0, 0, 1);
      }
      const output = outNormals.length / 3 - 1;
      for (const slot of members) cornerOutput[slots[slot]] = output;
    }
  }

  const outIndices = new Uint32Array(indices.length);
  outIndices.set(cornerOutput);

  return {
    positions: new Float32Array(outPositions),
    normals: new Float32Array(outNormals),
    indices: outIndices,
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
   * χ = 0, which is what every designer here produces.
   */
  eulerCharacteristic: number;
  validFaces: boolean;
  volumeMm3: number;
  triangleCount: number;
}

/** Measures the closed shell the preview renders. */
export function inspectMesh(mesh: Mesh): SolidReport {
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

  const usedVertices = new Set<number>();
  for (let i = 0; i < indices.length; i += 1) usedVertices.add(indices[i]);
  const eulerCharacteristic =
    usedVertices.size - edgeOwners.size + triangleCount;

  return {
    ok: watertight && manifold && connected && validFaces && eulerCharacteristic === 0,
    watertight,
    manifold,
    connected,
    components,
    eulerCharacteristic,
    validFaces,
    volumeMm3: watertight ? mesh.volumeMm3 : 0,
    triangleCount,
  };
}

export function stlByteLength(mesh: Mesh): number {
  return 84 + mesh.triangleCount * 50;
}

/** Binary STL of the exact mesh the preview renders, in millimetres. */
export function buildBinaryStl(mesh: Mesh, header: string): ArrayBuffer {
  const buffer = new ArrayBuffer(stlByteLength(mesh));
  const view = new DataView(buffer);
  const { positions, indices } = mesh;

  for (let i = 0; i < header.length && i < 80; i += 1) {
    view.setUint8(i, header.charCodeAt(i) & 0xff);
  }
  view.setUint32(80, mesh.triangleCount, true);

  let offset = 84;
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3;
    const b = indices[i + 1] * 3;
    const c = indices[i + 2] * 3;

    const ax = positions[a];
    const ay = positions[a + 1];
    const az = positions[a + 2];
    const bx = positions[b];
    const by = positions[b + 1];
    const bz = positions[b + 2];
    const cx = positions[c];
    const cy = positions[c + 1];
    const cz = positions[c + 2];

    let nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
    let ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    let nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const length = Math.hypot(nx, ny, nz);
    if (length > 1e-12) {
      nx /= length;
      ny /= length;
      nz /= length;
    } else {
      nx = 0;
      ny = 0;
      nz = 0;
    }

    view.setFloat32(offset, nx, true);
    view.setFloat32(offset + 4, ny, true);
    view.setFloat32(offset + 8, nz, true);

    view.setFloat32(offset + 12, ax, true);
    view.setFloat32(offset + 16, ay, true);
    view.setFloat32(offset + 20, az, true);
    view.setFloat32(offset + 24, bx, true);
    view.setFloat32(offset + 28, by, true);
    view.setFloat32(offset + 32, bz, true);
    view.setFloat32(offset + 36, cx, true);
    view.setFloat32(offset + 40, cy, true);
    view.setFloat32(offset + 44, cz, true);
    view.setUint16(offset + 48, 0, true);

    offset += 50;
  }

  return buffer;
}

/** Triggers a download of an STL buffer from the browser. */
export function downloadStl(buffer: ArrayBuffer, fileName: string): void {
  const blob = new Blob([buffer], { type: "model/stl" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
