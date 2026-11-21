import { useEffect, useMemo, useRef, useState } from "react";

import {
  buildBinaryStl,
  downloadStl,
  inspectMesh,
  stlByteLength,
  type Mesh,
} from "@/lib/kit/solid";
import { CAPABILITIES } from "@/lib/designs/contracts";
import { downloadText } from "@/lib/kit/download";
import { formatNumber } from "@/lib/kit/units";
import { buildDrawingSvg, drawingFileName } from "@/lib/designs/drawing";
import {
  buildSpecification,
  envelopeFits,
  specificationFileName,
} from "@/lib/designs/spec";
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
  const measure =
    field.kind === "length"
      ? "Length; enter in mm or in"
      : field.kind === "angle"
        ? "Angle in degrees"
        : field.kind === "count"
          ? "Whole number"
          : undefined;
  return [field.help ?? field.hint, measure, limit, "Edits rebuild the mesh and readouts."]
    .filter(Boolean)
    .join(" · ");
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

  const fitsBuildVolume = Boolean(mesh && envelopeFits(mesh));
  const watertight = Boolean(valid && report?.ok && fitsBuildVolume);
  const volumeCm3 = report?.ok ? report.volumeMm3 / 1000 : Number.NaN;
  const fileBytes = mesh ? stlByteLength(mesh) : 0;
  const fieldLabel = (key: string) =>
    design.fields.find((field) => field.key === key)?.label ?? key;

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
    if (!fitsBuildVolume) {
      setExportError("The generated part does not fit the 180 mm build cube, so it was not exported.");
      return;
    }
    try {
      const buffer = buildBinaryStl(
        design.build(raw),
        `${CAPABILITIES[design.contract.capability].short.toUpperCase()} - ${design.header}`,
      );
      downloadStl(buffer, design.fileName(raw));
    } catch (error) {
      console.error(error);
      setExportError("The STL could not be generated. Please try again.");
    }
  }

  function handleSpec() {
    if (!valid || !report?.ok) return;
    try {
      downloadText(
        buildSpecification(design, raw),
        specificationFileName(design, raw),
      );
    } catch (error) {
      console.error(error);
      setExportError("The specification could not be generated. Please try again.");
    }
  }

  function handleDrawing() {
    if (!valid || !report?.ok) return;
    try {
      downloadText(
        buildDrawingSvg(design, raw),
        drawingFileName(design, raw),
        "image/svg+xml",
      );
    } catch (error) {
      console.error(error);
      setExportError("The dimension sheet could not be generated. Please try again.");
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
          <p className="mt-1 text-[11px] leading-snug text-muted/80">{rangeHint(field)}</p>
        </div>
      );
    }

    if (field.kind === "toggle") {
      return (
        <div key={field.key} className="sm:col-span-2">
          <Toggle
            id={id}
            label={field.label}
            hint={rangeHint(field)}
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
      general={[
        ...generalErrors,
        ...(report?.ok && !fitsBuildVolume
          ? ["The part exceeds the 180 mm build cube. Reduce an overall dimension before exporting."]
          : []),
      ]}
      warnings={result.warnings.map((issue) => `${fieldLabel(issue.field)}: ${issue.message}`)}
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
        onSpec: handleSpec,
        onDrawing: handleDrawing,
        artifactsDisabled: !watertight,
        capability: design.contract.capability,
        limitation: design.contract.limitations[0],
        disabled: !watertight,
        note: valid
          ? `${report && report.zeroAreaFaces > 0 ? `${report.zeroAreaFaces} zero-area cap face${report.zeroAreaFaces === 1 ? "" : "s"} from hole bridging are reported; slicers normally skip them. ` : ""}Binary STL, coordinates in millimetres. STL has no units or metadata: verify scale and orientation in your slicer.`
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
