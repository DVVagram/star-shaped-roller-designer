import {
  formatNumber,
  type StarSpec,
} from "./geometry";
import type { StarMesh } from "./mesh";

/** ASCII name written into the 80-byte binary STL header. */
export const STL_HEADER = "Star Shaped Roller Designer — units: mm";

export function stlByteLength(mesh: StarMesh): number {
  return 84 + mesh.triangleCount * 50;
}

/**
 * Binary STL of the exact mesh the preview renders.
 *
 * STL carries no units, so the file stays in millimetres — the unit every
 * slicer assumes — with the model centred on the origin and sitting on its
 * base plane at z = 0 in the slicer once rotated flat.
 */
export function buildBinaryStl(mesh: StarMesh): ArrayBuffer {
  const buffer = new ArrayBuffer(stlByteLength(mesh));
  const view = new DataView(buffer);
  const { positions, indices } = mesh;

  for (let i = 0; i < STL_HEADER.length && i < 80; i += 1) {
    view.setUint8(i, STL_HEADER.charCodeAt(i) & 0xff);
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

export function stlFileName(spec: StarSpec): string {
  return [
    "star-roller",
    `d${formatNumber(spec.outerDiameterMm, 0)}`,
    `${spec.spikeCount}pt`,
    `h${formatNumber(spec.thicknessMm, 0)}`,
  ].join("-") + ".stl";
}
