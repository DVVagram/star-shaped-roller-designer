import { lazy, Suspense, useMemo, useReducer, useState } from "react";

import {
  DEFAULT_BUILDER_STATE,
  LENGTH_FIELDS,
  applyPresetValues,
  buildSpec,
  defaultValues,
  fitNote,
  resetBuilder,
  setAutoSpikes,
  setBoreShape,
  setField,
  setHubEnabled,
  setSpikeShape,
  setUnits,
  type BuilderState,
  type NumericField,
} from "@/lib/star/builder";
import {
  SPIKE_SHAPES,
  designCode,
  deriveStar,
  formatMeasure,
  formatNumber,
  validateStar,
  type BoreShape,
  type LengthUnit,
  type SpikeShape,
  type StarSpec,
} from "@/lib/star/geometry";
import { renderRecordDrawingSvg } from "@/lib/designs/drawing";
import { legacyRecord, starEnteredValues } from "@/lib/designs/legacy";
import {
  presetMatches,
  presetValuesForUnits,
  scaleLengthValues,
} from "@/lib/designs/presets";
import { renderRecordSpecification } from "@/lib/designs/spec";
import { downloadBytes, downloadText } from "@/lib/kit/download";
import { isConfigRecord, loadDesignConfig } from "@/lib/kit/design-link";
import { createZip } from "@/lib/kit/zip";
import { buildStarMesh, inspectStarSolid, type SolidReport } from "@/lib/star/mesh";
import { buildBinaryStl, stlFileName } from "@/lib/star/stl";

import { CapabilityBadge } from "./CapabilityNotice";
import { DesignerToolbar, FieldIssueSummary, StickyExportBar, type FieldIssue } from "./DesignerTools";
import SpecForm from "./SpecForm";
import { useDesignConfig } from "./useDesignConfig";

const StarPreview = lazy(() => import("./StarPreview"));

type Action =
  | { type: "field"; field: NumericField; value: string }
  | { type: "shape"; shape: SpikeShape }
  | { type: "bore"; shape: BoreShape }
  | { type: "units"; units: LengthUnit }
  | { type: "auto"; auto: boolean }
  | { type: "hub"; hub: boolean }
  | { type: "preset"; values: Record<NumericField, string> }
  | { type: "reset" };

function reducer(state: BuilderState, action: Action): BuilderState {
  switch (action.type) {
    case "field":
      return setField(state, action.field, action.value);
    case "shape":
      return setSpikeShape(state, action.shape);
    case "bore":
      return setBoreShape(state, action.shape);
    case "units":
      return setUnits(state, action.units);
    case "auto":
      return setAutoSpikes(state, action.auto);
    case "hub":
      return setHubEnabled(state, action.hub);
    case "preset":
      return applyPresetValues(state, action.values);
    case "reset":
      return resetBuilder();
    default:
      return state;
  }
}

interface StarConfig {
  units: LengthUnit;
  values: Record<NumericField, string>;
  autoSpikes: boolean;
  spikeShape: SpikeShape;
  boreShape: BoreShape;
  hubEnabled: boolean;
}

function decodeStarConfig(raw: unknown): StarConfig | null {
  if (!isConfigRecord(raw) || !isConfigRecord(raw.values)) return null;
  const values = { ...defaultValues() };
  for (const key of Object.keys(values) as NumericField[]) {
    const value = raw.values[key];
    if (typeof value === "string") values[key] = value;
  }
  const spikeShape = raw.spikeShape;
  const boreShape = raw.boreShape;
  return {
    units: raw.units === "in" ? "in" : "mm",
    values,
    autoSpikes: raw.autoSpikes !== false,
    spikeShape:
      typeof spikeShape === "string" && spikeShape in SPIKE_SHAPES
        ? (spikeShape as SpikeShape)
        : "rounded",
    boreShape:
      boreShape === "hex" || boreShape === "doubleFlat" ? boreShape : "round",
    hubEnabled: raw.hubEnabled === true,
  };
}

function initialState(loaded: ReturnType<typeof loadDesignConfig<StarConfig>>): BuilderState {
  if (!loaded) return DEFAULT_BUILDER_STATE;
  return {
    ...DEFAULT_BUILDER_STATE,
    units: loaded.data.units,
    values: { ...defaultValues(), ...loaded.data.values },
    autoSpikes: loaded.data.autoSpikes,
    spikeShape: loaded.data.spikeShape,
    boreShape: loaded.data.boreShape,
    hubEnabled: loaded.data.hubEnabled,
    notice: null,
  };
}

function starPresets(spikeShape: SpikeShape) {
  const make = (id: string, label: string, description: string, factor: number) => {
    const scaled = scaleLengthValues(
      defaultValues(),
      LENGTH_FIELDS,
      factor,
    ) as Record<NumericField, string>;
    const candidate = applyPresetValues(
      { ...DEFAULT_BUILDER_STATE, spikeShape },
      scaled,
    );
    const built = buildSpec(candidate);
    if (!built.complete) return null;
    if (!validateStar(built.spec as StarSpec, { unit: "mm" }).ok) return null;
    return { id, label, description, values: candidate.values };
  };

  const standard = applyPresetValues(DEFAULT_BUILDER_STATE, defaultValues());
  return [
    {
      id: "standard",
      label: "Standard",
      description: "The balanced 80 mm starting wheel.",
      values: standard.values,
    },
    make("compact", "Compact", "A smaller wheel; auto-fit recalculates the spikes.", 0.72),
    make("oversize", "Oversize", "A larger wheel; auto-fit recalculates the spikes.", 1.35),
  ].filter((preset): preset is NonNullable<typeof preset> => preset !== null);
}

const STAR_FIELD_LABELS: Record<string, string> = {
  outerDiameter: "Wheel diameter",
  thickness: "Thickness",
  spikeCount: "Number of spikes",
  spikeDepth: "Spike depth",
  tipWidth: "Tip width",
  valleyWidth: "Valley width",
  taper: "Tip taper",
  bore: "Hole size",
  hubDiameter: "Hub diameter",
  hubHeight: "Hub height",
};

export default function StarBuilder() {
  const [initial] = useState(() => loadDesignConfig("star", decodeStarConfig));
  const [state, dispatch] = useReducer(reducer, initial, initialState);
  const [exportError, setExportError] = useState<string | null>(null);
  const { copyStatus, copyLink } = useDesignConfig("star", {
    values: state.values,
    units: state.units,
    autoSpikes: state.autoSpikes,
    spikeShape: state.spikeShape,
    boreShape: state.boreShape,
    hubEnabled: state.hubEnabled,
  });
  const presets = useMemo(() => starPresets(state.spikeShape), [state.spikeShape]);
  const activePresetId =
    presets.find((preset) =>
      presetMatches(state.values, preset, LENGTH_FIELDS, state.units),
    )?.id ?? null;

  const { spec, complete } = buildSpec(state);
  const validation = validateStar(complete ? (spec as StarSpec) : spec, {
    unit: state.units,
  });

  const currentSpec = complete && validation.ok ? (spec as StarSpec) : null;
  const previewSpec = currentSpec ?? state.lastValidSpec;
  const previewKey = JSON.stringify(previewSpec);

  // The authoritative solid: the very mesh the preview renders, measured on the
  // closed surface. Invalid geometry yields no volume at all.
  const solid = useMemo<SolidReport | null>(() => {
    try {
      return inspectStarSolid(previewSpec);
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey]);

  const derived = validation.geometry ?? deriveStar(previewSpec);
  const errors = new Map(
    validation.errors.map((issue) => [issue.field, issue.message] as const),
  );
  const generalErrors = validation.errors.filter((issue) => issue.field === "general");
  const fieldIssues: FieldIssue[] = Array.from(errors, ([field, message]) => ({
    fieldId: field,
    label: STAR_FIELD_LABELS[field] ?? field,
    message,
  })).filter((issue) => issue.fieldId !== "general");
  const watertight = Boolean(validation.ok && solid?.ok);
  const volumeCm3 =
    solid && solid.ok ? solid.volumeMm3 / 1000 : Number.NaN;
  const fileBytes = solid ? 84 + solid.triangleCount * 50 : 0;

  function artifactMesh() {
    try {
      return buildStarMesh(previewSpec);
    } catch {
      return null;
    }
  }

  function artifactRecord() {
    if (!validation.ok || !solid?.ok) return null;
    const mesh = artifactMesh();
    if (!mesh) return null;
    return legacyRecord(
      "star",
      "Star roller",
      starEnteredValues(state),
      readout.map(({ label, value, source }) => ({ label, value, source })),
      validation.warnings.map((issue) => issue.message),
      mesh,
    );
  }

  function handleSpec() {
    const record = artifactRecord();
    if (!record) return;
    downloadText(renderRecordSpecification(record), "star-roller-spec.txt");
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
      "star-roller-drawing.svg",
      "image/svg+xml",
    );
  }

  function handleBundle() {
    const current = currentSpec;
    const record = artifactRecord();
    if (!current || !record) return;
    try {
      const base = stlFileName(current).replace(/\.stl$/i, "");
      downloadBytes(
        createZip([
          { name: stlFileName(current), data: buildBinaryStl(buildStarMesh(current)) },
          { name: `${base}-spec.txt`, data: renderRecordSpecification(record) },
          {
            name: `${base}-drawing.svg`,
            data: renderRecordDrawingSvg({
              id: record.id,
              name: record.name,
              contract: record.contract,
              mesh: record.mesh!,
            }),
          },
        ]),
        `${base}.zip`,
        "application/zip",
      );
    } catch (error) {
      console.error(error);
      setExportError("The export bundle could not be generated. Please try again.");
    }
  }

  const readout = useMemo(
    () => [
      { label: "Spikes", value: String(derived.spikeCount), source: "input" as const },
      {
        label: "Pitch angle",
        value: `${formatNumber(derived.pitchAngleDeg, 1)}°`,
        source: "calc" as const,
      },
      {
        label: "Tip Ø",
        value: formatMeasure(derived.tipDiameterMm, state.units),
        source: "input" as const,
      },
      {
        label: "Valley Ø",
        value: formatMeasure(derived.valleyDiameterMm, state.units),
        source: "calc" as const,
      },
      {
        label: "Spike height",
        value: formatMeasure(derived.spikeHeightMm, state.units),
        source: "input" as const,
      },
      {
        label: "Tip land",
        value:
          derived.tipLandMm > 0
            ? formatMeasure(derived.tipLandMm, state.units)
            : "point",
        source: "calc" as const,
      },
      {
        label: "Valley width",
        value:
          derived.valleyLandMm > 0
            ? formatMeasure(derived.valleyLandMm, state.units)
            : "sharp",
        source: "input" as const,
      },
      {
        label: "Spike base",
        value: formatMeasure(derived.spikeBaseArcMm, state.units),
        source: "calc" as const,
      },
      {
        label: "Top tip Ø",
        value: formatMeasure(derived.topTipRadiusMm * 2, state.units),
        source: "calc" as const,
      },
      {
        label: "Centre hole",
        value: `${formatMeasure(derived.boreRadiusMm * 2, state.units)} ${
          state.boreShape === "round"
            ? ""
            : state.boreShape === "hex"
              ? "hex"
              : "flat"
        }`.trim(),
        source: "input" as const,
      },
      {
        label: "Overall height",
        value: formatMeasure(derived.totalHeightMm, state.units),
        source: "calc" as const,
      },
      {
        label: "Solid volume",
        value: Number.isFinite(volumeCm3) ? `${formatNumber(volumeCm3, 2)} cm³` : "—",
        source: "calc" as const,
      },
    ],
    [derived, state.units, state.boreShape, volumeCm3],
  );

  function handleExport() {
    setExportError(null);
    if (!currentSpec) {
      setExportError("Fix the highlighted errors before exporting an STL.");
      return;
    }
    if (!solid?.ok) {
      setExportError(
        "The generated solid is not a single closed, consistently wound shell, so it was not exported.",
      );
      return;
    }
    try {
      const mesh = buildStarMesh(currentSpec);
      const buffer = buildBinaryStl(mesh);
      const blob = new Blob([buffer], { type: "model/stl" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = stlFileName(currentSpec);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error(error);
      setExportError("The STL could not be generated. Please try again.");
    }
  }

  return (
    <>
      <DesignerToolbar
        presets={presets}
        activePresetId={activePresetId}
        onPreset={(id) => {
          const preset = presets.find((item) => item.id === id);
          if (preset) {
            dispatch({
              type: "preset",
              values: presetValuesForUnits(
                preset.values,
                LENGTH_FIELDS,
                state.units,
              ) as Record<NumericField, string>,
            });
          }
        }}
        copyStatus={copyStatus}
        onCopy={copyLink}
      />
      <FieldIssueSummary
        fieldIssues={fieldIssues}
        general={generalErrors.map((issue) => issue.message)}
        errorCount={validation.errors.length}
      />
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
      {/* ------------------------------------------------------------- inputs */}
      <div className="space-y-5">
        <SpecForm
          state={state}
          errors={errors}
          notice={state.notice}
          fitNote={fitNote(state)}
          onChange={(field, value) => dispatch({ type: "field", field, value })}
          onShape={(shape) => dispatch({ type: "shape", shape })}
          onBoreShape={(shape) => dispatch({ type: "bore", shape })}
          onUnits={(units) => dispatch({ type: "units", units })}
          onAuto={(auto) => dispatch({ type: "auto", auto })}
          onHub={(hub) => dispatch({ type: "hub", hub })}
          onReset={() => dispatch({ type: "reset" })}
        />

        {/* ------------------------------------------------------- messages */}
        <div aria-live="polite" className="space-y-2">
          {validation.warnings.map((warning) => (
            <p
              key={warning.message}
              className="flex gap-2 rounded-lg border border-amber-300/50 bg-amber-50/70 px-3 py-2 text-xs leading-relaxed text-amber-900"
            >
              <span aria-hidden="true" className="mt-px">
                ▲
              </span>
              <span>{warning.message}</span>
            </p>
          ))}
          {validation.ok && solid && !solid.ok && (
            <p className="rounded-lg border border-red-300/70 bg-red-50 px-3 py-2 text-xs text-red-800">
              The generated solid is not a single watertight, manifold shell, so this
              configuration cannot be exported.
            </p>
          )}
        </div>

        {/* -------------------------------------------------------- readout */}
        <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-[0_1px_2px_rgba(21,23,28,0.04)]">
          <div className="flex items-baseline justify-between gap-3 px-5 py-3.5 sm:px-6">
            <h2 className="text-base font-semibold tracking-tight">
              Calculated measurements
            </h2>
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted">
              calc
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-3">
            {readout.map((item) => (
              <div key={item.label} className="bg-card px-3.5 py-2.5">
                <dt className="flex items-baseline justify-between gap-1.5 text-[10px] uppercase tracking-[0.1em] text-muted">
                  <span className="truncate">{item.label}</span>
                  <span
                    className={
                      item.source === "calc"
                        ? "rounded bg-paper-deep px-1 text-[9px] font-semibold tracking-normal text-muted"
                        : "rounded bg-accent-soft px-1 text-[9px] font-semibold tracking-normal text-accent-strong"
                    }
                  >
                    {item.source}
                  </span>
                </dt>
                <dd className="mt-0.5 font-mono text-[12px] text-ink numeric">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* ------------------------------------------------------------ preview */}
      <div className="space-y-5 lg:sticky lg:top-20">
        <div className="overflow-hidden rounded-2xl border border-panel bg-panel shadow-[0_18px_40px_-24px_rgba(16,19,25,0.55)]">
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
              {SPIKE_SHAPES[previewSpec.spikeShape].label} · {previewSpec.spikeCount}{" "}
              points
            </p>
            <span className="font-mono text-[10px] text-white/35">
              {designCode(previewSpec)}
            </span>
          </div>

          <div className="relative h-[320px] overflow-hidden border-y border-white/10 bg-[radial-gradient(circle_at_50%_35%,#1d2734_0%,#101319_70%)] sm:h-[400px]">
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center">
                  <span className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                    Loading 3D view…
                  </span>
                </div>
              }
            >
              <StarPreview spec={previewSpec} />
            </Suspense>
            {!validation.ok && (
              <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-lg bg-panel-soft/90 px-3 py-2 text-[11px] leading-snug text-amber-200/90 ring-1 ring-amber-300/20">
                Showing the last valid design — fix the errors to update the preview.
              </div>
            )}
          </div>

          <dl className="grid grid-cols-3 gap-px bg-white/10">
            {[
              ["Tip Ø", formatMeasure(derived.tipDiameterMm, state.units)],
              ["Valley Ø", formatMeasure(derived.valleyDiameterMm, state.units)],
              ["Thickness", formatMeasure(derived.thicknessMm, state.units)],
            ].map(([label, value]) => (
              <div key={label} className="bg-panel px-3 py-2.5">
                <dt className="text-[9px] uppercase tracking-[0.12em] text-white/35">
                  {label}
                </dt>
                <dd className="mt-0.5 font-mono text-[12px] text-white/90 numeric">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* ----------------------------------------------------------- export */}
        <div className="rounded-2xl border border-line bg-card p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <CapabilityBadge capability="fit" />
            <button
              type="button"
              onClick={() => {
                const panel = document.getElementById("capability");
                panel?.scrollIntoView({ block: "start" });
                (panel?.querySelector("h2") as HTMLElement | null)?.focus();
              }}
              className="text-[10px] font-medium text-muted underline decoration-line underline-offset-2 hover:text-ink"
            >
              Limits
            </button>
          </div>
          <p className="mb-3 rounded-lg border border-amber-300/60 bg-amber-50/70 px-2.5 py-2 text-[11px] leading-relaxed text-amber-900">
            Fit prototype: not a rated drive wheel; spike strength, grip and shaft torque are not
            validated.
          </p>
          <button
            type="button"
            onClick={handleExport}
            disabled={!validation.ok || !solid?.ok}
            className="w-full rounded-xl bg-accent px-4 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(194,65,12,0.9)] transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:bg-muted/40 disabled:shadow-none"
          >
            Download STL
          </button>
          <p className="mt-2 text-center text-[11px] leading-relaxed text-muted">
            {validation.ok
              ? "Binary STL, coordinates in millimetres. STL has no units or metadata: verify scale and orientation in your software."
              : "Export is disabled while the configuration has errors."}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleSpec}
              disabled={!validation.ok || !solid?.ok}
              className="rounded-lg border border-line bg-white px-2 py-2 text-[11px] font-medium text-ink transition hover:bg-paper-deep disabled:cursor-not-allowed disabled:text-muted/50"
            >
              Specification (.txt)
            </button>
            <button
              type="button"
              onClick={handleDrawing}
              disabled={!validation.ok || !solid?.ok}
              className="rounded-lg border border-line bg-white px-2 py-2 text-[11px] font-medium text-ink transition hover:bg-paper-deep disabled:cursor-not-allowed disabled:text-muted/50"
            >
              Dimension sheet (.svg)
            </button>
          </div>
          <button
            type="button"
            onClick={handleBundle}
            disabled={!validation.ok || !solid?.ok}
            className="mt-2 w-full rounded-lg border border-line bg-paper-deep/40 px-2 py-2 text-[11px] font-semibold text-ink transition hover:bg-paper-deep disabled:cursor-not-allowed disabled:text-muted/50"
          >
            Download all three (.zip)
          </button>

          <dl className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line">
            {[
              [
                "Volume",
                Number.isFinite(volumeCm3) ? `${formatNumber(volumeCm3, 2)} cm³` : "—",
              ],
              ["Triangles", solid ? formatNumber(solid.triangleCount, 0) : "—"],
              [
                "File",
                fileBytes > 0 ? `${formatNumber(fileBytes / 1024, 0)} kB` : "—",
              ],
            ].map(([label, value]) => (
              <div key={label} className="bg-card px-3 py-2">
                <dt className="text-[9px] uppercase tracking-[0.12em] text-muted">
                  {label}
                </dt>
                <dd className="mt-0.5 font-mono text-[12px] text-ink numeric">
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
            <span
              aria-hidden="true"
              className={watertight ? "text-emerald-700" : "text-red-700"}
            >
              ●
            </span>
            {watertight
              ? "Mesh topology verified — not a fit or safety test"
              : "Mesh not verified — export blocked"}
          </p>

          {exportError && (
            <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
              {exportError}
            </p>
          )}
        </div>
      </div>
    </div>
      <StickyExportBar
        errorCount={validation.errors.length}
        validationOk={validation.ok}
        solidOk={Boolean(solid?.ok)}
        onExport={handleExport}
        onReview={() => {
          const target = document.getElementById(
            validation.errors.length > 0 ? "builder-issues" : "capability",
          );
          target?.scrollIntoView({ block: "start" });
          (target?.querySelector("h2") as HTMLElement | null)?.focus();
        }}
      />
    </>
  );
}
