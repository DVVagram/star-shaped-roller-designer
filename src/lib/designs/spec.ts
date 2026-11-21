/**
 * A human-readable specification built from the same parameters as the mesh.
 *
 * The STL carries no units, tolerances or capability metadata, so this text is
 * the accompanying record: entered values, derived values, what was checked,
 * what was not, and how the part may be used. The record renderer is shared by
 * the schema-driven designers and the four original builders.
 */

import { inspectMesh, type Mesh } from "@/lib/kit/solid";
import {
  formatNumber,
  parseInput,
  unitToMm,
  type LengthUnit,
} from "@/lib/kit/units";

import {
  CAPABILITIES,
  VALIDATION_CHECKS,
  type DesignContract,
} from "./contracts";
import type { AnyDesign, RawValues } from "./types";

export const LIBRARY_VERSION = "1.0";

export interface ArtifactRecord {
  id: string;
  name: string;
  contract: DesignContract;
  inputs: { label: string; value: string }[];
  derived: { label: string; value: string; source: "input" | "calc" }[];
  warnings: string[];
  errors: { field: string; message: string }[];
  mesh: Mesh | null;
  /** True when the plate and its lettering are deliberately separate shells. */
  multiBody?: boolean;
}

function entered(fieldKind: string, raw: RawValues, key: string): string {
  const value = raw.values[key] ?? "";
  if (fieldKind !== "length") return value;
  const parsed = parseInput(value);
  if (parsed === null) return value || "(empty)";
  return `${value} ${raw.units} (${formatNumber(unitToMm(parsed, raw.units), 3)} mm)`;
}

/** Renders any artifact record; no design schema required. */
export function renderRecordSpecification(
  record: ArtifactRecord,
  options: { generatedAt?: Date } = {},
): string {
  const { contract } = record;
  const unitNote =
    "All internal geometry is in millimetres. STL is unitless: import at millimetre scale and verify orientation.";
  const generatedAt = options.generatedAt ?? new Date();
  const lines: string[] = [];

  lines.push(`PARAMETRIC WHEEL WORKS — SPECIFICATION`);
  lines.push(`Design: ${record.name}`);
  lines.push(`Design ID: ${record.id}`);
  lines.push(`Library version: ${LIBRARY_VERSION}`);
  lines.push(`Generated: ${generatedAt.toISOString()}`);
  lines.push("");
  lines.push(`CAPABILITY: ${CAPABILITIES[contract.capability].label}`);
  lines.push(CAPABILITIES[contract.capability].description);
  lines.push("");
  lines.push(`Intended use: ${contract.intendedUse}`);
  lines.push(`Standard: ${contract.standard}`);
  lines.push(`Required mating dimensions: ${contract.mating}`);
  lines.push(`Fit allowance: ${contract.fitAllowance}`);
  lines.push("");
  lines.push("LIMITATIONS");
  for (const limitation of contract.limitations) lines.push(`- ${limitation}`);
  lines.push("");
  lines.push(`UNITS`);
  lines.push(unitNote);
  lines.push("");
  lines.push("ENTERED VALUES");
  for (const input of record.inputs) lines.push(`- ${input.label}: ${input.value}`);
  lines.push("");
  lines.push("DERIVED VALUES");
  if (record.derived.length === 0) lines.push("- none");
  for (const row of record.derived) lines.push(`- ${row.label}: ${row.value} (${row.source})`);
  lines.push("");
  lines.push("VALIDATION");
  if (record.errors.length === 0) {
    lines.push("- Configuration accepted.");
  } else {
    for (const issue of record.errors) lines.push(`- ERROR ${issue.field}: ${issue.message}`);
  }
  for (const warning of record.warnings) lines.push(`- WARNING ${warning}`);
  if (record.errors.length === 0 && record.mesh) {
    const mesh = record.mesh;
    const report = inspectMesh(mesh, { allowMultipleComponents: record.multiBody });
    const multi = Boolean(record.multiBody) && report.components > 1;
    lines.push("");
    lines.push("MESH CHECKS PERFORMED");
    for (const check of VALIDATION_CHECKS) {
      const verdict = !report.ok
        ? "fail"
        : multi && check.startsWith("One connected shell")
          ? `not applicable (${report.components} closed bodies)`
          : "pass";
      lines.push(`- ${check}: ${verdict}`);
    }
    if (multi) {
      lines.push(
        `- Multi-body part: one plate plus closed letter bodies (${report.components} components), each watertight.`,
      );
    }
    lines.push(`- Triangles: ${report.triangleCount}`);
    lines.push(`- Connected components: ${report.components}`);
    lines.push(`- Zero-area cap faces (reported, not blocking): ${report.zeroAreaFaces}`);
    lines.push(`- Euler characteristic: ${report.eulerCharacteristic} (genus ${report.genus})`);
    lines.push(`- Volume: ${formatNumber(report.volumeMm3 / 1000, 3)} cm³`);
    lines.push(
      `- Bounding box: ${formatNumber(mesh.boundingBox.max[0] - mesh.boundingBox.min[0], 2)} × ${formatNumber(mesh.boundingBox.max[1] - mesh.boundingBox.min[1], 2)} × ${formatNumber(mesh.boundingBox.max[2] - mesh.boundingBox.min[2], 2)} mm`,
    );
  }
  lines.push("");
  lines.push("NOT CHECKED");
  for (const item of contract.notChecked) lines.push(`- ${item}`);
  lines.push("");
  lines.push("This specification is generated from the same parameters as the preview and STL.");
  lines.push("It is not a certificate of fit, strength, safety or standards compliance.");

  return lines.join("\n");
}

export function buildSpecification(
  design: AnyDesign,
  raw: RawValues,
  options: { generatedAt?: Date } = {},
): string {
  const result = design.derive(raw);
  const label = (key: string) =>
    design.fields.find((field) => field.key === key)?.label ?? key;
  const mesh = result.errors.length === 0 ? design.build(raw) : null;

  return renderRecordSpecification(
    {
      id: design.id,
      name: design.name,
      contract: design.contract,
      inputs: design.fields.map((field) => ({
        label: `${field.label} [${field.key}]`,
        value: entered(field.kind, raw, field.key),
      })),
      derived: result.readout,
      warnings: result.warnings.map((issue) => `${label(issue.field)}: ${issue.message}`),
      errors: result.errors,
      mesh,
      multiBody: design.multiBody,
    },
    options,
  );
}

export function specificationFileName(design: AnyDesign, raw: RawValues): string {
  return design.fileName(raw).replace(/\.stl$/i, "-spec.txt");
}

/** Loose type guard used by tests: a units value must be mm or in. */
export function isLengthUnit(value: string): value is LengthUnit {
  return value === "mm" || value === "in";
}
