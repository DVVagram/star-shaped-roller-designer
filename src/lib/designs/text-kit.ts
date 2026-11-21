/**
 * Vector lettering for the text designers.
 *
 * The fonts are the three.js example typefaces (helvetiker, optimer and droid
 * sans mono), parsed once at module load. Lettering is extruded with three's
 * ExtrudeGeometry, which returns one closed body per glyph; the plate and those
 * bodies are concatenated into one mesh and reported as a multi-body part.
 */

import { ExtrudeGeometry } from "three";
import { FontLoader, type Font } from "three/examples/jsm/loaders/FontLoader.js";

import helvetikerBold from "@/assets/fonts/helvetiker_bold.typeface.json";
import helvetikerRegular from "@/assets/fonts/helvetiker_regular.typeface.json";
import droidMono from "@/assets/fonts/droid_sans_mono_regular.typeface.json";
import optimerRegular from "@/assets/fonts/optimer_regular.typeface.json";

import type { Mesh } from "@/lib/kit/solid";

export type FontId = "sans" | "sans-bold" | "serif" | "mono";

const loader = new FontLoader();

export const FONT_FACES: Record<FontId, { label: string; font: Font }> = {
  sans: { label: "Sans", font: loader.parse(helvetikerRegular) },
  "sans-bold": { label: "Sans bold", font: loader.parse(helvetikerBold) },
  serif: { label: "Serif", font: loader.parse(optimerRegular) },
  mono: { label: "Mono", font: loader.parse(droidMono) },
};

export const FONT_IDS = Object.keys(FONT_FACES) as FontId[];

/** Characters the bundled typefaces cover and the form accepts. */
export const TEXT_PATTERN = /^[A-Z0-9 .,'&!?+-]+$/;

export function isFontId(value: string): value is FontId {
  return value in FONT_FACES;
}

/** Advance width of one string in millimetres, kerning ignored. */
export function textWidthMm(text: string, fontId: FontId, sizeMm: number): number {
  const face = FONT_FACES[fontId] ?? FONT_FACES.sans;
  const { glyphs, resolution } = face.font.data;
  let units = 0;
  for (const char of text) {
    units += glyphs[char]?.ha ?? resolution * 0.6;
  }
  return (units / resolution) * sizeMm;
}

/**
 * ExtrudeGeometry is non-indexed, so every triangle owns its vertices and the
 * shared edges in `inspectMesh` would never match. Welding coincident positions
 * restores the indexed topology a closed shell needs.
 */
function weld(raw: Float32Array): { positions: Float32Array; indices: Uint32Array } {
  const lookup = new Map<string, number>();
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i < raw.length; i += 3) {
    const key = `${Math.round(raw[i] * 1e4)},${Math.round(raw[i + 1] * 1e4)},${Math.round(raw[i + 2] * 1e4)}`;
    let index = lookup.get(key);
    if (index === undefined) {
      index = positions.length / 3;
      lookup.set(key, index);
      positions.push(raw[i], raw[i + 1], raw[i + 2]);
    }
    indices.push(index);
  }
  return { positions: Float32Array.from(positions), indices: Uint32Array.from(indices) };
}

function signedVolume(positions: Float32Array, indices: Uint32Array): number {
  let six = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3;
    const b = indices[i + 1] * 3;
    const c = indices[i + 2] * 3;
    six +=
      positions[a] *
        (positions[b + 1] * positions[c + 2] - positions[c + 1] * positions[b + 2]) -
      positions[b] *
        (positions[a + 1] * positions[c + 2] - positions[c + 1] * positions[a + 2]) +
      positions[c] *
        (positions[a + 1] * positions[b + 2] - positions[b + 1] * positions[a + 2]);
  }
  return six / 6;
}

export interface TextMeshInput {
  text: string;
  fontId: FontId;
  sizeMm: number;
  depthMm: number;
  /** Mirror across X, for a stamp that has to read correctly when printed. */
  mirror?: boolean;
}

/**
 * One mesh holding every glyph, centred on X and Y with its base at Z = 0.
 * Each glyph is a separate closed body, which is what `multiBody` reports.
 */
export function buildTextMesh(input: TextMeshInput): Mesh {
  const face = FONT_FACES[input.fontId] ?? FONT_FACES.sans;
  const shapes = face.font.generateShapes(input.text, input.sizeMm);
  const geometry = new ExtrudeGeometry(shapes, {
    depth: Math.max(0.2, input.depthMm),
    bevelEnabled: false,
    curveSegments: 4,
    steps: 1,
  });
  const attribute = geometry.getAttribute("position");
  const welded = weld(Float32Array.from(attribute.array as ArrayLike<number>));
  geometry.dispose();
  const { positions, indices } = welded;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    minX = Math.min(minX, positions[i]);
    maxX = Math.max(maxX, positions[i]);
    minY = Math.min(minY, positions[i + 1]);
    maxY = Math.max(maxY, positions[i + 1]);
    minZ = Math.min(minZ, positions[i + 2]);
    maxZ = Math.max(maxZ, positions[i + 2]);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] = (positions[i] - cx) * (input.mirror ? -1 : 1);
    positions[i + 1] -= cy;
    positions[i + 2] -= minZ;
  }

  let volume = signedVolume(positions, indices);
  if (volume < 0) {
    for (let i = 0; i < indices.length; i += 3) {
      const swap = indices[i + 1];
      indices[i + 1] = indices[i + 2];
      indices[i + 2] = swap;
    }
    volume = -volume;
  }

  const box: Mesh["boundingBox"] = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
  for (let i = 0; i < positions.length; i += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      box.min[axis] = Math.min(box.min[axis], positions[i + axis]);
      box.max[axis] = Math.max(box.max[axis], positions[i + axis]);
    }
  }

  return {
    positions,
    indices,
    triangleCount: indices.length / 3,
    volumeMm3: volume,
    boundingBox: box,
  };
}

/** Shifts a mesh and returns a new one; used to seat lettering on a plate. */
export function translateMesh(mesh: Mesh, dx: number, dy: number, dz: number): Mesh {
  const positions = Float32Array.from(mesh.positions);
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] += dx;
    positions[i + 1] += dy;
    positions[i + 2] += dz;
  }
  return { ...mesh, positions, boundingBox: boundsOf(positions) };
}

function boundsOf(positions: Float32Array): Mesh["boundingBox"] {
  const box: Mesh["boundingBox"] = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
  for (let i = 0; i < positions.length; i += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      box.min[axis] = Math.min(box.min[axis], positions[i + axis]);
      box.max[axis] = Math.max(box.max[axis], positions[i + axis]);
    }
  }
  return box;
}

/** Concatenates closed bodies into one mesh, keeping every triangle. */
export function mergeMeshes(meshes: Mesh[]): Mesh {
  const positionCount = meshes.reduce((sum, mesh) => sum + mesh.positions.length, 0);
  const indexCount = meshes.reduce((sum, mesh) => sum + mesh.indices.length, 0);
  const positions = new Float32Array(positionCount);
  const indices = new Uint32Array(indexCount);
  let positionOffset = 0;
  let indexOffset = 0;
  let vertexBase = 0;
  let volume = 0;
  for (const mesh of meshes) {
    positions.set(mesh.positions, positionOffset);
    for (let i = 0; i < mesh.indices.length; i += 1) {
      indices[indexOffset + i] = mesh.indices[i] + vertexBase;
    }
    positionOffset += mesh.positions.length;
    indexOffset += mesh.indices.length;
    vertexBase += mesh.positions.length / 3;
    volume += mesh.volumeMm3;
  }
  return {
    positions,
    indices,
    triangleCount: indices.length / 3,
    volumeMm3: volume,
    boundingBox: boundsOf(positions),
  };
}
