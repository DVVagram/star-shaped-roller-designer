/** Swept parts: a helical spring wire and a pipe elbow. */

import { buildHelicalTube, buildSweptAnnulus } from "@/lib/kit/sweep";

import { checkSize, emptyResult, measure, round } from "./helpers";
import {
  defineDesign,
  previewOf,
  pushInteger,
  pushRange,
  pushWarning,
  rawCount,
  rawLength,
  rawNumber,
  type AnyDesign,
  type DesignIssue,
} from "./types";

/* ---------------------------------------------------------------- spring */

export const compressionSpring: AnyDesign = defineDesign({
  id: "compression-spring",
  name: "Compression spring",
  family: "motion",
  eyebrow: "Helical wire",
  blurb: "An open-coil spring with square-cut ends and a calculated rate.",
  lede: "A circular wire swept along a real helix, with both ends cut square to the path. Set the outside diameter, wire diameter, coil count and pitch; the free length and the spring rate follow from the standard helical-spring equations.",
  chips: [
    { label: "Coils", value: "1 – 30" },
    { label: "Outside Ø", value: "6 – 120 mm" },
    { label: "Wire", value: "0.5 – 10 mm" },
  ],
  notes: [
    "The mean diameter is the outside diameter minus one wire, and the rate is `k = G·d⁴ / (8·D³·n)` with G = 3.5 GPa for PLA. That is the same equation a metal spring uses; only the shear modulus changes, which is why a printed spring is much softer than a steel one of the same size.",
    "A printed spring wants a pitch of at least 1.5 wire diameters so the coils cannot fuse, and it should be compressed only to about 25 % of its free length. Print it upright with the wire in the bed — supports inside the coils are impossible to remove.",
  ],
  header: "Compression Spring Designer - units: mm",
  fields: [
    { key: "outerDiameter", label: "Outside diameter", kind: "length", section: "Spring", default: "30", min: 6, max: 120 },
    { key: "wireDiameter", label: "Wire diameter", kind: "length", section: "Spring", default: "3", min: 0.5, max: 10 },
    { key: "coils", label: "Active coils", kind: "count", section: "Spring", default: "8", min: 1, max: 30 },
    { key: "pitch", label: "Coil pitch", kind: "length", section: "Spring", default: "6", min: 1, max: 40, hint: "Centre-to-centre rise per turn." },
  ],
  parse: (raw) => ({
    outerMm: rawLength(raw, "outerDiameter"),
    wireMm: rawLength(raw, "wireDiameter"),
    coils: rawCount(raw, "coils"),
    pitchMm: rawLength(raw, "pitch"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "outerDiameter", "Outside diameter", p.outerMm, 6, 120);
    pushRange(errors, units, "wireDiameter", "Wire diameter", p.wireMm, 0.5, 10);
    pushInteger(errors, "coils", "Active coils", p.coils, 1, 30);
    pushRange(errors, units, "pitch", "Coil pitch", p.pitchMm, 1, 40);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const mean = p.outerMm - p.wireMm;
    const freeLength = p.coils * p.pitchMm + p.wireMm;
    checkSize(errors, units, "outerDiameter", p.outerMm, freeLength);
    if (mean <= p.wireMm * 1.2) errors.push({ field: "wireDiameter", level: "error", message: "The wire leaves no room for the coil." });
    if (p.pitchMm < p.wireMm * 1.15) errors.push({ field: "pitch", level: "error", message: "The coils touch — increase the pitch above one wire diameter." });
    if (p.pitchMm > p.outerMm) pushWarning(warnings, "pitch", "A pitch wider than the spring diameter makes a very open coil.");
    if (p.coils > 20) pushWarning(warnings, "coils", "Above twenty coils the mesh gets large and the spring is hard to print cleanly.");

    const modulus = 3500; // N/mm², PLA
    const rate = (modulus * p.wireMm ** 4) / (8 * mean ** 3 * p.coils);
    const index = mean / p.wireMm;

    return {
      errors,
      warnings,
      readout: [
        { label: "Outside Ø", value: measure(p.outerMm, units), source: "input" },
        { label: "Wire Ø", value: measure(p.wireMm, units), source: "input" },
        { label: "Mean Ø", value: measure(mean, units), source: "calc" },
        { label: "Coils", value: String(Math.round(p.coils)), source: "input" },
        { label: "Pitch", value: measure(p.pitchMm, units), source: "input" },
        { label: "Free length", value: measure(freeLength, units), source: "calc" },
        { label: "Spring index", value: round(index, 2), source: "calc" },
        {
          label: "Rate (PLA)",
          value: units === "in" ? `${round(rate * 5.7101, 2)} lb/in` : `${round(rate, 3)} N/mm`,
          source: "calc",
        },
      ],
      preview: previewOf(
        `${Math.round(p.coils)} coils · ${measure(freeLength, units)} free`,
        `SP${round(p.outerMm, 0)}-${Math.round(p.coils)}`,
        p.outerMm,
        freeLength,
        [
          { label: "Outside Ø", value: measure(p.outerMm, units) },
          { label: "Free length", value: measure(freeLength, units) },
          { label: "Wire", value: measure(p.wireMm, units) },
        ],
      ),
    };
  },
  build: (p) =>
    buildHelicalTube({
      coilRadiusMm: (p.outerMm - p.wireMm) / 2,
      wireRadiusMm: p.wireMm / 2,
      coils: p.coils,
      pitchMm: p.pitchMm,
      pathSteps: Math.max(64, Math.round(p.coils * 48)),
      wireSegments: 18,
    }),
  fileName: (p) => `spring-${round(p.outerMm, 0)}d-${round(p.wireMm, 1)}w-${Math.round(p.coils)}c.stl`,
});

/* ------------------------------------------------------------ pipe elbow */

export const pipeElbow: AnyDesign = defineDesign({
  id: "pipe-elbow",
  name: "Pipe elbow",
  family: "motion",
  eyebrow: "Bent tube",
  blurb: "A round pipe bend with square-cut ends and a constant wall.",
  lede: "An annulus swept along a circular arc, closed with flat annular faces at both ends. Set the pipe size, wall, bend radius and angle and the elbow is a true torus segment — no faceted bend and no kink on the inside of the curve.",
  chips: [
    { label: "Pipe Ø", value: "8 – 160 mm" },
    { label: "Bend angle", value: "15 – 180°" },
    { label: "Bend radius", value: "10 – 140 mm" },
  ],
  notes: [
    "The cross-section is an annulus perpendicular to the path at every station, so the bore stays round around the bend. The inside of the bend is a real torus surface, which is why the wall thickness stays constant even when the bend radius is tight.",
    "Keep the bend radius at least 1.5 pipe diameters or the inner wall pinches. Print with the bend flat on the bed and the axis vertical at both ends if possible; a bend printed upright needs support under the outside of the arc.",
  ],
  header: "Pipe Elbow Designer - units: mm",
  fields: [
    { key: "pipeDiameter", label: "Pipe outside Ø", kind: "length", section: "Elbow", default: "40", min: 8, max: 160 },
    { key: "wall", label: "Wall thickness", kind: "length", section: "Elbow", default: "3", min: 1, max: 12 },
    { key: "bendRadius", label: "Bend radius", kind: "length", section: "Bend", default: "50", min: 10, max: 140, hint: "Measured to the pipe centre line." },
    { key: "angle", label: "Bend angle", kind: "number", section: "Bend", default: "90", min: 15, max: 180 },
  ],
  parse: (raw) => ({
    pipeMm: rawLength(raw, "pipeDiameter"),
    wallMm: rawLength(raw, "wall"),
    bendMm: rawLength(raw, "bendRadius"),
    angleDeg: rawNumber(raw, "angle"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    pushRange(errors, units, "pipeDiameter", "Pipe outside diameter", p.pipeMm, 8, 160);
    pushRange(errors, units, "wall", "Wall thickness", p.wallMm, 1, 12);
    pushRange(errors, units, "bendRadius", "Bend radius", p.bendMm, 10, 140);
    pushRange(errors, units, "angle", "Bend angle", p.angleDeg, 15, 180, false);
    if (errors.length > 0) return emptyResult(errors, warnings);

    const outer = p.pipeMm / 2;
    const inner = outer - p.wallMm;
    const arcLength = (p.bendMm * p.angleDeg * Math.PI) / 180;
    const extent = p.bendMm + 2 * outer;
    checkSize(errors, units, "pipeDiameter", extent, extent);
    if (inner <= 0.3) errors.push({ field: "wall", level: "error", message: "The wall closes the pipe." });
    if (p.bendMm < outer + 1) errors.push({ field: "bendRadius", level: "error", message: "The bend is tighter than the pipe — the inner wall would self-intersect." });
    if (p.bendMm < p.pipeMm * 1.5) pushWarning(warnings, "bendRadius", "A bend radius under 1.5 pipe diameters pinches the inside wall.");

    return {
      errors,
      warnings,
      readout: [
        { label: "Pipe outside Ø", value: measure(p.pipeMm, units), source: "input" },
        { label: "Bore", value: measure(inner * 2, units), source: "calc" },
        { label: "Bend radius", value: measure(p.bendMm, units), source: "input" },
        { label: "Bend angle", value: `${round(p.angleDeg, 1)}°`, source: "input" },
        { label: "Centre-line arc", value: measure(arcLength, units), source: "calc" },
        { label: "Wall", value: measure(p.wallMm, units), source: "input" },
      ],
      preview: previewOf(
        `${round(p.angleDeg, 0)}° bend · ${measure(p.pipeMm, units)} pipe`,
        `EL${round(p.pipeMm, 0)}-${round(p.angleDeg, 0)}`,
        extent,
        extent,
        [
          { label: "Pipe Ø", value: measure(p.pipeMm, units) },
          { label: "Bend R", value: measure(p.bendMm, units) },
          { label: "Angle", value: `${round(p.angleDeg, 0)}°` },
        ],
      ),
    };
  },
  build: (p) =>
    buildSweptAnnulus({
      bendRadiusMm: p.bendMm,
      outerRadiusMm: p.pipeMm / 2,
      innerRadiusMm: p.pipeMm / 2 - p.wallMm,
      angleRad: (p.angleDeg * Math.PI) / 180,
      pathSteps: Math.max(12, Math.round((p.angleDeg / 5) + 8)),
      segments: 36,
    }),
  fileName: (p) => `pipe-elbow-${round(p.pipeMm, 0)}d-${round(p.angleDeg, 0)}a.stl`,
});

export const motionDesigns: AnyDesign[] = [compressionSpring, pipeElbow];
