import type { ReactNode } from "react";

import { CAPABILITIES, type CapabilityId } from "@/lib/designs/contracts";

import { CapabilityBadge } from "./CapabilityNotice";
import MeshPreview, { type PreviewMesh } from "./MeshPreview";

export interface ReadoutItem {
  label: string;
  value: string;
  source: "input" | "calc";
}

export interface ScaffoldPreview {
  label: string;
  code: string;
  mesh: PreviewMesh | null;
  sizeMm: number;
  heightMm: number;
  ariaLabel: string;
  cells: { label: string; value: string }[];
  stale: boolean;
}

export interface ScaffoldExport {
  onExport: () => void;
  disabled: boolean;
  note: string;
  volume: string;
  triangles: string;
  file: string;
  watertight: boolean;
  error: string | null;
  capability?: CapabilityId;
  limitation?: string;
  onSpec?: () => void;
  onDrawing?: () => void;
  artifactsDisabled?: boolean;
}

interface DesignScaffoldProps {
  form: ReactNode;
  general: string[];
  warnings: string[];
  errorCount: number;
  validationOk: boolean;
  solidOk: boolean;
  readout: ReadoutItem[];
  preview: ScaffoldPreview;
  exportPanel: ScaffoldExport;
}

/** The two-column builder used by every designer: inputs left, solid right. */
export default function DesignScaffold({
  form,
  general,
  warnings,
  errorCount,
  validationOk,
  solidOk,
  readout,
  preview,
  exportPanel,
}: DesignScaffoldProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
      <div className="space-y-5">
        {form}

        <div aria-live="polite" className="space-y-2">
          {general.map((message) => (
            <p
              key={message}
              className="rounded-lg border border-red-300/70 bg-red-50 px-3 py-2 text-xs text-red-800"
            >
              {message}
            </p>
          ))}
          {errorCount > 0 && (
            <p className="rounded-lg border border-red-300/70 bg-red-50 px-3 py-2 text-xs text-red-800">
              {errorCount} field{errorCount === 1 ? " needs" : "s need"} attention before
              the STL can be exported.
            </p>
          )}
          {warnings.map((message) => (
            <p
              key={message}
              className="flex gap-2 rounded-lg border border-amber-300/50 bg-amber-50/70 px-3 py-2 text-xs leading-relaxed text-amber-900"
            >
              <span aria-hidden="true" className="mt-px">
                ▲
              </span>
              <span>{message}</span>
            </p>
          ))}
          {validationOk && !solidOk && (
            <p className="rounded-lg border border-red-300/70 bg-red-50 px-3 py-2 text-xs text-red-800">
              The generated solid is not a single watertight, manifold shell, so this
              configuration cannot be exported.
            </p>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-[0_1px_2px_rgba(21,23,28,0.04)]">
          <div className="flex items-baseline justify-between gap-3 px-5 py-3.5 sm:px-6">
            <h2 className="text-base font-semibold tracking-tight">
              Calculated measurements
            </h2>
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted">calc</span>
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

      <div className="space-y-5 lg:sticky lg:top-20">
        <div className="overflow-hidden rounded-2xl border border-panel bg-panel shadow-[0_18px_40px_-24px_rgba(16,19,25,0.55)]">
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
              {preview.label}
            </p>
            <span className="shrink-0 font-mono text-[10px] text-white/35">
              {preview.code}
            </span>
          </div>

          <div className="relative h-[320px] overflow-hidden border-y border-white/10 bg-[radial-gradient(circle_at_50%_35%,#1d2734_0%,#101319_70%)] sm:h-[400px]">
            <MeshPreview
              mesh={preview.mesh}
              sizeMm={preview.sizeMm}
              heightMm={preview.heightMm}
              label={preview.ariaLabel}
            />
            {preview.stale && (
              <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-lg bg-panel-soft/90 px-3 py-2 text-[11px] leading-snug text-amber-200/90 ring-1 ring-amber-300/20">
                Showing the last valid design — fix the errors to update the preview.
              </div>
            )}
          </div>

          <dl className="grid grid-cols-3 gap-px bg-white/10">
            {preview.cells.map((cell) => (
              <div key={cell.label} className="bg-panel px-3 py-2.5">
                <dt className="truncate text-[9px] uppercase tracking-[0.12em] text-white/35">
                  {cell.label}
                </dt>
                <dd className="mt-0.5 font-mono text-[12px] text-white/90 numeric">
                  {cell.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-2xl border border-line bg-card p-4 sm:p-5">
          {exportPanel.capability && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <CapabilityBadge capability={exportPanel.capability} />
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
          )}
          {exportPanel.capability && exportPanel.limitation && (
            <p className="mb-3 rounded-lg border border-amber-300/60 bg-amber-50/70 px-2.5 py-2 text-[11px] leading-relaxed text-amber-900">
              {CAPABILITIES[exportPanel.capability].short}: {exportPanel.limitation}
            </p>
          )}
          <button
            type="button"
            onClick={exportPanel.onExport}
            disabled={exportPanel.disabled}
            className="w-full rounded-xl bg-accent px-4 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(194,65,12,0.9)] transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:bg-muted/40 disabled:shadow-none"
          >
            Download STL
          </button>
          <p className="mt-2 text-center text-[11px] leading-relaxed text-muted">{exportPanel.note}</p>

          {(exportPanel.onSpec || exportPanel.onDrawing) && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {exportPanel.onSpec && (
                <button
                  type="button"
                  onClick={exportPanel.onSpec}
                  disabled={exportPanel.artifactsDisabled}
                  className="rounded-lg border border-line bg-white px-2 py-2 text-[11px] font-medium text-ink transition hover:bg-paper-deep disabled:cursor-not-allowed disabled:text-muted/50"
                >
                  Specification (.txt)
                </button>
              )}
              {exportPanel.onDrawing && (
                <button
                  type="button"
                  onClick={exportPanel.onDrawing}
                  disabled={exportPanel.artifactsDisabled}
                  className="rounded-lg border border-line bg-white px-2 py-2 text-[11px] font-medium text-ink transition hover:bg-paper-deep disabled:cursor-not-allowed disabled:text-muted/50"
                >
                  Dimension sheet (.svg)
                </button>
              )}
            </div>
          )}

          <dl className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line">
            {[
              ["Volume", exportPanel.volume],
              ["Triangles", exportPanel.triangles],
              ["File", exportPanel.file],
            ].map(([label, value]) => (
              <div key={label} className="bg-card px-3 py-2">
                <dt className="text-[9px] uppercase tracking-[0.12em] text-muted">{label}</dt>
                <dd className="mt-0.5 font-mono text-[12px] text-ink numeric">{value}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
            <span
              aria-hidden="true"
              className={exportPanel.watertight ? "text-emerald-700" : "text-red-700"}
            >
              ●
            </span>
            {exportPanel.watertight
              ? "Mesh topology and 180 mm envelope verified — not a fit or safety test"
              : "Mesh not verified — export blocked"}
          </p>

          {exportPanel.error && (
            <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
              {exportPanel.error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
