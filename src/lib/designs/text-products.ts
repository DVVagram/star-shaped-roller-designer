/** Text family: one lettered plate with selectable outline, fixings and mirroring. */

import { circleOutline, roundedRect } from "@/lib/kit/outlines";
import { buildPrism } from "@/lib/kit/prism";
import type { LengthUnit, Point2D } from "@/lib/kit/units";

import { emptyResult, measure, round } from "./helpers";
import {
  FONT_FACES,
  buildTextMesh,
  isFontId,
  mergeMeshes,
  textWidthMm,
  translateMesh,
  type FontId,
} from "./text-kit";
import {
  defineDesign,
  previewOf,
  pushRange,
  rawLength,
  rawOption,
  type AnyDesign,
  type DesignIssue,
  type FieldDef,
} from "./types";

const U = (value: number, units: LengthUnit) => measure(value, units);
const R = (value: number, decimals = 2) => round(value, decimals);

type Shape = "rect" | "rounded" | "round" | "square";
type Holes = "none" | "top" | "corners";

const SHAPES: { value: Shape; label: string }[] = [
  { value: "rect", label: "Rectangle" },
  { value: "rounded", label: "Rounded ends" },
  { value: "round", label: "Round" },
  { value: "square", label: "Square" },
];

const HOLE_LAYOUTS: { value: Holes; label: string }[] = [
  { value: "none", label: "No holes" },
  { value: "top", label: "Hang hole at the top" },
  { value: "corners", label: "Two screw holes in the top corners" },
];

const shapeLabel = (shape: Shape) => SHAPES.find((item) => item.value === shape)?.label ?? "Plate";
const holesLabel = (holes: Holes) =>
  HOLE_LAYOUTS.find((item) => item.value === holes)?.label ?? "No holes";

const normalizeShape = (value: string): Shape =>
  SHAPES.some((item) => item.value === value) ? (value as Shape) : "rect";
const normalizeHoles = (value: string): Holes =>
  HOLE_LAYOUTS.some((item) => item.value === value) ? (value as Holes) : "none";

interface PlateDims {
  widthMm: number;
  heightMm: number;
  diameterMm: number;
  sizeMm: number;
}

const plateWidth = (shape: Shape, p: PlateDims): number =>
  shape === "round" ? p.diameterMm : shape === "square" ? p.sizeMm : p.widthMm;
const plateHeight = (shape: Shape, p: PlateDims): number =>
  shape === "round" ? p.diameterMm : shape === "square" ? p.sizeMm : p.heightMm;
const flatShape = (shape: string): boolean => shape !== "round" && shape !== "square";
const roundedHoleInset = (width: number, height: number, holeMm: number): number =>
  width / 2 - height / 2 - holeMm / 2 - 2;

function circleAt(cx: number, cy: number, radius: number, segments = 40): Point2D[] {
  return Array.from({ length: segments }, (_, i) => {
    const angle = (Math.PI * 2 * i) / segments;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });
}

function plateFor(
  shape: Shape,
  holes: Holes,
  dims: PlateDims,
  holeMm: number,
  thicknessMm: number,
) {
  const width = plateWidth(shape, dims);
  const height = plateHeight(shape, dims);

  let outline: Point2D[];
  if (shape === "round") {
    outline = circleOutline(width / 2, 72);
  } else if (shape === "square") {
    outline = roundedRect(width, height, Math.min(5, width * 0.12));
  } else {
    const corner = shape === "rounded" ? height / 2 : Math.min(6, height * 0.18);
    outline = roundedRect(width, height, corner);
  }

  const cutouts: Point2D[][] = [];
  if (holes === "top") {
    cutouts.push(circleAt(0, height / 2 - holeMm / 2 - 3, holeMm / 2));
  } else if (holes === "corners" && flatShape(shape)) {
    // A rounded-end plate has no square corner, so its two holes sit in the
    // flat part of the top edge instead of hanging off the radius.
    const x =
      shape === "rounded"
        ? Math.max(0, roundedHoleInset(width, height, holeMm))
        : width / 2 - holeMm / 2 - 4;
    const y = height / 2 - holeMm / 2 - 4;
    cutouts.push(circleAt(-x, y, holeMm / 2), circleAt(x, y, holeMm / 2));
  }

  return buildPrism({ rings: [outline, outline], holes: cutouts, thicknessMm });
}

function textOffsetY(holes: Holes, letterMm: number): number {
  if (holes === "none") return 0;
  if (holes === "corners") return -Math.min(2, letterMm * 0.1);
  return -Math.min(4, letterMm * 0.2);
}

function textSlug(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "text";
}

const fields: FieldDef[] = [
  {
    key: "text",
    label: "Text",
    kind: "text",
    section: "Letters",
    default: "ALEX",
    help: "Uppercase letters, digits, spaces and . , ' & ! ? + -",
  },
  {
    key: "font",
    label: "Font",
    kind: "select",
    section: "Letters",
    default: "sans",
    options: (Object.keys(FONT_FACES) as FontId[]).map((id) => ({
      value: id,
      label: FONT_FACES[id].label,
    })),
  },
  {
    key: "letter",
    label: "Letter height",
    kind: "length",
    section: "Letters",
    default: "20",
    min: 8,
    max: 30,
    hint: "Cap height in millimetres.",
  },
  {
    key: "relief",
    label: "Letter relief",
    kind: "length",
    section: "Letters",
    default: "2",
    min: 0.6,
    max: 5,
    hint: "How far the letters stand proud of the plate.",
  },
  {
    key: "lettering",
    label: "Lettering",
    kind: "select",
    section: "Letters",
    default: "normal",
    options: [
      { value: "normal", label: "Normal", description: "Reads correctly in the preview and on the part." },
      {
        value: "mirrored",
        label: "Mirrored for stamping",
        description: "Reads backwards on the part so a stamp or embosser leaves the right impression.",
      },
    ],
  },
  {
    key: "shape",
    label: "Plate shape",
    kind: "select",
    section: "Plate",
    default: "rect",
    options: SHAPES,
  },
  {
    key: "width",
    label: "Plate width",
    kind: "length",
    section: "Plate",
    default: "140",
    min: 50,
    max: 240,
    visible: (values) => flatShape(values.shape),
  },
  {
    key: "height",
    label: "Plate height",
    kind: "length",
    section: "Plate",
    default: "45",
    min: 22,
    max: 80,
    visible: (values) => flatShape(values.shape),
  },
  {
    key: "diameter",
    label: "Plate diameter",
    kind: "length",
    section: "Plate",
    default: "110",
    min: 50,
    max: 220,
    visible: (values) => values.shape === "round",
  },
  {
    key: "size",
    label: "Plate size",
    kind: "length",
    section: "Plate",
    default: "100",
    min: 30,
    max: 140,
    visible: (values) => values.shape === "square",
  },
  {
    key: "thickness",
    label: "Plate thickness",
    kind: "length",
    section: "Plate",
    default: "3",
    min: 1.5,
    max: 8,
  },
  {
    key: "holes",
    label: "Fixing",
    kind: "select",
    section: "Fixings",
    default: "top",
    options: HOLE_LAYOUTS,
  },
  {
    key: "hole",
    label: "Hole diameter",
    kind: "length",
    section: "Fixings",
    default: "4",
    min: 2,
    max: 10,
    visible: (values) => values.holes !== "none",
    hint: "One ring hole, or two matching screw holes.",
  },
];

const letteredPlate: AnyDesign = defineDesign({
  id: "lettered-plate",
  name: "Lettered plate",
  family: "text",
  eyebrow: "Name, sign or stamp",
  blurb:
    "One plate designer: pick a rectangle, rounded end, round or square outline, add a hang hole or two screw holes, and raise your text in relief.",
  lede:
    "A single plate for names, signs, tags and stamps. Choose the outline and the fixing layout, set the plate and letter sizes, and the text is measured in the typeface you pick before the mesh is built. The same designer covers a keychain tag, a screw-fixed door plate, a round table number, a square letter tile and a mirrored stamping plate.",
  use:
    "Making a name tag, door sign, table number, letter tile, label or stamping plate with editable text.",
  notesTitle: "How the plate and lettering are built",
  notes: [
    "The outline, fixing holes and text are separate features of one mesh: the plate is a closed prism with any holes cut as real through-holes, and each glyph is a closed body seated 0.4 mm into it. The text width is measured from the font advances and checked against the plate before export.",
    "A mirrored plate reads backwards in the preview on purpose: it is the geometry a stamp or embosser needs so the impression reads the right way round. Leave the lettering normal for a sign or tag, and check the physical result against your process before making a set.",
  ],
  chips: [
    { label: "Fonts", value: "4 faces" },
    { label: "Shapes", value: "4 outlines" },
    { label: "Text", value: "Up to 16 characters" },
  ],
  header: "Lettered Plate Designer - units: mm",
  multiBody: true,
  capability: "shape",
  fields,
  parse: (raw) => ({
    text: (raw.values.text ?? "").trim().toUpperCase(),
    font: rawOption(raw, "font", "sans"),
    lettering: rawOption(raw, "lettering", "normal"),
    shape: rawOption(raw, "shape", "rect"),
    holes: rawOption(raw, "holes", "top"),
    letterMm: rawLength(raw, "letter"),
    reliefMm: rawLength(raw, "relief"),
    thicknessMm: rawLength(raw, "thickness"),
    widthMm: rawLength(raw, "width"),
    heightMm: rawLength(raw, "height"),
    diameterMm: rawLength(raw, "diameter"),
    sizeMm: rawLength(raw, "size"),
    holeMm: rawLength(raw, "hole"),
  }),
  derive: (p, units) => {
    const errors: DesignIssue[] = [];
    const warnings: DesignIssue[] = [];
    const font: FontId = isFontId(p.font) ? p.font : "sans";
    const shape = normalizeShape(p.shape);
    const holes = normalizeHoles(p.holes);
    const mirrored = p.lettering === "mirrored";

    pushRange(errors, units, "letter", "Letter height", p.letterMm, 8, 30);
    pushRange(errors, units, "relief", "Letter relief", p.reliefMm, 0.6, 5);
    pushRange(errors, units, "thickness", "Plate thickness", p.thicknessMm, 1.5, 8);
    if (shape === "round") {
      pushRange(errors, units, "diameter", "Plate diameter", p.diameterMm, 50, 220);
    } else if (shape === "square") {
      pushRange(errors, units, "size", "Plate size", p.sizeMm, 30, 140);
    } else {
      pushRange(errors, units, "width", "Plate width", p.widthMm, 50, 240);
      pushRange(errors, units, "height", "Plate height", p.heightMm, 22, 80);
    }
    if (holes !== "none") {
      pushRange(errors, units, "hole", "Hole diameter", p.holeMm, 2, 10);
    }
    if (holes === "corners" && !flatShape(shape)) {
      errors.push({
        field: "holes",
        level: "error",
        message: "Corner holes need a rectangle or a rounded-end plate.",
      });
    }
    if (holes === "corners" && shape === "rounded") {
      const inset = roundedHoleInset(p.widthMm, p.heightMm, p.holeMm);
      if (inset < p.holeMm / 2 + 1) {
        errors.push({
          field: "holes",
          level: "error",
          message: "The rounded plate is too narrow for two corner holes; widen it or use one hang hole.",
        });
      }
    }
    if (errors.length > 0) return emptyResult(errors, warnings);

    if (p.text.length === 0) {
      errors.push({
        field: "text",
        level: "error",
        message: "Enter the text this part should carry.",
      });
    } else if (p.text.length > 16) {
      errors.push({
        field: "text",
        level: "error",
        message: "Keep the text to sixteen characters or fewer.",
      });
    } else if (!/^[A-Z0-9 .,'&!?+-]+$/.test(p.text)) {
      errors.push({
        field: "text",
        level: "error",
        message: "Use uppercase letters, digits, spaces and . , ' & ! ? + -",
      });
    } else {
      const missing = [...p.text].find(
        (char) => char !== " " && !FONT_FACES[font].font.data.glyphs[char],
      );
      if (missing) {
        errors.push({
          field: "font",
          level: "error",
          message: `This font has no “${missing}” glyph; change the font or the text.`,
        });
      }
    }
    if (errors.length > 0) return emptyResult(errors, warnings);

    const width = plateWidth(shape, p);
    const height = plateHeight(shape, p);
    const margin = holes === "corners" ? 12 : 8;
    const available =
      shape === "round"
        ? width * 0.72
        : shape === "square"
          ? width * 0.82
          : width - margin * 2;
    const rendered = textWidthMm(p.text, font, p.letterMm);

    if (rendered > available) {
      errors.push({
        field: "letter",
        level: "error",
        message: `The text is ${U(rendered, units)} wide but only ${U(Math.max(0, available), units)} fits; reduce the letter height or shorten the text.`,
      });
    }
    const heightLimit =
      shape === "square" ? height * 0.7 : shape === "round" ? height * 0.62 : height - 12;
    if (p.letterMm > heightLimit) {
      errors.push({
        field: "letter",
        level: "error",
        message: "The letters are taller than the plate can carry.",
      });
    }
    if (holes !== "none" && p.holeMm >= Math.min(width, height) / 3) {
      errors.push({
        field: "hole",
        level: "error",
        message: "The hole is too large for this plate.",
      });
    }
    if (p.reliefMm > p.thicknessMm) {
      warnings.push({
        field: "relief",
        level: "warning",
        message: "Letters taller than the plate are easy to snap off.",
      });
    }
    if (p.text.length > 12) {
      warnings.push({
        field: "text",
        level: "warning",
        message: "Long text on a small plate leaves very thin strokes.",
      });
    }

    const plateSize =
      shape === "round" || shape === "square"
        ? U(width, units)
        : `${U(width, units)} × ${U(height, units)}`;

    return {
      errors,
      warnings,
      readout: [
        { label: "Text", value: p.text, source: "input" },
        { label: "Font", value: FONT_FACES[font].label, source: "input" },
        { label: "Shape", value: shapeLabel(shape), source: "input" },
        { label: "Fixing", value: holesLabel(holes), source: "input" },
        { label: "Letter height", value: U(p.letterMm, units), source: "input" },
        { label: "Text width", value: U(rendered, units), source: "calc" },
        { label: "Plate", value: plateSize, source: "input" },
        { label: "Relief", value: U(p.reliefMm, units), source: "input" },
        ...(mirrored
          ? [{ label: "Lettering", value: "Mirrored for stamping", source: "calc" as const }]
          : []),
      ],
      preview: previewOf(
        `“${p.text}” · ${U(p.letterMm, units)} letters · ${shapeLabel(shape)}${mirrored ? " · mirrored" : ""}`,
        `LP${R(width, 0)}`,
        Math.max(width, 1),
        Math.max(height, 1),
        [
          { label: "Text", value: p.text },
          { label: "Font", value: FONT_FACES[font].label },
          { label: "Fixing", value: holes === "none" ? "No holes" : U(p.holeMm, units) },
        ],
      ),
    };
  },
  build: (p) => {
    const font: FontId = isFontId(p.font) ? p.font : "sans";
    const shape = normalizeShape(p.shape);
    const holes = normalizeHoles(p.holes);
    const mirrored = p.lettering === "mirrored";
    const plate = plateFor(shape, holes, p, p.holeMm, p.thicknessMm);
    const text = buildTextMesh({
      text: p.text,
      fontId: font,
      sizeMm: p.letterMm,
      depthMm: p.reliefMm + 0.4,
      mirror: mirrored,
    });
    const seated = translateMesh(
      text,
      0,
      textOffsetY(holes, p.letterMm),
      p.thicknessMm / 2 - 0.4,
    );
    return mergeMeshes([plate, seated]);
  },
  fileName: (p) => `lettered-plate-${textSlug(p.text)}.stl`,
});

export const textProducts: AnyDesign[] = [letteredPlate];
