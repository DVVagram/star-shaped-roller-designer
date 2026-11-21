import { useMemo, useRef, useState } from "react";

import { renderRecordDrawingSvg } from "@/lib/designs/drawing";
import { legacyRecord, sprocketEnteredValues } from "@/lib/designs/legacy";
import { renderRecordSpecification } from "@/lib/designs/spec";
import { downloadText } from "@/lib/kit/download";

import { NumberField, OptionCards, PresetButtons, Segmented, Toggle } from "./fields";
import DesignScaffold, { type ReadoutItem } from "./DesignScaffold";
import { useUnitValues } from "./useUnitValues";

import {
  CHAIN_PRESETS,
  SPROCKET_DEFAULT_SPEC,
  SPROCKET_LENGTH_FIELDS,
  TOOTH_PROFILES,
  TOOTH_PROFILE_ORDER,
  buildSprocketMesh,
  buildSprocketSpec,
  deriveSprocket,
  sprocketCode,
  sprocketDefaultValues,
  validateSprocket,
  type SprocketField,
  type SprocketSpec,
  type ToothProfile,
} from "@/lib/sprocket";
import {
  BORE_SHAPES,
  BORE_SHAPE_ORDER,
  decimalsFor,
  formatMeasure,
  formatNumber,
  mmToUnit,
  type BoreShape,
} from "@/lib/kit/units";
import {
  buildBinaryStl,
  downloadStl,
  inspectMesh,
  stlByteLength,
} from "@/lib/kit/solid";

export default function SprocketBuilder() {
  const { units, values, setField, setUnits, reset } = useUnitValues(
    sprocketDefaultValues(),
    SPROCKET_LENGTH_FIELDS,
  );
  const [toothProfile, setToothProfile] = useState<ToothProfile>("standard");
  const [boreShape, setBoreShape] = useState<BoreShape>("round");
  const [hubEnabled, setHubEnabled] = useState(false);
  const [presetId, setPresetId] = useState<string | null>("#40");
  const [notice, setNotice] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const built = useMemo(
    () => buildSprocketSpec(values, units, { toothProfile, boreShape, hubEnabled }),
    [values, units, toothProfile, boreShape, hubEnabled],
  );
  const validation = useMemo(
    () =>
      validateSprocket(built.complete ? (built.spec as SprocketSpec) : built.spec, {
        unit: units,
      }),
    [built, units],
  );

  const lastValid = useRef<SprocketSpec>(SPROCKET_DEFAULT_SPEC);
  const current = built.complete && validation.ok ? (built.spec as SprocketSpec) : null;
  if (current) lastValid.current = current;
  const previewSpec = current ?? lastValid.current;

  const mesh = useMemo(() => {
    try {
      return buildSprocketMesh(previewSpec);
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

  const derived = validation.geometry ?? deriveSprocket(previewSpec);
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
    { label: "Teeth", value: String(derived.teeth), source: "input" },
    { label: "Pitch Ø", value: formatMeasure(derived.pitchDiameterMm, units), source: "calc" },
    {
      label: "Outside Ø",
      value: formatMeasure(derived.outsideDiameterMm, units),
      source: "calc",
    },
    { label: "Root Ø", value: formatMeasure(derived.rootDiameterMm, units), source: "calc" },
    {
      label: "Seat radius",
      value: formatMeasure(derived.seatRadiusMm, units),
      source: "input",
    },
    {
      label: "Pitch angle",
      value: `${formatNumber(derived.pitchAngleDeg, 1)}°`,
      source: "calc",
    },
    { label: "Tooth depth", value: formatMeasure(derived.toothDepthMm, units), source: "calc" },
    { label: "Tip land", value: formatMeasure(derived.tipLandMm, units), source: "calc" },
    { label: "Flank", value: formatMeasure(derived.flankLengthMm, units), source: "calc" },
    { label: "Rim width", value: formatMeasure(derived.rimWidthMm, units), source: "calc" },
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

  const toUnit = (valueMm: number) =>
    formatNumber(mmToUnit(valueMm, units), decimalsFor(units));

  function applyPreset(id: string) {
    const chain = CHAIN_PRESETS.find((entry) => entry.id === id);
    if (!chain) return;
    setPresetId(id);
    setField("pitch", toUnit(chain.pitchMm));
    setField("roller", toUnit(chain.rollerMm));
    setNotice(
      `${chain.label} chain — pitch ${chain.pitchMm} mm, roller ${chain.rollerMm} mm.`,
    );
  }

  function change(field: SprocketField, value: string) {
    if (field === "pitch" || field === "roller") setPresetId(null);
    setNotice(null);
    setField(field, value);
  }

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
      const buffer = buildBinaryStl(
        buildSprocketMesh(current),
        "FIT PROTOTYPE - Sprocket Designer - units: mm",
      );
      downloadStl(
        buffer,
        `sprocket-${current.teeth}t-${formatNumber(current.pitchMm, 2)}p.stl`,
      );
    } catch (error) {
      console.error(error);
      setExportError("The STL could not be generated. Please try again.");
    }
  }

  function artifactRecord() {
    if (!current || !mesh || !report?.ok) return null;
    return legacyRecord(
      "sprocket",
      "Chain sprocket",
      sprocketEnteredValues(values, units, { toothProfile, boreShape, hubEnabled }),
      readout.map(({ label, value, source }) => ({ label, value, source })),
      warnings,
      mesh,
    );
  }

  function handleSpec() {
    const record = artifactRecord();
    if (!record) return;
    downloadText(
      renderRecordSpecification(record),
      `sprocket-${record.inputs.find((i) => i.label === "Teeth")?.value ?? "part"}-spec.txt`,
    );
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
      `sprocket-${record.inputs.find((i) => i.label === "Teeth")?.value ?? "part"}-drawing.svg`,
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
          <h2 className="text-base font-semibold tracking-tight">Chain</h2>
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
              onClick={() => {
                reset();
                setPresetId("#40");
                setNotice(null);
              }}
              className="text-[11px] font-medium text-muted underline decoration-line underline-offset-2 transition hover:text-ink hover:decoration-accent"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mt-4">
          <PresetButtons
            label="Chain preset"
            value={presetId}
            options={CHAIN_PRESETS.map((chain) => ({
              value: chain.id,
              label: chain.label,
            }))}
            onChange={applyPreset}
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <NumberField
            id="pitch"
            label="Chain pitch"
            value={values.pitch}
            unit={units}
            onChange={(value) => change("pitch", value)}
            hint="Pin-to-pin distance of the chain."
            error={errors.get("pitch")}
          />
          <NumberField
            id="roller"
            label="Roller diameter"
            value={values.roller}
            unit={units}
            onChange={(value) => change("roller", value)}
            hint="The seats are cut to this roller."
            error={errors.get("roller")}
          />
          <NumberField
            id="clearance"
            label="Seat clearance"
            value={values.clearance}
            unit={units}
            onChange={(value) => change("clearance", value)}
            hint="Per side. 0.1–0.2 mm keeps a printed chain free."
            error={errors.get("clearance")}
          />
          <div className="rounded-xl border border-line bg-paper/60 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              Pitch circle
            </p>
            <p className="mt-1 font-mono text-[12px] text-ink numeric">
              {formatMeasure(derived.pitchDiameterMm, units)}
            </p>
            <p className="mt-1 text-[10px] leading-snug text-muted">
              p / sin(π / N) — set by the chain and the tooth count.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-card p-5 shadow-[0_1px_2px_rgba(21,23,28,0.04)] sm:p-6">
        <h2 className="text-base font-semibold tracking-tight">Wheel</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <NumberField
            id="teeth"
            label="Teeth"
            value={values.teeth}
            onChange={(value) => change("teeth", value)}
            hint={`Whole numbers, ${sprocketTeethRange()}.`}
            error={errors.get("teeth")}
          />
          <NumberField
            id="toothHeight"
            label="Tooth height"
            value={values.toothHeight}
            unit={units}
            onChange={(value) => change("toothHeight", value)}
            hint="How far the teeth stand above the pitch circle."
            error={errors.get("toothHeight")}
          />
          <NumberField
            id="tipWidth"
            label="Tip land"
            value={values.tipWidth}
            unit={units}
            onChange={(value) => change("tipWidth", value)}
            hint="Flat land across the top of each tooth."
            error={errors.get("tipWidth")}
          />
          <NumberField
            id="thickness"
            label="Thickness"
            value={values.thickness}
            unit={units}
            onChange={(value) => change("thickness", value)}
            hint="Face-to-face width of the sprocket."
            error={errors.get("thickness")}
          />
        </div>

        <div className="mt-4">
          <OptionCards
            label="Tooth profile"
            value={toothProfile}
            onChange={setToothProfile}
            options={TOOTH_PROFILE_ORDER.map((profile) => ({
              value: profile,
              label: TOOTH_PROFILES[profile].label,
              description: TOOTH_PROFILES[profile].description,
            }))}
          />
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
            onChange={(value) => change("bore", value)}
            hint="Shaft hole through the axis."
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

        <div className="mt-5 border-t border-line pt-4">
          <Toggle
            id="hub-enabled"
            label="Add a hub boss"
            hint="A raised collar around the hole on the top face."
            checked={hubEnabled}
            onChange={setHubEnabled}
          />
          {hubEnabled && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <NumberField
                id="hubDiameter"
                label="Hub diameter"
                value={values.hubDiameter}
                unit={units}
                onChange={(value) => change("hubDiameter", value)}
                hint="Must stay inside the root circle."
                error={errors.get("hubDiameter")}
              />
              <NumberField
                id="hubHeight"
                label="Hub height"
                value={values.hubHeight}
                unit={units}
                onChange={(value) => change("hubHeight", value)}
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
        label: `${derived.teeth} teeth · ${formatNumber(derived.pitchMm, 2)} mm pitch`,
        code: sprocketCode(previewSpec),
        mesh,
        sizeMm: derived.outsideDiameterMm,
        heightMm: derived.totalHeightMm,
        ariaLabel: `3D preview of a ${derived.teeth} tooth sprocket, ${formatNumber(
          derived.outsideDiameterMm,
          1,
        )} mm across`,
        cells: [
          { label: "Outside Ø", value: formatMeasure(derived.outsideDiameterMm, units) },
          { label: "Root Ø", value: formatMeasure(derived.rootDiameterMm, units) },
          { label: "Thickness", value: formatMeasure(derived.thicknessMm, units) },
        ],
        stale: !validation.ok,
      }}
      exportPanel={{
        capability: "fit",
        limitation: "Chain engagement is not demonstrated; test-fit a short chain run.",
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

function sprocketTeethRange(): string {
  return "6 to 72";
}
