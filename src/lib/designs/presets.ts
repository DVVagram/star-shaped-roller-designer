import {
  decimalsFor,
  formatNumber,
  parseInput,
  type LengthUnit,
} from "@/lib/kit/units";

import type { AnyDesign, DesignFamily } from "./types";

export interface StartingPreset {
  id: string;
  label: string;
  description: string;
  /** Canonical values in millimetres. */
  values: Record<string, string>;
}

const FAMILY_LABELS: Record<DesignFamily, [string, string]> = {
  wheels: ["Compact", "Oversize"],
  drives: ["Compact", "Oversize"],
  fixings: ["Compact", "Oversize"],
  vessels: ["Compact", "Oversize"],
  motion: ["Compact", "Oversize"],
  text: ["Compact", "Oversize"],
};

/** Scales length fields while keeping counts, toggles and menu choices fixed. */
export function scaleLengthValues(
  defaults: Record<string, string>,
  lengthFields: readonly string[],
  factor: number,
  limits?: Partial<Record<string, { min?: number; max?: number }>>,
): Record<string, string> {
  const next = { ...defaults };
  for (const key of lengthFields) {
    const parsed = parseInput(defaults[key] ?? "");
    if (parsed === null) continue;
    if (parsed === 0) {
      next[key] = defaults[key];
      continue;
    }
    const limit = limits?.[key];
    let scaled = parsed * factor;
    if (limit?.min !== undefined) scaled = Math.max(limit.min, scaled);
    if (limit?.max !== undefined) scaled = Math.min(limit.max, scaled);
    next[key] = formatNumber(scaled, 3);
  }
  return next;
}

function sameValues(a: Record<string, string>, b: Record<string, string>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) if ((a[key] ?? "") !== (b[key] ?? "")) return false;
  return true;
}

/**
 * Produces Standard plus up to two viable variants. A candidate that the
 * designer rejects is skipped rather than shown as a broken preset.
 */
export function buildDesignPresets(design: AnyDesign): StartingPreset[] {
  const [smallLabel, largeLabel] = FAMILY_LABELS[design.family];
  const limits: Partial<Record<string, { min?: number; max?: number }>> = {};
  for (const field of design.fields) {
    if (field.kind === "length") limits[field.key] = { min: field.min, max: field.max };
  }

  const preset: StartingPreset = {
    id: "standard",
    label: "Standard",
    description: "The designer's balanced default configuration.",
    values: { ...design.defaults },
  };
  const presets = [preset];

  const add = (id: string, label: string, factor: number, description: string) => {
    const values = scaleLengthValues(design.defaults, design.lengthFields, factor, limits);
    if (sameValues(values, design.defaults) || presets.some((item) => sameValues(item.values, values))) {
      return false;
    }
    try {
      const result = design.derive({ values, units: "mm" });
      if (result.errors.length > 0) return false;
    } catch {
      return false;
    }
    presets.push({ id, label, description, values });
    return true;
  };

  for (const factor of [0.72, 0.82, 0.9]) {
    if (add("compact", smallLabel, factor, "A smaller starting point; every field stays editable.")) {
      break;
    }
  }
  for (const factor of [1.35, 1.22, 1.12]) {
    if (add("large", largeLabel, factor, "A larger starting point; every field stays editable.")) {
      break;
    }
  }

  return presets;
}

/** Converts canonical millimetre preset strings into the form's active unit. */
export function presetValuesForUnits(
  values: Record<string, string>,
  lengthFields: readonly string[],
  units: LengthUnit,
): Record<string, string> {
  if (units === "mm") return { ...values };
  const next = { ...values };
  for (const key of lengthFields) {
    const parsed = parseInput(values[key] ?? "");
    if (parsed === null) continue;
    next[key] = formatNumber(parsed / 25.4, decimalsFor(units));
  }
  return next;
}

export function presetMatches(
  current: Record<string, string>,
  preset: StartingPreset,
  lengthFields: readonly string[],
  units: LengthUnit,
): boolean {
  return sameValues(current, presetValuesForUnits(preset.values, lengthFields, units));
}
