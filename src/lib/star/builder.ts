import {
  autoSpikeCount,
  formatNumber,
  roundTo,
  unitToMm,
  validateStar,
  type BoreShape,
  type LengthUnit,
  type SpikeFitInput,
  type SpikeShape,
  type StarSpec,
} from "./geometry";

export type NumericField =
  | "outerDiameter"
  | "thickness"
  | "spikeCount"
  | "spikeDepth"
  | "tipWidth"
  | "valleyWidth"
  | "taper"
  | "bore"
  | "hubDiameter"
  | "hubHeight";

export const LENGTH_FIELDS: NumericField[] = [
  "outerDiameter",
  "thickness",
  "spikeDepth",
  "tipWidth",
  "valleyWidth",
  "taper",
  "bore",
  "hubDiameter",
  "hubHeight",
];

export interface BuilderState {
  units: LengthUnit;
  autoSpikes: boolean;
  spikeShape: SpikeShape;
  boreShape: BoreShape;
  hubEnabled: boolean;
  values: Record<NumericField, string>;
  /** Set when an automatic recalculation changed a visible field. */
  notice: string | null;
  /** Most recent valid design, so the preview can keep showing something usable. */
  lastValidSpec: StarSpec;
}

export function parseInput(raw: string): number | null {
  const trimmed = raw.trim().replace(/\s+/g, "").replace(/,/g, ".");
  if (trimmed === "") return null;
  if (!/^-?\d*(\.\d*)?$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

export function decimalsFor(units: LengthUnit): number {
  return units === "in" ? 4 : 2;
}

/** Precision the canonical millimetre lengths are rounded to. */
export function lengthPrecisionMm(units: LengthUnit): number {
  return units === "in" ? 2 : 6;
}

export function fitInputOf(
  values: Record<NumericField, string>,
  spikeShape: SpikeShape,
  units: LengthUnit = "mm",
): SpikeFitInput | null {
  const outer = parseInput(values.outerDiameter);
  const depth = parseInput(values.spikeDepth);
  const tip = parseInput(values.tipWidth);
  const valley = parseInput(values.valleyWidth);
  if (outer === null || depth === null || tip === null || valley === null) {
    return null;
  }
  // The stored strings are in the form's current unit, so they have to be read
  // as millimetres here — otherwise switching to inches refits the spike count
  // to a wheel a twenty-fifth of the real size.
  return {
    outerDiameterMm: unitToMm(outer, units),
    spikeDepthMm: unitToMm(depth, units),
    tipWidthMm: unitToMm(tip, units),
    valleyWidthMm: unitToMm(valley, units),
    spikeShape,
  };
}

export function defaultValues(): Record<NumericField, string> {
  const values: Record<NumericField, string> = {
    outerDiameter: "80",
    thickness: "20",
    spikeCount: "20",
    spikeDepth: "12",
    tipWidth: "2.5",
    valleyWidth: "3",
    taper: "0",
    bore: "8",
    hubDiameter: "26",
    hubHeight: "6",
  };
  const fit = fitInputOf(values, "rounded");
  if (fit) values.spikeCount = String(autoSpikeCount(fit).count);
  return values;
}

export function buildSpec(state: BuilderState): {
  spec: Partial<StarSpec>;
  complete: boolean;
} {
  const values = state.values;
  const length = (field: NumericField): number | undefined => {
    const parsed = parseInput(values[field]);
    if (parsed === null) return undefined;
    return roundTo(unitToMm(parsed, state.units), lengthPrecisionMm(state.units));
  };
  const spikeCount = parseInput(values.spikeCount);

  const spec: Partial<StarSpec> = {
    outerDiameterMm: length("outerDiameter"),
    thicknessMm: length("thickness"),
    spikeCount:
      spikeCount !== null && Number.isInteger(spikeCount) ? spikeCount : undefined,
    spikeDepthMm: length("spikeDepth"),
    spikeShape: state.spikeShape,
    tipWidthMm: length("tipWidth"),
    valleyWidthMm: length("valleyWidth"),
    taperMm: length("taper"),
    boreMm: length("bore"),
    boreShape: state.boreShape,
    hubEnabled: state.hubEnabled,
    hubDiameterMm: length("hubDiameter"),
    hubHeightMm: length("hubHeight"),
  };

  const complete =
    spec.outerDiameterMm !== undefined &&
    spec.thicknessMm !== undefined &&
    spec.spikeCount !== undefined &&
    spec.spikeDepthMm !== undefined &&
    spec.tipWidthMm !== undefined &&
    spec.valleyWidthMm !== undefined &&
    spec.taperMm !== undefined &&
    spec.boreMm !== undefined &&
    spec.hubDiameterMm !== undefined &&
    spec.hubHeightMm !== undefined;

  return { spec, complete };
}

export function defaultSpec(): StarSpec {
  const { spec } = buildSpec({
    units: "mm",
    autoSpikes: true,
    spikeShape: "rounded",
    boreShape: "round",
    hubEnabled: false,
    values: defaultValues(),
    notice: null,
    lastValidSpec: {} as StarSpec,
  });
  return spec as StarSpec;
}

export const DEFAULT_BUILDER_STATE: BuilderState = {
  units: "mm",
  autoSpikes: true,
  spikeShape: "rounded",
  boreShape: "round",
  hubEnabled: false,
  values: defaultValues(),
  notice: null,
  lastValidSpec: defaultSpec(),
};

function withLastValid(state: BuilderState): BuilderState {
  const { spec, complete } = buildSpec(state);
  if (!complete) return state;
  const validation = validateStar(spec as StarSpec, { unit: state.units });
  if (!validation.ok) return state;
  return { ...state, lastValidSpec: spec as StarSpec };
}

/**
 * Refits the spike count when auto-fit is on. The count is a consequence of the
 * wheel diameter, spike depth, tip/valley width and spike shape, so it is
 * recalculated from scratch after every edit instead of being nudged.
 */
function refit(state: BuilderState): BuilderState {
  if (!state.autoSpikes) return { ...state, notice: null };
  const fit = fitInputOf(state.values, state.spikeShape, state.units);
  if (!fit) return state;
  const fitted = autoSpikeCount(fit);
  const value = String(fitted.count);
  if (value === state.values.spikeCount) return { ...state, notice: null };
  return {
    ...state,
    values: { ...state.values, spikeCount: value },
    notice: `Auto-fit set the spike count to ${fitted.count}${
      fitted.limitedBy ? ` — one more would break ${fitted.limitedBy}` : ""
    }.`,
  };
}

function commit(next: BuilderState): BuilderState {
  return withLastValid(refit(next));
}

export function setField(
  state: BuilderState,
  field: NumericField,
  value: string,
): BuilderState {
  return commit({
    ...state,
    values: { ...state.values, [field]: value },
    notice: null,
  });
}

export function setSpikeShape(state: BuilderState, spikeShape: SpikeShape): BuilderState {
  return commit({ ...state, spikeShape, notice: null });
}

export function setBoreShape(state: BuilderState, boreShape: BoreShape): BuilderState {
  return commit({ ...state, boreShape, notice: null });
}

export function setHubEnabled(state: BuilderState, hubEnabled: boolean): BuilderState {
  return commit({ ...state, hubEnabled, notice: null });
}

export function setAutoSpikes(state: BuilderState, autoSpikes: boolean): BuilderState {
  return commit({
    ...state,
    autoSpikes,
    notice: autoSpikes ? null : "Spike count is manual now.",
  });
}

export function setUnits(state: BuilderState, units: LengthUnit): BuilderState {
  if (units === state.units) return state;
  const convert = (raw: string): string => {
    const value = parseInput(raw);
    if (value === null) return raw;
    const converted = units === "in" ? value / 25.4 : value * 25.4;
    return formatNumber(converted, decimalsFor(units));
  };
  const values = { ...state.values };
  for (const field of LENGTH_FIELDS) values[field] = convert(values[field]);
  return commit({ ...state, units, values, notice: null });
}

export function resetBuilder(): BuilderState {
  return { ...DEFAULT_BUILDER_STATE, values: defaultValues() };
}

/** The spike-fit explanation shown under the count field, or null when manual. */
export function fitNote(state: BuilderState): string | null {
  if (!state.autoSpikes) return null;
  const fit = fitInputOf(state.values, state.spikeShape, state.units);
  if (!fit) return null;
  const fitted = autoSpikeCount(fit);
  if (!fitted.limitedBy) return "All available spikes fit.";
  return `Limited by ${fitted.limitedBy}.`;
}
