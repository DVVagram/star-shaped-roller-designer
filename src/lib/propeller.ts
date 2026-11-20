import {
  lengthPrecisionMm,
  parseInput,
  roundTo,
  unitToMm,
  type BoreShape,
  type LengthUnit,
} from "./kit/units";
import { bladeAngleForPitch, rotorCode, type RotorSpec } from "./rotor";

export type PropellerField =
  | "tipDiameter"
  | "hubDiameter"
  | "bladeCount"
  | "rootWidth"
  | "tipWidth"
  | "tipRounding"
  | "bladeHeight"
  | "pitch"
  | "bladeSweep"
  | "bore";

export const PROPELLER_LENGTH_FIELDS: PropellerField[] = [
  "tipDiameter",
  "hubDiameter",
  "rootWidth",
  "tipWidth",
  "tipRounding",
  "bladeHeight",
  "pitch",
  "bore",
];

export function propellerDefaultValues(): Record<PropellerField, string> {
  return {
    tipDiameter: "160",
    hubDiameter: "26",
    bladeCount: "3",
    rootWidth: "16",
    tipWidth: "9",
    tipRounding: "4",
    bladeHeight: "34",
    pitch: "150",
    bladeSweep: "6",
    bore: "6",
  };
}

/**
 * The propeller is a rotor whose lean is derived from the pitch it would
 * advance in one revolution, measured at 70 % of the tip radius. Keeping the
 * pitch as the input means changing the diameter keeps the prop's character.
 */
export function buildPropellerSpec(
  values: Record<PropellerField, string>,
  units: LengthUnit,
  boreShape: BoreShape,
): { spec: Partial<RotorSpec>; complete: boolean } {
  const length = (field: PropellerField): number | undefined => {
    const parsed = parseInput(values[field]);
    return parsed === null
      ? undefined
      : roundTo(unitToMm(parsed, units), lengthPrecisionMm(units));
  };
  const bladeCount = parseInput(values.bladeCount);
  const pitch = length("pitch");
  const tipDiameter = length("tipDiameter");
  const bladeSweep = parseInput(values.bladeSweep);

  const spec: Partial<RotorSpec> = {
    tipDiameterMm: tipDiameter,
    hubDiameterMm: length("hubDiameter"),
    bladeCount:
      bladeCount !== null && Number.isInteger(bladeCount) ? bladeCount : undefined,
    rootWidthMm: length("rootWidth"),
    tipWidthMm: length("tipWidth"),
    tipRoundingMm: length("tipRounding"),
    bladeHeightMm: length("bladeHeight"),
    bladeAngleDeg:
      pitch !== undefined && tipDiameter !== undefined
        ? bladeAngleForPitch(pitch, tipDiameter)
        : undefined,
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
    spec.bladeHeightMm !== undefined &&
    spec.bladeAngleDeg !== undefined &&
    spec.bladeSweepDeg !== undefined &&
    spec.boreMm !== undefined;

  return { spec, complete };
}

export const PROPELLER_DEFAULT_SPEC: RotorSpec = buildPropellerSpec(
  propellerDefaultValues(),
  "mm",
  "round",
).spec as RotorSpec;

export function propellerCode(spec: RotorSpec): string {
  return rotorCode(spec, "PP");
}
