import { useEffect, useMemo, useRef, useState } from "react";

import {
  buildBinaryStl,
  downloadStl,
  inspectMesh,
  stlByteLength,
  type Mesh,
} from "@/lib/kit/solid";
import { formatNumber } from "@/lib/kit/units";
import type { AnyDesign, FieldDef } from "@/lib/designs/types";

import DesignScaffold from "./DesignScaffold";
import { NumberField, Segmented, Toggle } from "./fields";
import { useUnitValues } from "./useUnitValues";

function rangeHint(field: FieldDef): string | undefined {
  const limit =
    field.min !== undefined && field.max !== undefined
      ? field.kind === "length"
        ? `${formatNumber(field.min)}–${formatNumber(field.max)} mm`
        : field.kind === "angle"
          ? `${field.min}–${field.max}°`
          : `${field.min}–${field.max}`
      : undefined;
  return [field.hint, limit].filter(Boolean).join(" · ") || undefined;
}

/**
 * One form for every schema-driven designer.
 *
 * The field list comes from the design module, so the form, the millimetre
 * parameters, the validation and the STL export all read the same declaration.
 */
export default function GenericDesigner({ design }: { design: AnyDesign }) {
  const { units, values, setField, setUnits, reset } = useUnitValues(
    design.defaults,
    design.lengthFields,
  );
  const [exportError, setExportError] = useState<string | null>(null);

  const raw = useMemo(() => ({ values, units }), [values, units]);
  const result = useMemo(() => design.derive(raw), [design, raw]);
  const valid = result.errors.length === 0;

  // The preview keeps the last configuration that validated, so a typo in one
  // field does not blank the solid or hide the part you were looking at.
  const lastValid = useRef(raw);
  useEffect(() => {
    if (valid) lastValid.current = raw;
  }, [valid, raw]);
  const shown = valid ? raw : lastValid.current;
  const display = useMemo(() => design.derive(shown), [design, shown]);

  const mesh = useMemo<Mesh | null>(() => {
    try {
      return design.build(shown);
    } catch {
      return null;
    }
  }, [design, shown]);

  const report = useMemo(() => {
    if (!mesh) return null;
    try {
      return inspectMesh(mesh);
    } catch {
      return null;
    }
  }, [mesh]);

  const errorsByField = new Map<string, string>();
  for (const issue of result.errors) {
    if (!errorsByField.has(issue.field)) errorsByField.set(issue.field, issue.message);
  }
  const generalErrors = result.errors
    .filter((issue) => issue.field === "general")
    .map((issue) => issue.message);

  const visible = design.fields.filter((field) => field.visible?.(values) ?? true);
  const sections = Array.from(new Set(visible.map((field) => field.section)));

  const watertight = Boolean(valid && report?.ok);
  const volumeCm3 = report?.ok ? report.volumeMm3 / 1000 : Number.NaN;
  const fileBytes = mesh ? stlByteLength(mesh) : 0;

  function handleExport() {
    setExportError(null);
    if (!valid) {
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
      const buffer = buildBinaryStl(design.build(raw), design.header);
      downloadStl(buffer, design.fileName(raw));
    } catch (error) {
      console.error(error);
      setExportError("The STL could not be generated. Please try again.");
    }
  }

  function renderField(field: FieldDef) {
    const id = `${design.id}-${field.key}`;
    const error = errorsByField.get(field.key);

    if (field.kind === "select" && field.options) {
      return (
        <div key={field.key}>
          <label
            htmlFor={id}
            className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-muted"
          >
            {field.label}
          </label>
          <select
            id={id}
            value={values[field.key] ?? field.default}
            onChange={(event) => setField(field.key, event.target.value)}
            className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[15px] text-ink outline-none transition focus:border-accent/60"
          >
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {error && <p className="mt-1 text-[11px] leading-snug text-red-700">{error}</p>}
        </div>
      );
    }

    if (field.kind === "toggle") {
      return (
        <div key={field.key} className="sm:col-span-2">
          <Toggle
            id={id}
            label={field.label}
            hint={field.hint}
            checked={values[field.key] === "true"}
            onChange={(next) => setField(field.key, next ? "true" : "false")}
          />
          {error && <p className="mt-1 text-[11px] leading-snug text-red-700">{error}</p>}
        </div>
      );
    }

    return (
      <NumberField
        key={field.key}
        id={id}
        label={field.label}
        value={values[field.key] ?? ""}
        onChange={(next) => setField(field.key, next)}
        unit={field.kind === "length" ? units : field.kind === "angle" ? "°" : undefined}
        hint={rangeHint(field)}
        error={error}
      />
    );
  }

  return (
    <DesignScaffold
      form={
        <div className="rounded-2xl border border-line bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-tight">Dimensions</h2>
            <div className="flex items-center gap-2">
              <Segmented
                label="Units"
                value={units}
                options={[
                  { value: "mm", label: "mm" },
                  { value: "in", label: "in" },
                ]}
                onChange={setUnits}
              />
              <button
                type="button"
                onClick={reset}
                className="rounded-md border border-line bg-white px-2.5 py-1 text-[11px] font-medium text-muted transition hover:bg-paper-deep hover:text-ink"
              >
                Reset
              </button>
            </div>
          </div>

          {sections.map((section) => (
            <fieldset key={section} className="mt-4 border-t border-line pt-3">
              <legend className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">
                {section}
              </legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {visible.filter((field) => field.section === section).map(renderField)}
              </div>
            </fieldset>
          ))}
        </div>
      }
      general={generalErrors}
      warnings={result.warnings.map((issue) => issue.message)}
      errorCount={result.errors.length}
      validationOk={valid}
      solidOk={Boolean(report?.ok)}
      readout={display.readout}
      preview={{
        label: display.preview.label,
        code: display.preview.code,
        mesh,
        sizeMm: display.preview.sizeMm,
        heightMm: display.preview.heightMm,
        ariaLabel: `${design.name} 3D preview`,
        cells: display.preview.cells,
        stale: !valid,
      }}
      exportPanel={{
        onExport: handleExport,
        disabled: !watertight,
        note: valid
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
