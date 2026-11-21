import { useMemo, useRef, useState } from "react";

import { renderRecordDrawingSvg } from "@/lib/designs/drawing";
import { legacyRecord, fanEnteredValues } from "@/lib/designs/legacy";
import { renderRecordSpecification } from "@/lib/designs/spec";
import { downloadText } from "@/lib/kit/download";

import { NumberField, OptionCards, Segmented } from "./fields";
import DesignScaffold, { type ReadoutItem } from "./DesignScaffold";
import { useUnitValues } from "./useUnitValues";

import {
  FAN_DEFAULT_SPEC,
  FAN_LENGTH_FIELDS,
  buildFanSpec,
  fanCode,
  fanDefaultValues,
} from "@/lib/fan";
import {
  buildRotorMesh,
  deriveRotor,
  validateRotor,
  type RotorSpec,
} from "@/lib/rotor";
import {
  BORE_SHAPES,
  BORE_SHAPE_ORDER,
  formatMeasure,
  formatNumber,
  type BoreShape,
} from "@/lib/kit/units";
import { buildBinaryStl, downloadStl, inspectMesh, stlByteLength } from "@/lib/kit/solid";

export default function FanBuilder() {
  const { units, values, setField, setUnits, reset } = useUnitValues(
    fanDefaultValues(),
    FAN_LENGTH_FIELDS,
  );
  const [boreShape, setBoreShape] = useState<BoreShape>("round");
  const [exportError, setExportError] = useState<string | null>(null);

  const built = useMemo(
    () => buildFanSpec(values, units, boreShape),
    [values, units, boreShape],
  );
  const validation = useMemo(
    () => validateRotor(built.complete ? (built.spec as RotorSpec) : built.spec, { unit: units }),
    [built, units],
  );

  const lastValid = useRef<RotorSpec>(FAN_DEFAULT_SPEC);
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
    {
      label: "Blade length",
      value: formatMeasure(derived.bladeLengthMm, units),
      source: "calc",
    },
    {
      label: "Pitch angle",
      value: `${formatNumber(derived.pitchAngleDeg, 1)}°`,
      source: "calc",
    },
    {
      label: "Blade width",
      value: `${formatNumber(derived.rootWidthMm, 1)} → ${formatNumber(
        derived.tipWidthMm,
        1,
      )} mm`,
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
      label: "Edge rounding",
      value: formatMeasure(derived.tipEdgeRoundingMm, units),
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
      label: "Axial height",
      value: formatMeasure(derived.heightMm, units),
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
        "The generated solid is not a single closed, consistently wound shell, so it was not exported.",
      );
      return;
    }
    try {
      const buffer = buildBinaryStl(buildRotorMesh(current), "FIT PROTOTYPE - Impeller Designer - units: mm");
      downloadStl(
        buffer,
        `impeller-${formatNumber(current.tipDiameterMm, 0)}d-${Math.round(
          current.bladeCount,
        )}blade.stl`,
      );
    } catch (error) {
      console.error(error);
      setExportError("The STL could not be generated. Please try again.");
    }
  }

  function artifactRecord() {
    if (!current || !mesh || !report?.ok) return null;
    return legacyRecord(
      "impeller",
      "Axial impeller",
      fanEnteredValues(values, units, boreShape),
      readout.map(({ label, value, source }) => ({ label, value, source })),
      warnings,
      mesh,
    );
  }

  function handleSpec() {
    const record = artifactRecord();
    if (!record) return;
    downloadText(renderRecordSpecification(record), "impeller-spec.txt");
  }

  function handleDrawing() {
    const record = artifactRecord();
    if (!record) return;
    downloadText(
      renderRecordDrawingSvg({
        id: record.id,
        name: record.name,
        contract: record.contract,
        mesh: record.mesh!,
      }),
      "impeller-drawing.svg",
      "image/svg+xml",
    );
  }

  const form = (
    <form
      onSubmit={(event) => event.preventDefault()}
      className="space-y-5"
      noValidate
    >
      <div className="rounded-2xl border border-line bg-card p-5 shadow-[0_1px_2px_rgba(21,23,28,0.04)] sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight">Rotor</h2>
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
            onChange={(value) => setField("tipDiameter", value)}
            hint="Across the blade tips."
            error={errors.get("tipDiameter")}
          />
          <NumberField
            id="hubDiameter"
            label="Hub diameter"
            value={values.hubDiameter}
            unit={units}
            onChange={(value) => setField("hubDiameter", value)}
            hint="The solid hub the blades grow from."
            error={errors.get("hubDiameter")}
          />
          <NumberField
            id="bladeHeight"
            label="Blade height"
            value={values.bladeHeight}
            unit={units}
            onChange={(value) => setField("bladeHeight", value)}
            hint="Axial depth of the rotor."
            error={errors.get("bladeHeight")}
          />
          <div className="rounded-xl border border-line bg-paper/60 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              Swept disc
            </p>
            <p className="mt-1 font-mono text-[12px] text-ink numeric">
              {formatNumber(derived.discAreaMm2 / 100, 1)} cm²
            </p>
            <p className="mt-1 text-[10px] leading-snug text-muted">
              π · R² at the tip radius.
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
            onChange={(value) => setField("bladeCount", value)}
            hint="2 to 24 blades."
            error={errors.get("bladeCount")}
          />
          <NumberField
            id="rootWidth"
            label="Root width"
            value={values.rootWidth}
            unit={units}
            onChange={(value) => setField("rootWidth", value)}
            hint="Blade chord where it leaves the hub."
            error={errors.get("rootWidth")}
          />
          <NumberField
            id="tipWidth"
            label="Tip width"
            value={values.tipWidth}
            unit={units}
            onChange={(value) => setField("tipWidth", value)}
            hint="Blade chord at the rim."
            error={errors.get("tipWidth")}
          />
          <NumberField
            id="tipRounding"
            label="Tip rounding"
            value={values.tipRounding}
            unit={units}
            onChange={(value) => setField("tipRounding", value)}
            hint="Radius on the blade ends in plan. 0 leaves them square."
            error={errors.get("tipRounding")}
          />
          <NumberField
            id="tipEdgeRounding"
            label="Edge rounding"
            value={values.tipEdgeRounding}
            unit={units}
            onChange={(value) => setField("tipEdgeRounding", value)}
            hint="Radius on the top and bottom of the tip. 0 leaves the edge square."
            error={errors.get("tipEdgeRounding")}
          />
          <NumberField
            id="bladeAngle"
            label="Blade angle"
            value={values.bladeAngle}
            unit="°"
            onChange={(value) => setField("bladeAngle", value)}
            hint="Lean at the tip. The root stays square to the hub."
            error={errors.get("bladeAngle")}
          />
          <NumberField
            id="bladeSweep"
            label="Sweep"
            value={values.bladeSweep}
            unit="°"
            onChange={(value) => setField("bladeSweep", value)}
            hint="How far the blade trails around the axis."
            error={errors.get("bladeSweep")}
          />
          <div className="rounded-xl border border-line bg-paper/60 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              Narrowest passage
            </p>
            <p className="mt-1 font-mono text-[12px] text-ink numeric">
              {formatMeasure(derived.minPassageMm, units)}
            </p>
            <p className="mt-1 text-[10px] leading-snug text-muted">
              Gap between neighbouring blades, checked at three radii.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-card p-5 shadow-[0_1px_2px_rgba(21,23,28,0.04)] sm:p-6">
        <h2 className="text-base font-semibold tracking-tight">Centre hole</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <NumberField
            id="bore"
            label="Hole size"
            value={values.bore}
            unit={units}
            onChange={(value) => setField("bore", value)}
            hint="Motor or shaft bore through the hub."
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
        label: `${derived.bladeCount} blades · ${formatNumber(derived.bladeAngleDeg, 0)}° lean`,
        code: fanCode(previewSpec),
        mesh,
        sizeMm: derived.tipRadiusMm * 2,
        heightMm: derived.heightMm,
        ariaLabel: `3D preview of a ${derived.bladeCount} blade impeller, ${formatNumber(
          derived.tipRadiusMm * 2,
          1,
        )} mm across`,
        cells: [
          { label: "Tip Ø", value: formatMeasure(derived.tipRadiusMm * 2, units) },
          { label: "Hub Ø", value: formatMeasure(derived.hubRadiusMm * 2, units) },
          { label: "Height", value: formatMeasure(derived.heightMm, units) },
        ],
        stale: !validation.ok,
      }}
      exportPanel={{
        capability: "fit",
        limitation: "No airflow, balance or safe-speed rating is provided; guard the rotor.",
        onSpec: handleSpec,
        onDrawing: handleDrawing,
        artifactsDisabled: !watertight,
        onExport: handleExport,
        disabled: !validation.ok || !report?.ok,
        note: validation.ok
          ? "Binary STL, coordinates in millimetres. STL has no units or metadata: verify scale and orientation in your slicer."
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
