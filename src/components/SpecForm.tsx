import {
  BORE_SHAPES,
  BORE_SHAPE_ORDER,
  LIMITS,
  SPIKE_SHAPES,
  SPIKE_SHAPE_ORDER,
  type BoreShape,
  type LengthUnit,
  type SpikeShape,
} from "@/lib/star/geometry";
import type { BuilderState, NumericField } from "@/lib/star/builder";

import { NumberField, OptionCards, Segmented, Toggle } from "./fields";

interface SpecFormProps {
  state: BuilderState;
  errors: Map<string, string>;
  notice: string | null;
  fitNote: string | null;
  onChange: (field: NumericField, value: string) => void;
  onShape: (shape: SpikeShape) => void;
  onBoreShape: (shape: BoreShape) => void;
  onUnits: (units: LengthUnit) => void;
  onAuto: (auto: boolean) => void;
  onHub: (hub: boolean) => void;
  onReset: () => void;
}

export default function SpecForm({
  state,
  errors,
  notice,
  fitNote,
  onChange,
  onShape,
  onBoreShape,
  onUnits,
  onAuto,
  onHub,
  onReset,
}: SpecFormProps) {
  const unit = state.units;
  const values = state.values;
  const sharp = state.spikeShape === "sharp";
  const flaps = state.spikeShape === "paddle";

  return (
    <form
      id="roller-spec-form"
      onSubmit={(event) => event.preventDefault()}
      className="space-y-5"
      noValidate
    >
      {/* ------------------------------------------------------- wheel card */}
      <div className="rounded-2xl border border-line bg-card p-5 shadow-[0_1px_2px_rgba(21,23,28,0.04)] sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight">Wheel</h2>
          <div className="flex items-center gap-2">
            <Segmented
              label="Length units"
              value={state.units}
              onChange={onUnits}
              options={[
                { value: "mm", label: "mm" },
                { value: "in", label: "in" },
              ]}
            />
            <button
              type="button"
              onClick={onReset}
              className="text-[11px] font-medium text-muted underline decoration-line underline-offset-2 transition hover:text-ink hover:decoration-accent"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <NumberField
            id="outerDiameter"
            label="Wheel diameter"
            value={values.outerDiameter}
            unit={unit}
            onChange={(value) => onChange("outerDiameter", value)}
            hint={`Across the spike tips. ${LIMITS.outerDiameterMm.min}–${LIMITS.outerDiameterMm.max} mm.`}
            error={errors.get("outerDiameter")}
          />
          <NumberField
            id="thickness"
            label="Thickness"
            value={values.thickness}
            unit={unit}
            onChange={(value) => onChange("thickness", value)}
            hint="Face-to-face height of the wheel."
            error={errors.get("thickness")}
          />
          <NumberField
            id="taper"
            label="Tip taper"
            value={values.taper}
            unit={unit}
            onChange={(value) => onChange("taper", value)}
            hint="Narrows the spikes towards the top face. 0 keeps them square."
            error={errors.get("taper")}
          />
          <div className="rounded-xl border border-line bg-paper/60 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              Cross-section
            </p>
            <p className="mt-1 text-[11px] leading-snug text-muted">
              Tip circle outside, valley circle between the spikes, centre hole
              through the axis.
            </p>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------- spike card */}
      <div className="rounded-2xl border border-line bg-card p-5 shadow-[0_1px_2px_rgba(21,23,28,0.04)] sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight">Spikes</h2>
          <Toggle
            id="auto-spikes"
            label="Auto-fit points"
            checked={state.autoSpikes}
            onChange={onAuto}
          />
        </div>

        <div className="mt-4">
          <OptionCards
            label="Spike shape"
            value={state.spikeShape}
            onChange={onShape}
            options={SPIKE_SHAPE_ORDER.map((shape) => ({
              value: shape,
              label: SPIKE_SHAPES[shape].label,
              description: SPIKE_SHAPES[shape].description,
            }))}
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <NumberField
            id="spikeDepth"
            label="Spike depth"
            value={values.spikeDepth}
            unit={unit}
            onChange={(value) => onChange("spikeDepth", value)}
            hint="How far the points stand proud of the valley."
            error={errors.get("spikeDepth")}
          />
          <NumberField
            id="spikeCount"
            label="Number of spikes"
            value={values.spikeCount}
            badge={state.autoSpikes ? "auto" : undefined}
            readOnly={state.autoSpikes}
            disabled={state.autoSpikes}
            onChange={(value) => onChange("spikeCount", value)}
            hint={
              state.autoSpikes
                ? (fitNote ?? "Fitted to the wheel as you change the dimensions.")
                : `Whole numbers, ${LIMITS.spikeCount.min} to ${LIMITS.spikeCount.max}.`
            }
            error={errors.get("spikeCount")}
          />
          <NumberField
            id="tipWidth"
            label="Tip width"
            value={values.tipWidth}
            unit={unit}
            disabled={sharp}
            onChange={(value) => onChange("tipWidth", value)}
            hint={
              sharp
                ? "Sharp spikes finish in a point, so there is no tip land."
                : flaps
                  ? "Width of each rectangular flap; its sides run square out of the core."
                  : "Flat land across the top of each spike."
            }
            error={errors.get("tipWidth")}
          />
          <NumberField
            id="valleyWidth"
            label="Valley width"
            value={values.valleyWidth}
            unit={unit}
            onChange={(value) => onChange("valleyWidth", value)}
            hint="Flat floor between spikes. 0 leaves a sharp V."
            error={errors.get("valleyWidth")}
          />
        </div>
      </div>

      {/* --------------------------------------------------------- hole card */}
      <div className="rounded-2xl border border-line bg-card p-5 shadow-[0_1px_2px_rgba(21,23,28,0.04)] sm:p-6">
        <h2 className="text-base font-semibold tracking-tight">Centre hole</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <NumberField
            id="bore"
            label="Hole size"
            value={values.bore}
            unit={unit}
            onChange={(value) => onChange("bore", value)}
            hint="Diameter of the shaft hole through the axis."
            error={errors.get("bore")}
          />
          <div>
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">
              Hole shape
            </span>
            <OptionCards
              label="Hole shape"
              columns={3}
              value={state.boreShape}
              onChange={onBoreShape}
              options={BORE_SHAPE_ORDER.map((shape) => ({
                value: shape,
                label: BORE_SHAPES[shape].label,
                description: BORE_SHAPES[shape].description,
              }))}
            />
          </div>
        </div>

        <div className="mt-5 border-t border-line pt-4">
          <Toggle
            id="hub-enabled"
            label="Add a hub boss"
            hint="A raised collar around the hole on the top face."
            checked={state.hubEnabled}
            onChange={onHub}
          />
          {state.hubEnabled && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <NumberField
                id="hubDiameter"
                label="Hub diameter"
                value={values.hubDiameter}
                unit={unit}
                onChange={(value) => onChange("hubDiameter", value)}
                hint="Must stay inside the valley circle."
                error={errors.get("hubDiameter")}
              />
              <NumberField
                id="hubHeight"
                label="Hub height"
                value={values.hubHeight}
                unit={unit}
                onChange={(value) => onChange("hubHeight", value)}
                hint="How far the collar rises above the wheel."
                error={errors.get("hubHeight")}
              />
            </div>
          )}
        </div>

        <div aria-live="polite" className="mt-4">
          {notice && (
            <p className="rounded-lg border border-accent/20 bg-accent-soft px-3 py-2 text-xs text-accent-strong">
              {notice}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
