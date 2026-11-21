/**
 * The schema every parametric designer in the new library shares.
 *
 * A designer declares its fields once. The same declaration drives the form, the
 * unit conversion, the millimetre parameters, the validation copy, the preview
 * and the STL file name — so the drawn part, the readout and the export cannot
 * disagree about what was asked for.
 */

import type { Mesh } from "@/lib/kit/solid";

import { USE_CASES } from "./use-cases";
import {
  formatMeasure,
  parseInput,
  unitToMm,
  type LengthUnit,
} from "@/lib/kit/units";

export type DesignFamily = "wheels" | "drives" | "fixings" | "vessels" | "motion";

export const FAMILIES: Record<DesignFamily, { label: string; blurb: string }> = {
  wheels: { label: "Wheels & rotors", blurb: "Grip, move air, throw spray." },
  drives: { label: "Gears & drives", blurb: "Transmit motion tooth by tooth." },
  fixings: { label: "Plates & fixings", blurb: "Hold, clamp and fasten." },
  vessels: { label: "Vessels & fluid", blurb: "Cups, funnels, ducts and shells." },
  motion: { label: "Motion", blurb: "Springs, bends and rolling elements." },
};

export type FieldKind = "length" | "number" | "count" | "angle" | "select" | "toggle";

export interface FieldOption {
  value: string;
  label: string;
  description?: string;
}

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  /** Card the field appears in. */
  section: string;
  default: string;
  hint?: string;
  min?: number;
  max?: number;
  options?: FieldOption[];
  /** Hidden when the predicate returns false. */
  visible?: (values: Record<string, string>) => boolean;
}

export interface RawValues {
  values: Record<string, string>;
  units: LengthUnit;
}

export interface DesignIssue {
  field: string;
  level: "error" | "warning";
  message: string;
}

export interface DesignReadout {
  label: string;
  value: string;
  source: "input" | "calc";
}

export interface DesignPreview {
  label: string;
  code: string;
  sizeMm: number;
  heightMm: number;
  cells: { label: string; value: string }[];
}

export interface DesignResult {
  errors: DesignIssue[];
  warnings: DesignIssue[];
  readout: DesignReadout[];
  preview: DesignPreview;
}

export interface DesignModule<P> {
  id: string;
  name: string;
  family: DesignFamily;
  eyebrow: string;
  blurb: string;
  lede: string;
  chips: { label: string; value: string }[];
  notes: string[];
  notesTitle?: string;
  /** What the part is for. Falls back to the shared use-case table. */
  use?: string;
  /** ASCII text written into the binary STL header. */
  header: string;
  fields: FieldDef[];
  parse: (raw: RawValues) => P;
  derive: (params: P, units: LengthUnit) => DesignResult;
  build: (params: P) => Mesh;
  fileName: (params: P) => string;
}

export interface AnyDesign {
  id: string;
  name: string;
  family: DesignFamily;
  eyebrow: string;
  blurb: string;
  lede: string;
  chips: { label: string; value: string }[];
  notes: string[];
  notesTitle: string;
  use: string;
  header: string;
  fields: FieldDef[];
  defaults: Record<string, string>;
  lengthFields: string[];
  derive: (raw: RawValues) => DesignResult;
  build: (raw: RawValues) => Mesh;
  fileName: (raw: RawValues) => string;
}

export function defineDesign<P>(module: DesignModule<P>): AnyDesign {
  return {
    id: module.id,
    name: module.name,
    family: module.family,
    eyebrow: module.eyebrow,
    blurb: module.blurb,
    lede: module.lede,
    chips: module.chips,
    notes: module.notes,
    notesTitle: module.notesTitle ?? "How the geometry is built",
    use: module.use ?? USE_CASES[module.id] ?? "",
    header: module.header,
    fields: module.fields,
    defaults: Object.fromEntries(module.fields.map((field) => [field.key, field.default])),
    lengthFields: module.fields
      .filter((field) => field.kind === "length")
      .map((field) => field.key),
    derive: (raw) => module.derive(module.parse(raw), raw.units),
    build: (raw) => module.build(module.parse(raw)),
    fileName: (raw) => module.fileName(module.parse(raw)),
  };
}

/* ------------------------------------------------------------------ parsing */

export function rawNumber(raw: RawValues, key: string): number {
  const parsed = parseInput(raw.values[key] ?? "");
  return parsed === null ? Number.NaN : parsed;
}

export function rawLength(raw: RawValues, key: string): number {
  const value = rawNumber(raw, key);
  return Number.isNaN(value) ? Number.NaN : unitToMm(value, raw.units);
}

export function rawCount(raw: RawValues, key: string): number {
  return rawNumber(raw, key);
}

export function rawOption(raw: RawValues, key: string, fallback: string): string {
  return raw.values[key] ?? fallback;
}

export function rawFlag(raw: RawValues, key: string): boolean {
  return raw.values[key] === "true";
}

/* --------------------------------------------------------------- validation */

export function shown(mm: number, units: LengthUnit, decimals?: number): string {
  return formatMeasure(mm, units, decimals);
}

export function pushRange(
  issues: DesignIssue[],
  units: LengthUnit,
  field: string,
  label: string,
  value: number,
  min: number,
  max: number,
  isLength = true,
): boolean {
  if (!Number.isFinite(value)) {
    issues.push({
      field,
      level: "error",
      message: `Enter a ${label.toLowerCase()}${
        isLength ? ` between ${shown(min, units)} and ${shown(max, units)}` : ""
      }.`,
    });
    return false;
  }
  if (value < min - 1e-9 || value > max + 1e-9) {
    issues.push({
      field,
      level: "error",
      message: `${label} must be between ${
        isLength ? `${shown(min, units)} and ${shown(max, units)}` : `${min} and ${max}`
      }.`,
    });
    return false;
  }
  return true;
}

export function pushInteger(
  issues: DesignIssue[],
  field: string,
  label: string,
  value: number,
  min: number,
  max: number,
): boolean {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    issues.push({
      field,
      level: "error",
      message: `${label} must be a whole number between ${min} and ${max}.`,
    });
    return false;
  }
  if (value < min || value > max) {
    issues.push({
      field,
      level: "error",
      message: `${label} must be between ${min} and ${max}.`,
    });
    return false;
  }
  return true;
}

export function pushWarning(
  issues: DesignIssue[],
  field: string,
  message: string,
): void {
  issues.push({ field, level: "warning", message });
}

/* ----------------------------------------------------------------- previews */

export function previewOf(
  label: string,
  code: string,
  sizeMm: number,
  heightMm: number,
  cells: { label: string; value: string }[],
): DesignPreview {
  return {
    label,
    code,
    sizeMm: Math.max(1, sizeMm),
    heightMm: Math.max(1, heightMm),
    cells,
  };
}
