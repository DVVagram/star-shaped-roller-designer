/**
 * Contracts and input labels for the four original builders.
 *
 * They predate the schema-driven library, so their forms are hand-written; this
 * module gives them the same capability statement and artifact record as every
 * other designer. Inputs are recorded from the raw form strings and selected
 * units, so an inch entry stays an inch entry in the specification.
 */

import type { LengthUnit } from "@/lib/kit/units";
import { BORE_SHAPES } from "@/lib/kit/units";
import type { FanField } from "@/lib/fan";
import type { PropellerField } from "@/lib/propeller";
import type { SprocketField } from "@/lib/sprocket";
import { SPIKE_SHAPES } from "@/lib/star/geometry";
import type { BuilderState } from "@/lib/star/builder";
import type { BoreShape } from "@/lib/kit/units";

import { contractFor, type DesignContract } from "./contracts";
import { USE_CASES } from "./use-cases";
import type { ArtifactRecord } from "./spec";

function augmented(id: string, use: string, extra: string[]): DesignContract {
  const base = contractFor(id, use);
  return { ...base, limitations: [...extra, ...base.limitations] };
}

export const LEGACY_CONTRACTS: Record<
  "star" | "sprocket" | "impeller" | "propeller",
  DesignContract
> = {
  star: augmented("star", USE_CASES.star, [
    "Not a rated drive wheel: spike strength, shaft torque and contact grip are not validated.",
  ]),
  sprocket: augmented("sprocket", USE_CASES.sprocket, [
    "Chain engagement is not demonstrated; test-fit a short chain run before use.",
  ]),
  impeller: augmented("impeller", USE_CASES.impeller, [
    "No airflow, thrust, balance or safe-speed rating is provided; guard any rotating part.",
  ]),
  propeller: augmented("propeller", USE_CASES.propeller, [
    "No thrust, balance or safe-speed rating is provided; this is a geometry prototype.",
  ]),
};

const bore = (shape: BoreShape): string => BORE_SHAPES[shape].label;

/** Records the string exactly as typed, with the selected unit for lengths. */
function typed(value: string | undefined, units: LengthUnit, length = true): string {
  const text = (value ?? "").trim();
  if (!text) return "(empty)";
  return length ? `${text} ${units}` : text;
}

const degrees = (value: string | undefined): string => {
  const text = (value ?? "").trim();
  return text ? `${text}°` : "(empty)";
};

export function starEnteredValues(
  state: Pick<
    BuilderState,
    "values" | "units" | "spikeShape" | "boreShape" | "hubEnabled"
  >,
) {
  const { values, units } = state;
  return [
    { label: "Wheel diameter", value: typed(values.outerDiameter, units) },
    { label: "Thickness", value: typed(values.thickness, units) },
    { label: "Spikes", value: typed(values.spikeCount, units, false) },
    { label: "Spike depth", value: typed(values.spikeDepth, units) },
    { label: "Spike shape", value: SPIKE_SHAPES[state.spikeShape].label },
    { label: "Tip width", value: typed(values.tipWidth, units) },
    { label: "Valley width", value: typed(values.valleyWidth, units) },
    { label: "Tip taper", value: typed(values.taper, units) },
    { label: "Centre hole", value: typed(values.bore, units) },
    { label: "Hole shape", value: bore(state.boreShape) },
    { label: "Hub", value: state.hubEnabled ? "Yes" : "No" },
    { label: "Hub diameter", value: typed(values.hubDiameter, units) },
    { label: "Hub height", value: typed(values.hubHeight, units) },
  ];
}

export function sprocketEnteredValues(
  values: Record<SprocketField, string>,
  units: LengthUnit,
  options: { toothProfile: string; boreShape: BoreShape; hubEnabled: boolean },
) {
  return [
    { label: "Chain pitch", value: typed(values.pitch, units) },
    { label: "Roller diameter", value: typed(values.roller, units) },
    { label: "Teeth", value: typed(values.teeth, units, false) },
    { label: "Seat clearance", value: typed(values.clearance, units) },
    { label: "Tooth height", value: typed(values.toothHeight, units) },
    { label: "Tooth profile", value: options.toothProfile },
    { label: "Tip width", value: typed(values.tipWidth, units) },
    { label: "Thickness", value: typed(values.thickness, units) },
    { label: "Centre hole", value: typed(values.bore, units) },
    { label: "Hole shape", value: bore(options.boreShape) },
    { label: "Hub", value: options.hubEnabled ? "Yes" : "No" },
    { label: "Hub diameter", value: typed(values.hubDiameter, units) },
    { label: "Hub height", value: typed(values.hubHeight, units) },
  ];
}

function rotorCommon(
  values: Record<
    "tipDiameter" | "hubDiameter" | "bladeCount" | "rootWidth" | "tipWidth" |
      "tipRounding" | "tipEdgeRounding" | "bladeHeight" | "bladeSweep" | "bore",
    string
  >,
  units: LengthUnit,
  boreShape: BoreShape,
) {
  return [
    { label: "Tip diameter", value: typed(values.tipDiameter, units) },
    { label: "Hub diameter", value: typed(values.hubDiameter, units) },
    { label: "Blades", value: typed(values.bladeCount, units, false) },
    { label: "Root chord", value: typed(values.rootWidth, units) },
    { label: "Tip chord", value: typed(values.tipWidth, units) },
    { label: "Tip rounding", value: typed(values.tipRounding, units) },
    { label: "Tip edge rounding", value: typed(values.tipEdgeRounding, units) },
    { label: "Blade height", value: typed(values.bladeHeight, units) },
    { label: "Blade sweep", value: degrees(values.bladeSweep) },
    { label: "Centre hole", value: typed(values.bore, units) },
    { label: "Hole shape", value: bore(boreShape) },
  ];
}

export function fanEnteredValues(
  values: Record<FanField, string>,
  units: LengthUnit,
  boreShape: BoreShape,
) {
  const common = rotorCommon(values, units, boreShape);
  return [
    ...common.slice(0, 8),
    { label: "Blade angle", value: degrees(values.bladeAngle) },
    ...common.slice(8),
  ];
}

export function propellerEnteredValues(
  values: Record<PropellerField, string>,
  units: LengthUnit,
  boreShape: BoreShape,
) {
  const common = rotorCommon(values, units, boreShape);
  return [
    ...common.slice(0, 8),
    { label: "Pitch", value: typed(values.pitch, units) },
    ...common.slice(8),
  ];
}

export function legacyRecord(
  id: keyof typeof LEGACY_CONTRACTS,
  name: string,
  inputs: { label: string; value: string }[],
  derived: { label: string; value: string; source: "input" | "calc" }[],
  warnings: string[],
  mesh: NonNullable<ArtifactRecord["mesh"]>,
): ArtifactRecord {
  return {
    id,
    name,
    contract: LEGACY_CONTRACTS[id],
    inputs,
    derived,
    warnings,
    errors: [],
    mesh,
  };
}
