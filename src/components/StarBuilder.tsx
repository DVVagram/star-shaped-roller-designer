import { lazy, Suspense, useMemo, useReducer, useState } from "react";

import {
  DEFAULT_BUILDER_STATE,
  buildSpec,
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
import { buildStarMesh, inspectStarSolid, type SolidReport } from "@/lib/star/mesh";
import { buildBinaryStl, stlFileName } from "@/lib/star/stl";

import SpecForm from "./SpecForm";

const StarPreview = lazy(() => import("./StarPreview"));

type Action =
  | { type: "field"; field: NumericField; value: string }
  | { type: "shape"; shape: SpikeShape }
  | { type: "bore"; shape: BoreShape }
  | { type: "units"; units: LengthUnit }
  | { type: "auto"; auto: boolean }
  | { type: "hub"; hub: boolean }
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
    case "reset":
      return resetBuilder();
    default:
      return state;
  }
}

export default function StarBuilder() {
  const [state, dispatch] = useReducer(reducer, DEFAULT_BUILDER_STATE);
  const [exportError, setExportError] = useState<string | null>(null);

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
  const watertight = Boolean(validation.ok && solid?.ok);
  const volumeCm3 =
    solid && solid.ok ? solid.volumeMm3 / 1000 : Number.NaN;
  const fileBytes = solid ? 84 + solid.triangleCount * 50 : 0;

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
        "The generated solid is not a single watertight shell, so it was not exported.",
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
          {generalErrors.map((issue) => (
            <p
              key={issue.message}
              className="rounded-lg border border-red-300/70 bg-red-50 px-3 py-2 text-xs text-red-800"
            >
              {issue.message}
            </p>
          ))}
          {validation.errors.length > 0 && (
            <p className="rounded-lg border border-red-300/70 bg-red-50 px-3 py-2 text-xs text-red-800">
              {validation.errors.length} field
              {validation.errors.length === 1 ? "" : "s"} need attention before the
              STL can be exported.
            </p>
          )}
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
          <button
            type="button"
            onClick={handleExport}
            disabled={!validation.ok || !solid?.ok}
            className="w-full rounded-xl bg-accent px-4 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(194,65,12,0.9)] transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:bg-muted/40 disabled:shadow-none"
          >
            Download STL
          </button>
          <p className="mt-2 text-center text-[11px] text-muted">
            {validation.ok
              ? "Binary STL in millimetres, centred on the origin, ready to slice."
              : "Export is disabled while the configuration has errors."}
          </p>

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
              ? "Watertight, manifold shell verified"
              : "Solid not verified — export blocked"}
          </p>

          {exportError && (
            <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
              {exportError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
