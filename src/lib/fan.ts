import {
  lengthPrecisionMm,
  parseInput,
  roundTo,
  unitToMm,
  type BoreShape,
  type LengthUnit,
} from "./kit/units";
import { rotorCode, type RotorSpec } from "./rotor";

export type FanField =
  | "tipDiameter"
  | "hubDiameter"
  | "bladeCount"
  | "rootWidth"
  | "tipWidth"
  | "tipRounding"
  | "tipEdgeRounding"
  | "bladeHeight"
  | "bladeAngle"
  | "bladeSweep"
  | "bore";

export const FAN_LENGTH_FIELDS: FanField[] = [
  "tipDiameter",
  "hubDiameter",
  "rootWidth",
  "tipWidth",
  "tipRounding",
  "tipEdgeRounding",
  "bladeHeight",
  "bore",
];

export function fanDefaultValues(): Record<FanField, string> {
  return {
    tipDiameter: "150",
    hubDiameter: "58",
    bladeCount: "6",
    rootWidth: "24",
    tipWidth: "17",
    tipRounding: "6",
    tipEdgeRounding: "4",
    bladeHeight: "26",
    bladeAngle: "34",
    bladeSweep: "26",
    bore: "8",
  };
}

export function buildFanSpec(
  values: Record<FanField, string>,
  units: LengthUnit,
  boreShape: BoreShape,
): { spec: Partial<RotorSpec>; complete: boolean } {
  const length = (field: FanField): number | undefined => {
    const parsed = parseInput(values[field]);
    return parsed === null
      ? undefined
      : roundTo(unitToMm(parsed, units), lengthPrecisionMm(units));
  };
  const bladeCount = parseInput(values.bladeCount);
  const bladeAngle = parseInput(values.bladeAngle);
  const bladeSweep = parseInput(values.bladeSweep);

  const spec: Partial<RotorSpec> = {
    tipDiameterMm: length("tipDiameter"),
    hubDiameterMm: length("hubDiameter"),
    bladeCount:
      bladeCount !== null && Number.isInteger(bladeCount) ? bladeCount : undefined,
    rootWidthMm: length("rootWidth"),
    tipWidthMm: length("tipWidth"),
    tipRoundingMm: length("tipRounding"),
    tipEdgeRoundingMm: length("tipEdgeRounding"),
    bladeHeightMm: length("bladeHeight"),
    bladeAngleDeg: bladeAngle ?? undefined,
    bladeSweepDeg: bladeSweep ?? undefined,
    boreMm: length("bore"),
    boreShape,
  };

  const complete =
    spec.tipDiameterMm !== undefined &&
    spec.hubDiameterMm !== undefined &&
    spec.bladeCount !== undefined &&
    spec.rootWidthMm !== undefined &&
    spec.tipWidthMm !== undefined &&
    spec.tipRoundingMm !== undefined &&
    spec.tipEdgeRoundingMm !== undefined &&
    spec.bladeHeightMm !== undefined &&
    spec.bladeAngleDeg !== undefined &&
    spec.bladeSweepDeg !== undefined &&
    spec.boreMm !== undefined;

  return { spec, complete };
}

export const FAN_DEFAULT_SPEC: RotorSpec = buildFanSpec(
  fanDefaultValues(),
  "mm",
  "round",
).spec as RotorSpec;

export function fanCode(spec: RotorSpec): string {
  return rotorCode(spec, "FN");
}
