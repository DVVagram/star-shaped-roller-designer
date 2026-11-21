import { describe, expect, it } from "vitest";

import { DESIGNS } from "./index";
import type { AnyDesign } from "./types";

/**
 * A catalogue-wide check that every designer is actually finished: copy of a
 * useful length, notes that explain a real mechanism, fields whose defaults sit
 * inside their own ranges, a readout and preview that never show a broken
 * number, validation that only points at fields that exist, chips that quote a
 * real range, and file names that survive a download.
 */

const problems: string[] = [];
const note = (id: string, message: string) => problems.push(`${id}: ${message}`);

function derive(design: AnyDesign, values: Record<string, string>, units: "mm" | "in" = "mm") {
  return design.derive({ values, units });
}

const rangePattern = /^(\d+(?:\.\d+)?)\s*–\s*(\d+(?:\.\d+)?)\s*(mm|°)?$/;

describe("designer catalogue: completeness", () => {
  it("has finished copy, fields, readouts, validation and file names everywhere", () => {
    const seen = {
      blurb: new Map<string, string[]>(),
      lede: new Map<string, string[]>(),
      note: new Map<string, string[]>(),
      title: new Map<string, string[]>(),
    };
    const remember = (table: Map<string, string[]>, text: string, id: string) =>
      table.set(text, [...(table.get(text) ?? []), id]);

    for (const design of DESIGNS) {
      const id = design.id;

      /* ---------------------------------------------------------------- copy */
      if (design.blurb.length < 40) note(id, `blurb is only ${design.blurb.length} characters`);
      if (design.lede.length < 90) note(id, `lede is only ${design.lede.length} characters`);
      if (design.chips.length < 3) note(id, `only ${design.chips.length} chips`);
      if (design.eyebrow.length > 24) note(id, `eyebrow is ${design.eyebrow.length} characters`);
      if (design.name.length > 22) note(id, `name is ${design.name.length} characters`);
      if (!/^[\x20-\x7e]+$/.test(design.header)) note(id, "STL header is not plain ASCII");
      if (design.use.length < 25) note(id, "use case is too short");
      remember(seen.blurb, design.blurb, id);
      remember(seen.lede, design.lede, id);

      /* --------------------------------------------------------------- notes */
      if (design.notes.length < 2) note(id, `only ${design.notes.length} notes`);
      if (design.notesTitle.length < 8) note(id, "notes heading is too short");
      for (const text of design.notes) {
        if (text.length < 70) note(id, `note is only ${text.length} characters: "${text.slice(0, 40)}…"`);
        remember(seen.note, text, id);
      }
      if (!design.notes.some((text) => /make|form|machine|finish|fit|material|fixture|grain|orient|cut|bore|turn|mould|assemble/i.test(text))) {
        note(id, "notes never say how to make or fit the part");
      }
      remember(seen.title, design.notesTitle, id);

      /* -------------------------------------------------------------- fields */
      const keys = new Set<string>();
      const sections = new Set<string>();
      for (const field of design.fields) {
        if (keys.has(field.key)) note(id, `duplicate field key "${field.key}"`);
        keys.add(field.key);
        sections.add(field.section);
        if (!field.label) note(id, `"${field.key}" has no label`);
        if (!field.section) note(id, `"${field.key}" has no section`);
        if (field.label.length > 22) note(id, `label "${field.label}" is too long`);
        if (field.default === "") note(id, `"${field.key}" has an empty default`);

        if (field.kind === "length" || field.kind === "number") {
          const value = Number(field.default);
          if (!Number.isFinite(value)) note(id, `"${field.key}" default "${field.default}" is not a number`);
          if (field.min !== undefined && value < field.min - 1e-9) note(id, `"${field.key}" default is below its minimum`);
          if (field.max !== undefined && value > field.max + 1e-9) note(id, `"${field.key}" default is above its maximum`);
          if (field.min !== undefined && field.max !== undefined && field.min >= field.max) {
            note(id, `"${field.key}" has an empty range`);
          }
        }
        if (field.kind === "count" && !Number.isInteger(Number(field.default))) {
          note(id, `"${field.key}" count default is not a whole number`);
        }
        if (field.kind === "select" && !field.options?.some((option) => option.value === field.default)) {
          note(id, `"${field.key}" default is not one of its options`);
        }
        if (field.kind === "toggle" && !["true", "false"].includes(field.default)) {
          note(id, `"${field.key}" toggle default is not true or false`);
        }

        /* Chips must quote a range the part actually accepts. */
        for (const chip of design.chips) {
          const match = chip.value.match(rangePattern);
          if (!match) continue;
          const low = Number(match[1]);
          const high = Number(match[2]);
          const unit = match[3];
          const matches = design.fields.some((candidate) => {
            if (candidate.min === undefined || candidate.max === undefined) return false;
            if (Math.abs(candidate.min - low) > 1e-6 || Math.abs(candidate.max - high) > 1e-6) return false;
            if (unit === "mm") return candidate.kind === "length";
            if (unit === "°") return candidate.kind === "number" || candidate.kind === "angle";
            return candidate.kind === "count";
          });
          if (!matches) note(id, `chip "${chip.label}: ${chip.value}" matches no field range`);
        }
      }
      if (design.fields.length < 2) note(id, `only ${design.fields.length} fields`);
      if (sections.size > 4) note(id, `fields are spread over ${sections.size} sections`);

      /* ------------------------------------------------------------ defaults */
      const defaults = { ...design.defaults };
      const clean = derive(design, defaults);
      if (clean.errors.length > 0) note(id, `defaults raise an error: ${clean.errors[0].message}`);
      if (clean.readout.length < 3) note(id, `readout has only ${clean.readout.length} rows`);
      const labels = clean.readout.map((row) => row.label);
      if (new Set(labels).size !== labels.length) note(id, "readout repeats a label");
      for (const row of clean.readout) {
        if (!row.value.trim()) note(id, `readout "${row.label}" is empty`);
        if (/NaN|Infinity|undefined/.test(row.value)) note(id, `readout "${row.label}" is ${row.value}`);
      }
      if (clean.preview.cells.length < 2) note(id, "preview has fewer than two cells");
      if (!clean.preview.label || !clean.preview.code) note(id, "preview has no label or code");
      if (!/^[A-Z0-9.\- ]+$/.test(clean.preview.code)) note(id, `preview code "${clean.preview.code}" is not upper case`);
      for (const cell of clean.preview.cells) {
        if (/NaN|Infinity|undefined/.test(cell.value)) note(id, `preview cell "${cell.label}" is ${cell.value}`);
      }

      /* ---------------------------------------------------------- validation */
      const probes: Record<string, string>[] = [
        Object.fromEntries(design.fields.map((field) => [field.key, ""])),
        Object.fromEntries(
          design.fields.map((field) => [
            field.key,
            field.kind === "select" ? (field.options?.[0]?.value ?? "") : field.kind === "toggle" ? "false" : "1e6",
          ]),
        ),
        Object.fromEntries(
          design.fields.map((field) => [
            field.key,
            field.kind === "select" ? (field.options?.[1]?.value ?? field.default) : field.kind === "toggle" ? "true" : "0",
          ]),
        ),
      ];
      for (const probe of probes) {
        let result;
        try {
          result = derive(design, probe);
        } catch (error) {
          note(id, `derive threw on a probe: ${(error as Error).message}`);
          continue;
        }
        for (const issue of [...result.errors, ...result.warnings]) {
          if (issue.field !== "global" && !keys.has(issue.field)) {
            note(id, `validation points at unknown field "${issue.field}"`);
          }
          if (!issue.message.trim()) note(id, "validation message is empty");
        }
      }

      /* --------------------------------------------------------- inch mode */
      const inchValues: Record<string, string> = {};
      for (const field of design.fields) {
        inchValues[field.key] =
          field.kind === "length" ? String(Number((Number(field.default) / 25.4).toFixed(4))) : field.default;
      }
      const inches = derive(design, inchValues, "in");
      if (inches.errors.length > 0) note(id, `inch defaults raise an error: ${inches.errors[0].message}`);
      for (const row of inches.readout) {
        if (/\bmm\b/.test(row.value)) note(id, `inch readout shows millimetres: "${row.label} = ${row.value}"`);
        if (/NaN|Infinity/.test(row.value)) note(id, `inch readout is broken: "${row.label}"`);
      }

      /* ----------------------------------------------------------- file name */
      const fileName = design.fileName({ values: defaults, units: "mm" });
      if (!/^[a-z0-9][a-z0-9.-]*\.stl$/.test(fileName)) note(id, `file name "${fileName}" is not a clean slug`);
    }

    for (const table of Object.values(seen)) {
      for (const [text, ids] of table) {
        if (ids.length > 1) note(ids.join(" / "), `shared copy: "${text.slice(0, 50)}…"`);
      }
    }

    expect(problems, problems.join("\n")).toEqual([]);
  });

  it("makes no build-area or 3D-printer assumptions", () => {
    const banned = /\b(print(?:er|ed|ing)?|slicer|filament|pla|petg|tpu|asa|infill|brim|layer|build volume|print bed)\b/i;
    const offenders: string[] = [];

    for (const design of DESIGNS) {
      const copy = [
        design.name,
        design.blurb,
        design.lede,
        design.use,
        design.notesTitle,
        ...design.notes,
        ...design.chips.flatMap((chip) => [chip.label, chip.value]),
        design.contract.intendedUse,
        design.contract.standard,
        design.contract.mating,
        design.contract.fitAllowance,
        ...design.contract.limitations,
        ...design.contract.notChecked,
      ];
      for (const text of copy) {
        if (banned.test(text)) offenders.push(`${design.id}: "${text}"`);
      }

      for (const field of design.fields) {
        if (field.kind === "length" && (field.min === 180 || field.max === 180)) {
          offenders.push(`${design.id}.${field.key}: still ranged to 180 mm`);
        }
      }
    }

    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});
