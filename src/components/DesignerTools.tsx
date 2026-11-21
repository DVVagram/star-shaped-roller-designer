import { useEffect, useState } from "react";

import type { CopyStatus } from "./useDesignConfig";

export interface ToolbarPreset {
  id: string;
  label: string;
  description?: string;
}

export function DesignerToolbar({
  presets,
  activePresetId,
  onPreset,
  copyStatus,
  onCopy,
}: {
  presets: readonly ToolbarPreset[];
  activePresetId?: string | null;
  onPreset: (id: string) => void;
  copyStatus: CopyStatus;
  onCopy: () => void;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-line bg-card px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
      {presets.length > 0 ? (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5" role="group" aria-label="Starting point">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            Starting point
          </span>
          {presets.map((preset) => {
            const active = preset.id === activePresetId;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={active}
                title={preset.description}
                onClick={() => onPreset(preset.id)}
                className={
                  active
                    ? "rounded-lg border border-accent/60 bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent-strong"
                    : "rounded-lg border border-line bg-white px-2.5 py-1 text-[11px] font-medium text-muted transition hover:bg-paper-deep hover:text-ink"
                }
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={onCopy}
        className={
          copyStatus === "copied"
            ? "shrink-0 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800"
            : copyStatus === "failed"
              ? "shrink-0 rounded-lg border border-red-300 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-800"
              : "shrink-0 rounded-lg border border-line bg-white px-2.5 py-1 text-[11px] font-medium text-muted transition hover:bg-paper-deep hover:text-ink"
        }
      >
        {copyStatus === "copied"
          ? "Link copied"
          : copyStatus === "failed"
            ? "Copy failed"
            : "Copy link"}
      </button>
    </div>
  );
}

export interface FieldIssue {
  fieldId: string;
  label: string;
  message: string;
}

export function FieldIssueSummary({
  fieldIssues,
  general,
  errorCount,
}: {
  fieldIssues: readonly FieldIssue[];
  general: readonly string[];
  errorCount: number;
}) {
  if (errorCount === 0) return null;
  return (
    <section
      id="builder-issues"
      tabIndex={-1}
      aria-live="polite"
      className="mb-5 rounded-2xl border border-red-300/70 bg-red-50 px-4 py-3.5 outline-none"
    >
      <h2 className="text-sm font-semibold text-red-900">
        {errorCount} field{errorCount === 1 ? " needs" : "s need"} attention before export
      </h2>
      <ul className="mt-2 grid gap-x-5 gap-y-1.5 text-xs text-red-800 sm:grid-cols-2">
        {general.map((message) => (
          <li key={message}>{message}</li>
        ))}
        {fieldIssues.map((issue) => (
          <li key={issue.fieldId}>
            <button
              type="button"
              data-field-id={issue.fieldId}
              onClick={() => {
                const field = document.getElementById(issue.fieldId);
                if (!field) return;
                field.scrollIntoView({ block: "center" });
                field.focus({ preventScroll: true });
              }}
              className="text-left font-semibold underline decoration-red-300 underline-offset-2 hover:text-red-950"
            >
              {issue.label}
            </button>
            <span className="text-red-700/90"> — {issue.message}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function StickyExportBar({
  errorCount,
  validationOk,
  solidOk,
  onExport,
  onReview,
}: {
  errorCount: number;
  validationOk: boolean;
  solidOk: boolean;
  onExport: () => void;
  onReview: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const builder = document.getElementById("builder");
    const panel = document.getElementById("export-panel");
    if (!builder || !panel) return;
    let builderVisible = true;
    let panelVisible = true;
    const update = () => setVisible(builderVisible && !panelVisible);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === builder) builderVisible = entry.isIntersecting;
          if (entry.target === panel) panelVisible = entry.isIntersecting;
        }
        update();
      },
      { threshold: 0.01 },
    );
    observer.observe(builder);
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);

  if (!visible) return null;
  const ready = errorCount === 0 && validationOk && solidOk;
  const status =
    errorCount > 0
      ? `${errorCount} field${errorCount === 1 ? " needs" : "s need"} attention`
      : !validationOk
        ? "Check the highlighted values"
        : !solidOk
          ? "Mesh check failed"
          : "Ready to export";

  return (
    <div
      role="region"
      aria-label="Export actions"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_-18px_rgba(21,23,28,0.45)] backdrop-blur print:hidden"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <p className="flex min-w-0 items-center gap-2 text-xs text-muted">
          <span
            aria-hidden="true"
            className={ready ? "text-emerald-700" : "text-red-700"}
          >
            ●
          </span>
          <span className="truncate">{status}</span>
        </p>
        <button
          type="button"
          onClick={ready ? onExport : onReview}
          className={
            ready
              ? "shrink-0 rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-accent-strong"
              : "shrink-0 rounded-lg border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink transition hover:bg-paper-deep"
          }
        >
          {ready ? "Download STL" : "Review issues"}
        </button>
      </div>
    </div>
  );
}
