/**
 * Measurement sheet generated from the exported mesh.
 *
 * Two orthographic wireframes, overall extents, the origin and the design
 * identity. This is a fit-check drawing derived from the same vertices as the
 * STL, not a tolerance or manufacturing drawing.
 */

import { inspectMesh, type Mesh } from "@/lib/kit/solid";
import { formatNumber } from "@/lib/kit/units";

import { CAPABILITIES, type DesignContract } from "./contracts";
import type { AnyDesign, RawValues } from "./types";

const WIDTH = 820;
const PANEL = { width: 340, height: 260 };

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function uniqueEdges(mesh: Mesh): [number, number][] {
  const seen = new Set<string>();
  const edges: [number, number][] = [];
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const tri = [mesh.indices[i], mesh.indices[i + 1], mesh.indices[i + 2]];
    for (let e = 0; e < 3; e += 1) {
      const a = tri[e];
      const b = tri[(e + 1) % 3];
      if (a === b) continue;
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([a, b]);
    }
  }
  return edges;
}

interface View {
  x: number;
  y: number;
  /** Projected coordinates in model space. */
  project: (x: number, y: number, z: number) => [number, number];
  label: string;
  horizontal: string;
  vertical: string;
}

function panel(view: View, mesh: Mesh, edges: [number, number][]): string {
  const points = edges.map(([a, b]) => {
    const pa = view.project(
      mesh.positions[a * 3],
      mesh.positions[a * 3 + 1],
      mesh.positions[a * 3 + 2],
    );
    const pb = view.project(
      mesh.positions[b * 3],
      mesh.positions[b * 3 + 1],
      mesh.positions[b * 3 + 2],
    );
    return [pa, pb] as const;
  });
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [a, b] of points) {
    for (const [px, py] of [a, b]) {
      minX = Math.min(minX, px);
      maxX = Math.max(maxX, px);
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py);
    }
  }
  const spanX = Math.max(1e-6, maxX - minX);
  const spanY = Math.max(1e-6, maxY - minY);
  const scale = Math.min((PANEL.width - 56) / spanX, (PANEL.height - 56) / spanY);
  const offsetX = view.x + (PANEL.width - spanX * scale) / 2;
  // SVG y grows downward; flip model y so +Y is up.
  const offsetY = view.y + (PANEL.height + spanY * scale) / 2;
  const toSvg = ([px, py]: [number, number]): [number, number] => [
    offsetX + (px - minX) * scale,
    offsetY - (py - minY) * scale,
  ];

  const stride = Math.max(1, Math.ceil(points.length / 9000));
  const paths: string[] = [];
  for (let i = 0; i < points.length; i += stride) {
    const [a, b] = points[i];
    const [ax, ay] = toSvg(a);
    const [bx, by] = toSvg(b);
    paths.push(`M${ax.toFixed(2)} ${ay.toFixed(2)}L${bx.toFixed(2)} ${by.toFixed(2)}`);
  }

  const left = toSvg([minX, maxY])[0];
  const right = toSvg([maxX, maxY])[0];
  const top = toSvg([minX, maxY])[1];
  const bottom = toSvg([minX, minY])[1];
  const [originX, originY] = toSvg([0, 0]);
  const widthMm = maxX - minX;
  const heightMm = maxY - minY;

  return `<g id="view-${escapeXml(view.label)}">
    <rect x="${view.x}" y="${view.y}" width="${PANEL.width}" height="${PANEL.height}" rx="8" fill="#fbfaf7" stroke="#d8d4ca"/>
    <text x="${view.x + 12}" y="${view.y + 20}" font-size="11" font-weight="600" fill="#57534e">${escapeXml(view.label)}</text>
    <path d="${paths.join("")}" fill="none" stroke="#1f2937" stroke-width="0.7" stroke-linejoin="round"/>
    <line x1="${left}" y1="${bottom + 16}" x2="${right}" y2="${bottom + 16}" stroke="#c2410c" stroke-width="1"/>
    <line x1="${left}" y1="${bottom + 12}" x2="${left}" y2="${bottom + 20}" stroke="#c2410c"/>
    <line x1="${right}" y1="${bottom + 12}" x2="${right}" y2="${bottom + 20}" stroke="#c2410c"/>
    <text x="${(left + right) / 2}" y="${bottom + 32}" text-anchor="middle" font-size="11" fill="#9a3412">${escapeXml(view.horizontal)} ${formatNumber(widthMm, 2)} mm</text>
    <line x1="${left - 16}" y1="${top}" x2="${left - 16}" y2="${bottom}" stroke="#c2410c" stroke-width="1"/>
    <line x1="${left - 20}" y1="${top}" x2="${left - 12}" y2="${top}" stroke="#c2410c"/>
    <line x1="${left - 20}" y1="${bottom}" x2="${left - 12}" y2="${bottom}" stroke="#c2410c"/>
    <text x="${left - 24}" y="${(top + bottom) / 2}" text-anchor="middle" font-size="11" fill="#9a3412" transform="rotate(-90 ${left - 24} ${(top + bottom) / 2})">${escapeXml(view.vertical)} ${formatNumber(heightMm, 2)} mm</text>
    <line x1="${originX - 10}" y1="${originY}" x2="${originX + 16}" y2="${originY}" stroke="#2563eb" stroke-width="1"/>
    <line x1="${originX}" y1="${originY + 10}" x2="${originX}" y2="${originY - 16}" stroke="#2563eb" stroke-width="1"/>
    <circle cx="${originX}" cy="${originY}" r="2.4" fill="#2563eb"/>
    <text x="${originX + 19}" y="${originY + 3}" font-size="9" fill="#1d4ed8">0</text>
  </g>`;
}

export interface DrawingRecord {
  id: string;
  name: string;
  contract: DesignContract;
  mesh: Mesh;
}

/** Renders a sheet for any mesh; no design schema required. */
export function renderRecordDrawingSvg(record: DrawingRecord): string {
  const { mesh, contract } = record;
  const report = inspectMesh(mesh);
  const edges = uniqueEdges(mesh);
  const [[minX, minY, minZ], [maxX, maxY, maxZ]] = [
    mesh.boundingBox.min,
    mesh.boundingBox.max,
  ];
  const capability = CAPABILITIES[contract.capability];

  const top: View = {
    x: 40,
    y: 104,
    project: (x, y) => [x, y],
    label: "Top view (X / Y)",
    horizontal: "X",
    vertical: "Y",
  };
  const front: View = {
    x: 420,
    y: 104,
    project: (x, _y, z) => [x, z],
    label: "Front view (X / Z)",
    horizontal: "X",
    vertical: "Z",
  };

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="560" viewBox="0 0 ${WIDTH} 560" font-family="Geist, system-ui, sans-serif">
  <rect width="${WIDTH}" height="560" fill="#ffffff"/>
  <text x="40" y="36" font-size="18" font-weight="700" fill="#15171c">${escapeXml(record.name)} — measurement sheet</text>
  <text x="40" y="55" font-size="11" fill="#57534e">Design ID: ${escapeXml(record.id)} · units: millimetres · triangles: ${report.triangleCount} · volume: ${formatNumber(report.volumeMm3 / 1000, 2)} cm³</text>
  <text x="40" y="72" font-size="11" fill="#9a3412">Capability: ${escapeXml(capability.label)}</text>
  <text x="40" y="88" font-size="10" fill="#57534e">${escapeXml(capability.description)}</text>
  ${panel(top, mesh, edges)}
  ${panel(front, mesh, edges)}
  <text x="40" y="398" font-size="11" fill="#15171c">Overall envelope: ${formatNumber(maxX - minX, 2)} × ${formatNumber(maxY - minY, 2)} × ${formatNumber(maxZ - minZ, 2)} mm (X × Y × Z)</text>
  <text x="40" y="418" font-size="10" fill="#57534e">Projected wireframe of the exported mesh; internal holes appear as edges. Origin (0,0,0) is marked in blue.</text>
  <text x="40" y="436" font-size="10" fill="#57534e">${escapeXml(contract.mating)}</text>
  <text x="40" y="454" font-size="10" fill="#b91c1c">Not a tolerance drawing. Verify dimensions on a test print; the STL carries no units or metadata.</text>
  <text x="40" y="472" font-size="10" fill="#57534e">Fit allowance: ${escapeXml(contract.fitAllowance)}</text>
  <text x="40" y="490" font-size="10" fill="#57534e">Limitation: ${escapeXml(contract.limitations[0] ?? "")}</text>
  <line x1="40" y1="508" x2="780" y2="508" stroke="#e7e3da"/>
  <text x="40" y="528" font-size="9" fill="#78716c">Generated from the same parameters as the preview and STL. No material, strength, fit or safety certification is implied.</text>
</svg>`;
}

export function buildDrawingSvg(design: AnyDesign, raw: RawValues): string {
  return renderRecordDrawingSvg({
    id: design.id,
    name: design.name,
    contract: design.contract,
    mesh: design.build(raw),
  });
}

export function drawingFileName(design: AnyDesign, raw: RawValues): string {
  return design.fileName(raw).replace(/\.stl$/i, "-drawing.svg");
}
