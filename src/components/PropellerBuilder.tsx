import { useMemo, useRef, useState } from "react";

import { NumberField, OptionCards, Segmented } from "./fields";
import DesignScaffold, { type ReadoutItem } from "./DesignScaffold";
import { useUnitValues } from "./useUnitValues";

import {
  PROPELLER_DEFAULT_SPEC,
  PROPELLER_LENGTH_FIELDS,
  buildPropellerSpec,
  propellerCode,
  propellerDefaultValues,
  type PropellerField,
} from "@/lib/propeller";
import { buildRotorMesh, deriveRotor, validateRotor, type RotorSpec } from "@/lib/rotor";
import {
  BORE_SHAPES,
  BORE_SHAPE_ORDER,
  formatMeasure,
  formatNumber,
  type BoreShape,
} from "@/lib/kit/units";
import { buildBinaryStl, downloadStl, inspectMesh, stlByteLength } from "@/lib/kit/solid";

export default function PropellerBuilder() {
  const { units, values, setField, setUnits, reset } = useUnitValues(
    propellerDefaultValues(),
    PROPELLER_LENGTH_FIELDS,
  );
  const [boreShape, setBoreShape] = useState<BoreShape>("round");
  const [exportError, setExportError] = useState<string | null>(null);

  const built = useMemo(
    () => buildPropellerSpec(values, units, boreShape),
    [values, units, boreShape],
  );
  const validation = useMemo(
    () => validateRotor(built.complete ? (built.spec as RotorSpec) : built.spec, { unit: units }),
    [built, units],
  );

  const lastValid = useRef<RotorSpec>(PROPELLER_DEFAULT_SPEC);
  const current = built.complete && validation.ok ? (built.spec as RotorSpec) : null;
  if (current) lastValid.current = current;
  const previewSpec = current ?? lastValid.current;

  const mesh = useMemo(() => {
    try {
      return buildRotorMesh(previewSpec);
    } catch {
      return null;
    }
  }, [previewSpec]);
  const report = useMemo(() => {
    if (!mesh) return null;
    try {
      return inspectMesh(mesh);
    } catch {
      return null;
    }
  }, [mesh]);

  const derived = validation.geometry ?? deriveRotor(previewSpec);
  const errors = new Map(
    validation.errors.map((issue) => [issue.field, issue.message] as const),
  );
  // The pitch field drives the blade angle, so its error belongs under "pitch".
  if (!errors.has("pitch") && errors.has("bladeAngle")) {
    errors.set("pitch", errors.get("bladeAngle") as string);
  }
  const general = validation.errors
    .filter((issue) => issue.field === "general")
    .map((issue) => issue.message);
  const warnings = validation.warnings.map((warning) => warning.message);
  const watertight = Boolean(validation.ok && report?.ok);
  const volumeCm3 = report?.ok ? report.volumeMm3 / 1000 : Number.NaN;
  const fileBytes = mesh ? stlByteLength(mesh) : 0;

  const readout: ReadoutItem[] = [
    { label: "Blades", value: String(derived.bladeCount), source: "input" },
    { label: "Tip Ø", value: formatMeasure(derived.tipRadiusMm * 2, units), source: "input" },
    { label: "Hub Ø", value: formatMeasure(derived.hubRadiusMm * 2, units), source: "input" },
    { label: "Blade length", value: formatMeasure(derived.bladeLengthMm, units), source: "calc" },
    { label: "Pitch", value: formatMeasure(derived.pitchMm, units), source: "calc" },
    {
      label: "Pitch angle",
      value: `${formatNumber(derived.bladeAngleDeg, 1)}° @ 70 % R`,
      source: "calc",
    },
    {
      label: "Chord root → tip",
      value: `${formatNumber(derived.rootWidthMm, 1)} → ${formatNumber(derived.tipWidthMm, 1)} mm`,
      source: "input",
    },
    { label: "Lean at tip", value: formatMeasure(derived.leanMm, units), source: "calc" },
    { label: "Passage", value: formatMeasure(derived.minPassageMm, units), source: "calc" },
    {
      label: "Tip rounding",
      value: formatMeasure(derived.tipRoundingMm, units),
      source: "input",
    },
    {
      label: "Blade area",
      value: `${formatNumber(derived.bladeAreaMm2 / 100, 1)} cm²`,
      source: "calc",
    },
    {
      label: "Centre hole",
      value: `${formatMeasure(derived.boreRadiusMm * 2, units)} ${
        boreShape === "round" ? "" : boreShape === "hex" ? "hex" : "flat"
      }`.trim(),
      source: "input",
    },
    {
      label: "Solid volume",
      value: Number.isFinite(volumeCm3) ? `${formatNumber(volumeCm3, 2)} cm³` : "—",
      source: "calc",
    },
  ];

  function handleExport() {
    setExportError(null);
    if (!current) {
      setExportError("Fix the highlighted errors before exporting an STL.");
      return;
    }
    if (!report?.ok) {
      setExportError(
        "The generated solid is not a single watertight shell, so it was not exported.",
      );
      return;
    }
    try {
      const buffer = buildBinaryStl(
        buildRotorMesh(current),
        "Propeller Designer — units: mm",
      );
      downloadStl(
        buffer,
        `propeller-${formatNumber(current.tipDiameterMm, 0)}d-${Math.round(
          current.bladeCount,
        )}blade.stl`,
      );
    } catch (error) {
      console.error(error);
      setExportError("The STL could not be generated. Please try again.");
    }
  }

  const change = (field: PropellerField, value: string) => setField(field, value);

  const form = (
    <form
      onSubmit={(event) => event.preventDefault()}
      className="space-y-5"
      noValidate
    >
      <div className="rounded-2xl border border-line bg-card p-5 shadow-[0_1px_2px_rgba(21,23,28,0.04)] sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight">Disc</h2>
          <div className="flex items-center gap-2">
            <Segmented
              label="Length units"
              value={units}
              onChange={setUnits}
              options={[
                { value: "mm", label: "mm" },
                { value: "in", label: "in" },
              ]}
            />
            <button
              type="button"
              onClick={reset}
              className="text-[11px] font-medium text-muted underline decoration-line underline-offset-2 transition hover:text-ink hover:decoration-accent"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <NumberField
            id="tipDiameter"
            label="Tip diameter"
            value={values.tipDiameter}
            unit={units}
            onChange={(value) => change("tipDiameter", value)}
            hint="Across the blade tips."
            error={errors.get("tipDiameter")}
          />
          <NumberField
            id="hubDiameter"
            label="Hub diameter"
            value={values.hubDiameter}
            unit={units}
            onChange={(value) => change("hubDiameter", value)}
            hint="The boss the blades grow from."
            error={errors.get("hubDiameter")}
          />
          <NumberField
            id="bladeHeight"
            label="Blade drop"
            value={values.bladeHeight}
            unit={units}
            onChange={(value) => change("bladeHeight", value)}
            hint="Axial travel from the leading to the trailing edge."
            error={errors.get("bladeHeight")}
          />
          <div className="rounded-xl border border-line bg-paper/60 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              Pitch
            </p>
            <p className="mt-1 font-mono text-[12px] text-ink numeric">
              {formatMeasure(derived.pitchMm, units)} / rev
            </p>
            <p className="mt-1 text-[10px] leading-snug text-muted">
              2π · 0.7R · tan(blade angle).
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-card p-5 shadow-[0_1px_2px_rgba(21,23,28,0.04)] sm:p-6">
        <h2 className="text-base font-semibold tracking-tight">Blades</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <NumberField
            id="bladeCount"
            label="Blade count"
            value={values.bladeCount}
            onChange={(value) => change("bladeCount", value)}
            hint="Two to eight blades make a usable prop."
            error={errors.get("bladeCount")}
          />
          <NumberField
            id="pitch"
            label="Pitch"
            value={values.pitch}
            unit={units}
            onChange={(value) => change("pitch", value)}
            hint="Advance per revolution. Sets the blade angle at 70 % radius."
            error={errors.get("pitch")}
          />
          <NumberField
            id="rootWidth"
            label="Root chord"
            value={values.rootWidth}
            unit={units}
            onChange={(value) => change("rootWidth", value)}
            hint="Blade width where it leaves the hub."
            error={errors.get("rootWidth")}
          />
          <NumberField
            id="tipWidth"
            label="Tip chord"
            value={values.tipWidth}
            unit={units}
            onChange={(value) => change("tipWidth", value)}
            hint="Blade width at the tip."
            error={errors.get("tipWidth")}
          />
          <NumberField
            id="tipRounding"
            label="Tip rounding"
            value={values.tipRounding}
            unit={units}
            onChange={(value) => change("tipRounding", value)}
            hint="Radius on the blade ends. 0 leaves them square."
            error={errors.get("tipRounding")}
          />
          <NumberField
            id="bladeSweep"
            label="Sweep"
            value={values.bladeSweep}
            unit="°"
            onChange={(value) => change("bladeSweep", value)}
            hint="Tangential lean of the blade along its length."
            error={errors.get("bladeSweep")}
          />
          <div className="rounded-xl border border-line bg-paper/60 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              Pitch angle
            </p>
            <p className="mt-1 font-mono text-[12px] text-ink numeric">
              {formatNumber(derived.bladeAngleDeg, 1)}°
            </p>
            <p className="mt-1 text-[10px] leading-snug text-muted">
              Measured at 70 % of the tip radius.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-card p-5 shadow-[0_1px_2px_rgba(21,23,28,0.04)] sm:p-6">
        <h2 className="text-base font-semibold tracking-tight">Hub hole</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <NumberField
            id="bore"
            label="Hole size"
            value={values.bore}
            unit={units}
            onChange={(value) => change("bore", value)}
            hint="Shaft or motor bore through the hub."
            error={errors.get("bore")}
          />
          <div>
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">
              Hole shape
            </span>
            <OptionCards
              label="Hole shape"
              columns={3}
              value={boreShape}
              onChange={setBoreShape}
              options={BORE_SHAPE_ORDER.map((shape) => ({
                value: shape,
                label: BORE_SHAPES[shape].label,
                description: BORE_SHAPES[shape].description,
              }))}
            />
          </div>
        </div>
      </div>
    </form>
  );

  return (
    <DesignScaffold
      form={form}
      general={general}
      warnings={warnings}
      errorCount={validation.errors.length}
      validationOk={validation.ok}
      solidOk={Boolean(report?.ok)}
      readout={readout}
      preview={{
        label: `${derived.bladeCount} blades · ${formatNumber(derived.pitchMm, 0)} mm pitch`,
        code: propellerCode(previewSpec),
        mesh,
        sizeMm: derived.tipRadiusMm * 2,
        heightMm: Math.max(derived.heightMm, 1),
        ariaLabel: `3D preview of a ${derived.bladeCount} blade propeller, ${formatNumber(
          derived.tipRadiusMm * 2,
          1,
        )} mm across`,
        cells: [
          { label: "Tip Ø", value: formatMeasure(derived.tipRadiusMm * 2, units) },
          { label: "Pitch", value: formatMeasure(derived.pitchMm, units) },
          { label: "Blade drop", value: formatMeasure(derived.heightMm, units) },
        ],
        stale: !validation.ok,
      }}
      exportPanel={{
        onExport: handleExport,
        disabled: !validation.ok || !report?.ok,
        note: validation.ok
          ? "Binary STL in millimetres, centred on the origin, ready to slice."
          : "Export is disabled while the configuration has errors.",
        volume: Number.isFinite(volumeCm3) ? `${formatNumber(volumeCm3, 2)} cm³` : "—",
        triangles: report ? formatNumber(report.triangleCount, 0) : "—",
        file: fileBytes > 0 ? `${formatNumber(fileBytes / 1024, 0)} kB` : "—",
        watertight,
        error: exportError,
      }}
    />
  );
}
