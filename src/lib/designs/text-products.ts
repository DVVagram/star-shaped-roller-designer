/** Text batch: fifty products built from a plate plus raised lettering. */

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

type Range = [number, number, number];
type Shape = "rect" | "tag" | "round" | "square";
type Hole = "none" | "top" | "corners";

interface TextProductConfig {
  id: string;
  name: string;
  eyebrow: string;
  blurb: string;
  lede: string;
  use: string;
  notesTitle: string;
  notes: [string, string];
  shape: Shape;
  hole: Hole;
  text: string;
  fonts: FontId[];
  width?: Range;
  height?: Range;
  diameter?: Range;
  size?: Range;
  letter: Range;
  thickness: Range;
  relief: Range;
  holeDia?: Range;
  mirror?: boolean;
}

function circleAt(cx: number, cy: number, radius: number, segments = 40): Point2D[] {
  return Array.from({ length: segments }, (_, i) => {
    const angle = (Math.PI * 2 * i) / segments;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });
}

function plateFor(
  cfg: TextProductConfig,
  dims: { width: number; height: number; diameter: number; size: number },
  holeMm: number,
  thicknessMm: number,
) {
  let outline: Point2D[];
  const holes: Point2D[][] = [];
  if (cfg.shape === "round") {
    outline = circleOutline(dims.diameter / 2, 72);
    if (cfg.hole === "top") {
      holes.push(circleAt(0, dims.diameter / 2 - holeMm / 2 - 3, holeMm / 2));
    }
  } else if (cfg.shape === "square") {
    outline = roundedRect(dims.size, dims.size, Math.min(5, dims.size * 0.12));
  } else {
    const corner = Math.min(6, dims.height * 0.18);
    outline = roundedRect(dims.width, dims.height, corner);
    if (cfg.hole === "corners") {
      const x = dims.width / 2 - holeMm / 2 - 4;
      const y = dims.height / 2 - holeMm / 2 - 4;
      holes.push(circleAt(-x, y, holeMm / 2), circleAt(x, y, holeMm / 2));
    } else if (cfg.hole === "top") {
      holes.push(circleAt(0, dims.height / 2 - holeMm / 2 - 3, holeMm / 2));
    }
  }
  return buildPrism({ rings: [outline, outline], holes, thicknessMm });
}

function textOffsetY(cfg: TextProductConfig, letterMm: number): number {
  if (cfg.hole === "none" || cfg.hole === "corners") return cfg.hole === "corners" ? -2 : 0;
  return -Math.min(4, letterMm * 0.2);
}

function textSlug(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "text";
}

function defineTextProduct(cfg: TextProductConfig): AnyDesign {
  const fields: FieldDef[] = [
    {
      key: "text",
      label: "Text",
      kind: "text",
      section: "Letters",
      default: cfg.text,
      help: "Uppercase letters, digits, spaces and . , ' & ! ? + -",
    },
    {
      key: "font",
      label: "Font",
      kind: "select",
      section: "Letters",
      default: cfg.fonts[0],
      options: cfg.fonts.map((id) => ({ value: id, label: FONT_FACES[id].label })),
    },
    {
      key: "letter",
      label: "Letter height",
      kind: "length",
      section: "Letters",
      default: String(cfg.letter[2]),
      min: cfg.letter[0],
      max: cfg.letter[1],
    },
    {
      key: "relief",
      label: "Letter relief",
      kind: "length",
      section: "Letters",
      default: String(cfg.relief[2]),
      min: cfg.relief[0],
      max: cfg.relief[1],
      hint: "How far the letters stand proud of the plate.",
    },
  ];

  if (cfg.shape === "round" || cfg.shape === "square") {
    fields.push({
      key: cfg.shape === "round" ? "diameter" : "size",
      label: cfg.shape === "round" ? "Plate diameter" : "Plate size",
      kind: "length",
      section: "Plate",
      default: String((cfg.diameter ?? cfg.size)![2]),
      min: (cfg.diameter ?? cfg.size)![0],
      max: (cfg.diameter ?? cfg.size)![1],
    });
  } else {
    fields.push(
      {
        key: "width",
        label: "Plate width",
        kind: "length",
        section: "Plate",
        default: String(cfg.width![2]),
        min: cfg.width![0],
        max: cfg.width![1],
      },
      {
        key: "height",
        label: "Plate height",
        kind: "length",
        section: "Plate",
        default: String(cfg.height![2]),
        min: cfg.height![0],
        max: cfg.height![1],
      },
    );
  }

  fields.push({
    key: "thickness",
    label: "Plate thickness",
    kind: "length",
    section: "Plate",
    default: String(cfg.thickness[2]),
    min: cfg.thickness[0],
    max: cfg.thickness[1],
  });

  if (cfg.hole !== "none") {
    fields.push({
      key: "hole",
      label: cfg.hole === "corners" ? "Fixing holes" : "Hang hole",
      kind: "length",
      section: "Fixings",
      default: String(cfg.holeDia![2]),
      min: cfg.holeDia![0],
      max: cfg.holeDia![1],
    });
  }

  return defineDesign({
    id: cfg.id,
    name: cfg.name,
    family: "text",
    eyebrow: cfg.eyebrow,
    blurb: cfg.blurb,
    lede: cfg.lede,
    use: cfg.use,
    notesTitle: cfg.notesTitle,
    chips: [
      { label: "Fonts", value: `${cfg.fonts.length} faces` },
      { label: "Text", value: "Up to 16 characters" },
      { label: "Letters", value: `${cfg.letter[0]} – ${cfg.letter[1]} mm` },
    ],
    notes: cfg.notes,
    header: `${cfg.name} Designer - units: mm`,
    multiBody: true,
    capability: "shape",
    fields,
    parse: (raw) => ({
      text: (raw.values.text ?? "").trim().toUpperCase(),
      font: rawOption(raw, "font", cfg.fonts[0]),
      letterMm: rawLength(raw, "letter"),
      reliefMm: rawLength(raw, "relief"),
      thicknessMm: rawLength(raw, "thickness"),
      widthMm: cfg.width ? rawLength(raw, "width") : 0,
      heightMm: cfg.height ? rawLength(raw, "height") : 0,
      diameterMm: cfg.diameter ? rawLength(raw, "diameter") : 0,
      sizeMm: cfg.size ? rawLength(raw, "size") : 0,
      holeMm: cfg.hole === "none" ? 0 : rawLength(raw, "hole"),
    }),
    derive: (p, units) => {
      const errors: DesignIssue[] = [];
      const warnings: DesignIssue[] = [];
      const font: FontId = isFontId(p.font) ? p.font : cfg.fonts[0];
      pushRange(errors, units, "letter", "Letter height", p.letterMm, cfg.letter[0], cfg.letter[1]);
      pushRange(errors, units, "relief", "Letter relief", p.reliefMm, cfg.relief[0], cfg.relief[1]);
      pushRange(errors, units, "thickness", "Plate thickness", p.thicknessMm, cfg.thickness[0], cfg.thickness[1]);
      if (cfg.width) pushRange(errors, units, "width", "Plate width", p.widthMm, cfg.width[0], cfg.width[1]);
      if (cfg.height) pushRange(errors, units, "height", "Plate height", p.heightMm, cfg.height[0], cfg.height[1]);
      if (cfg.diameter) pushRange(errors, units, "diameter", "Plate diameter", p.diameterMm, cfg.diameter[0], cfg.diameter[1]);
      if (cfg.size) pushRange(errors, units, "size", "Plate size", p.sizeMm, cfg.size[0], cfg.size[1]);
      if (cfg.hole !== "none" && cfg.holeDia) {
        pushRange(errors, units, "hole", "Hole diameter", p.holeMm, cfg.holeDia[0], cfg.holeDia[1]);
      }
      if (errors.length > 0) return emptyResult(errors, warnings);

      /* Text itself: printable, covered by the font, and short enough to fit. */
      if (p.text.length === 0) {
        errors.push({ field: "text", level: "error", message: "Enter the text this part should carry." });
      } else if (p.text.length > 16) {
        errors.push({ field: "text", level: "error", message: "Keep the text to sixteen characters or fewer." });
      } else if (!/^[A-Z0-9 .,'&!?+-]+$/.test(p.text)) {
        errors.push({ field: "text", level: "error", message: "Use uppercase letters, digits, spaces and . , ' & ! ? + -" });
      } else {
        const missing = [...p.text].find(
          (char) => char !== " " && !FONT_FACES[font].font.data.glyphs[char],
        );
        if (missing) {
          errors.push({ field: "font", level: "error", message: `This font has no “${missing}” glyph; change the font or the text.` });
        }
      }
      if (errors.length > 0) return emptyResult(errors, warnings);

      const width = p.widthMm || p.diameterMm || p.sizeMm;
      const height = p.heightMm || p.diameterMm || p.sizeMm;
      const margin = cfg.hole === "corners" ? 12 : 8;
      const available = cfg.shape === "round" ? p.diameterMm * 0.72 : width - margin * 2;
      const rendered = textWidthMm(p.text, font, p.letterMm);

      if (rendered > available) {
        errors.push({
          field: "letter",
          level: "error",
          message: `The text is ${U(rendered, units)} wide but only ${U(Math.max(0, available), units)} fits; reduce the letter height or shorten the text.`,
        });
      }
      const heightLimit = cfg.shape === "square" ? p.sizeMm * 0.7 : height - 12;
      if (p.letterMm > heightLimit) {
        errors.push({ field: "letter", level: "error", message: "The letters are taller than the plate can carry." });
      }
      if (cfg.hole !== "none" && p.holeMm >= Math.min(width, height) / 3) {
        errors.push({ field: "hole", level: "error", message: "The hole is too large for this plate." });
      }
      if (p.reliefMm > p.thicknessMm) {
        warnings.push({ field: "relief", level: "warning", message: "Letters taller than the plate are easy to snap off." });
      }
      if (p.text.length > 12) {
        warnings.push({ field: "text", level: "warning", message: "Long text on a small plate leaves very thin strokes." });
      }

      return {
        errors,
        warnings,
        readout: [
          { label: "Text", value: p.text, source: "input" },
          { label: "Font", value: FONT_FACES[font].label, source: "input" },
          { label: "Letter height", value: U(p.letterMm, units), source: "input" },
          { label: "Text width", value: U(rendered, units), source: "calc" },
          { label: cfg.shape === "round" ? "Plate Ø" : "Plate", value: cfg.shape === "round" ? U(p.diameterMm, units) : `${U(width, units)} × ${U(height, units)}`, source: "input" },
          { label: "Relief", value: U(p.reliefMm, units), source: "input" },
          ...(cfg.mirror
            ? [{ label: "Lettering", value: "Mirrored for stamping", source: "calc" as const }]
            : []),
        ],
        preview: previewOf(
          `“${p.text}” · ${U(p.letterMm, units)} letters${cfg.mirror ? " · mirrored" : ""}`,
          `${cfg.id
            .split("-")
            .map((part) => part[0])
            .join("")
            .slice(0, 4)
            .toUpperCase()}${R(width, 0)}`,
          Math.max(width, 1),
          Math.max(height, 1),
          [
            { label: "Text", value: p.text },
            { label: "Font", value: FONT_FACES[font].label },
            { label: "Letters", value: U(p.letterMm, units) },
          ],
        ),
      };
    },
    build: (p) => {
      const font: FontId = isFontId(p.font) ? p.font : cfg.fonts[0];
      const dims = {
        width: p.widthMm,
        height: p.heightMm,
        diameter: p.diameterMm,
        size: p.sizeMm,
      };
      const plate = plateFor(cfg, dims, p.holeMm, p.thicknessMm);
      const text = buildTextMesh({
        text: p.text,
        fontId: font,
        sizeMm: p.letterMm,
        depthMm: p.reliefMm + 0.4,
        mirror: cfg.mirror,
      });
      const seated = translateMesh(
        text,
        0,
        textOffsetY(cfg, p.letterMm),
        p.thicknessMm / 2 - 0.4,
      );
      return mergeMeshes([plate, seated]);
    },
    fileName: (p) => `${cfg.id}-${textSlug(p.text)}.stl`,
  });
}

/* ------------------------------------------------------------ the products */

const CONFIGS: TextProductConfig[] = [
  {
    id: "name-keychain", name: "Name keychain", eyebrow: "Bag tag", shape: "tag", hole: "top",
    text: "ALEX", fonts: ["sans", "sans-bold", "serif"],
    width: [50, 110, 70], height: [22, 40, 28], letter: [8, 20, 14],
    thickness: [2, 5, 3], relief: [1, 4, 2], holeDia: [3, 8, 4],
    blurb: "A rounded tag with a raised name and a ring hole for a split ring.",
    lede: "A keychain tag whose name stands proud of the plate in the font you pick, with a ring hole at the top. The plate is thick enough to survive a pocket and the lettering is seated into it so the two read as one piece.",
    use: "Labelling a set of keys, a bag zip or a school backpack with a name.",
    notesTitle: "How the name sits on the tag",
    notes: [
      "The letters are extruded from the chosen typeface and embedded 0.4 mm into the plate, so the raised text overlaps the plate even though the mesh is several closed bodies. The ring hole is placed from the top edge, not the centre.",
      "Machine the plate flat and fit the actual split ring before finishing the edges. A hole that is too close to the rim will tear out under a keyring's constant pull.",
    ],
  },
  {
    id: "door-sign", name: "Door sign", eyebrow: "Room plate", shape: "rect", hole: "corners",
    text: "STUDIO", fonts: ["sans", "serif", "sans-bold"],
    width: [80, 200, 140], height: [30, 70, 45], letter: [12, 30, 20],
    thickness: [2, 6, 3], relief: [1, 5, 2], holeDia: [4, 10, 5],
    blurb: "A screw-fixed plate that names a room in raised lettering.",
    lede: "A door plate with the room name standing proud in a typeface you choose, and a fixing hole in each top corner. The wide plate keeps the lettering clear of the screws, and the corners are rounded so nothing catches on a sleeve.",
    use: "Naming a studio, office, workshop or treatment room on a closed door.",
    notesTitle: "How the plate clears the screws",
    notes: [
      "Both fixing holes sit in the top corners, outside the lettering area, so a screw head cannot land on a letter. The text is centred slightly low to keep the cap height away from the corner holes.",
      "Drill the door from the plate itself and fit a screw head that sits flush. A plate tightened on one side only will bow and lift the far corner off the door.",
    ],
  },
  {
    id: "desk-nameplate", name: "Desk nameplate", eyebrow: "Desk plate", shape: "rect", hole: "none",
    text: "MAYA", fonts: ["serif", "sans", "sans-bold"],
    width: [100, 220, 160], height: [30, 60, 40], letter: [10, 26, 16],
    thickness: [3, 8, 4], relief: [1, 5, 2],
    blurb: "A free-standing plate that carries a name across a desk.",
    lede: "A desk nameplate with a broad flat face and raised lettering, sized to sit on a desk or a reception counter. With no fixing holes, the plate can be swapped end for end or set into a simple slot stand.",
    use: "Putting a name on a desk, a reception counter or a meeting table.",
    notesTitle: "How the name is laid out",
    notes: [
      "The text is centred on the plate with equal margins, and the letter height is checked against the plate height so a tall font cannot run off the edge. The plate has no holes, so either face can be the front.",
      "Finish the back flat so the plate sits without rocking, and keep the lettering away from a slot stand's grip. A nameplate that leans is harder to read than one that is simply smaller.",
    ],
  },
  {
    id: "house-number", name: "House number", eyebrow: "Number plate", shape: "rect", hole: "corners",
    text: "42", fonts: ["sans-bold", "sans", "serif"],
    width: [60, 160, 100], height: [40, 80, 60], letter: [20, 60, 38],
    thickness: [2, 6, 3], relief: [1, 5, 3], holeDia: [4, 10, 5],
    blurb: "A bold number plate with two corner holes for a wall fixing.",
    lede: "A house number cut as a wide plate with two corner fixings and large raised digits. The digit height is a live field, so the same design covers a small door number or a plate read from the road.",
    use: "Marking a house, a gate or a workshop bay with a number readable from a distance.",
    notesTitle: "How the digits scale",
    notes: [
      "The digits are centred and sized from the letter height, with the plate width checked against the rendered width of the actual digits. A two-digit number on a narrow plate is rejected rather than allowed to overhang.",
      "Fit the plate with the screws just snug; over-tightening a thin plate bows it and throws the digits out of line. Use stainless fixings outdoors so rust stains do not run down the wall.",
    ],
  },
  {
    id: "cake-topper", name: "Cake topper", eyebrow: "Cake sign", shape: "rect", hole: "none",
    text: "HAPPY", fonts: ["sans-bold", "serif", "sans"],
    width: [60, 160, 140], height: [40, 100, 70], letter: [15, 40, 25],
    thickness: [2, 4, 2.5], relief: [1, 4, 2],
    blurb: "A thin lettered plaque that stands on a cake through a hidden spike.",
    lede: "A cake topper made as a thin plate with raised lettering and enough body to take a spike or two underneath. The relief is kept shallow so the top-heavy plate does not tip once it is pushed into a cake.",
    use: "Standing a name or a greeting on a birthday cake or a celebration dessert.",
    notesTitle: "How the topper stays upright",
    notes: [
      "The plate is deliberately thin and the lettering shallow, which keeps the centre of mass low enough for a pair of spikes to hold it. The text is checked against the plate width so no letter overhangs the edge.",
      "Keep bare material out of the icing, and wrap the spikes if the topper will touch the cake. This is a display part; the notes do not certify it for food contact.",
    ],
  },
  {
    id: "bookmark", name: "Bookmark", eyebrow: "Page marker", shape: "tag", hole: "top",
    text: "READ", fonts: ["serif", "sans", "mono"],
    width: [40, 80, 55], height: [100, 220, 160], letter: [8, 20, 11],
    thickness: [1.5, 4, 2], relief: [0.8, 3, 1.5], holeDia: [3, 8, 4],
    blurb: "A tall thin marker with a name and a hole for a tassel.",
    lede: "A bookmark with a tall narrow plate, raised lettering down its length and a tassel hole at the top. The plate is thin enough to leave the book closed flat, and the lettering sits inside the width of the page.",
    use: "Marking a page in a book, a manual or a notebook, with a tassel through the top.",
    notesTitle: "How the marker stays thin",
    notes: [
      "Thickness and relief are both kept low so the closed book does not splay. The tassel hole is placed below the top edge with a real land, and the text sits well clear of it.",
      "Sand or finish both faces so the marker does not mark the page, and break the long edges. A bookmark that is even slightly cupped will slide out of the book.",
    ],
  },
  {
    id: "luggage-tag", name: "Luggage tag", eyebrow: "Travel tag", shape: "tag", hole: "top",
    text: "TRIP", fonts: ["sans", "sans-bold", "mono"],
    width: [50, 110, 80], height: [30, 70, 45], letter: [8, 20, 14],
    thickness: [2, 5, 3], relief: [1, 4, 2], holeDia: [3, 8, 4],
    blurb: "A sturdy travel tag with a name and a reinforced ring hole.",
    lede: "A luggage tag with a thick plate, a strap hole at the top and a name in raised lettering. The plate is sized to stay readable on a handle and thick enough that the hole does not elongate on a flight.",
    use: "Identifying a suitcase, a camera bag or a tool case on a trip.",
    notesTitle: "How the strap hole is reinforced",
    notes: [
      "The ring hole is placed with a full land of material above it, and the plate is thicker than a plain name tag so the hole has depth to wear through. The lettering stops short of the hole.",
      "Fit a plastic or leather strap rather than a metal ring if the tag will be thrown around, and check the hole against the strap width. A tag with a slack strap turns face down in a baggage hold.",
    ],
  },
  {
    id: "pet-collar-tag", name: "Pet collar tag", eyebrow: "Collar disc", shape: "round", hole: "top",
    text: "BUDDY", fonts: ["sans-bold", "sans", "serif"],
    diameter: [30, 70, 55], letter: [6, 18, 8],
    thickness: [1.5, 4, 2], relief: [0.8, 3, 1.5], holeDia: [3, 8, 4],
    blurb: "A round disc with a pet's name and a ring hole at the top.",
    lede: "A collar tag cut as a circle with raised lettering and a single ring hole. The disc is small and light so it does not swing against a collar, and the lettering is sized to stay legible at a glance.",
    use: "Putting a pet's name on a collar tag that hangs from a split ring.",
    notesTitle: "How the name fits a small disc",
    notes: [
      "The usable text width is a fraction of the disc diameter, and the design rejects a name that would run past the rim. The hole sits above the text with a land that keeps the ring from pulling through.",
      "Finish the edges round and check the split ring closes fully; a tag that catches on a collar can be lost in a hedge. Keep the lettering shallow so it does not snag.",
    ],
  },
  {
    id: "herb-label", name: "Herb label", eyebrow: "Herb marker", shape: "rect", hole: "none",
    text: "BASIL", fonts: ["sans", "sans-bold", "mono"],
    width: [30, 60, 45], height: [80, 170, 110], letter: [5, 14, 7],
    thickness: [1.5, 4, 2], relief: [0.8, 3, 1.2],
    blurb: "A tall marker that carries a plant name above the soil line.",
    lede: "A plant label with a narrow upright plate and raised lettering near the top, made to push into a pot or a bed. The lower part of the plate stays plain so it can be buried without losing the name.",
    use: "Labelling herbs, seedlings or rows in a pot, a raised bed or a garden.",
    notesTitle: "How the name stays above the soil",
    notes: [
      "The text is laid out on the upper part of the plate and the design warns when a tall letter leaves too little plain stem to bury. The plate is thin so it slips between roots rather than levering them.",
      "Push the label in with a blunt dibber, not by leaning on the lettering, and leave enough stem in the soil to stop it blowing over. Ink or paint the letters if the material fades in sunlight.",
    ],
  },
  {
    id: "gift-tag", name: "Gift tag", eyebrow: "Present tag", shape: "tag", hole: "top",
    text: "FOR YOU", fonts: ["serif", "sans", "sans-bold"],
    width: [45, 110, 75], height: [25, 60, 35], letter: [7, 18, 9],
    thickness: [1.5, 4, 2.5], relief: [0.8, 3, 1.5], holeDia: [3, 8, 4],
    blurb: "A small tied tag with a greeting in raised letters.",
    lede: "A gift tag with a short message in relief and a hole for a ribbon at one end. The plate is compact, with a rounded outline that will not crease the paper it is tied against.",
    use: "Tying a name or a short greeting onto a wrapped present or a gift bag.",
    notesTitle: "How the tag hangs from a ribbon",
    notes: [
      "The ribbon hole is offset towards the top edge and kept clear of the text, so the tag hangs square instead of tilting. The text width is measured in the chosen font before the tag is built.",
      "Thread a ribbon that fills the hole rather than a thin thread, and tie off with a flat knot. A tag that hangs on one corner will turn its face away from the recipient.",
    ],
  },
  {
    id: "table-number", name: "Table number", eyebrow: "Event disc", shape: "round", hole: "none",
    text: "7", fonts: ["sans-bold", "serif", "sans"],
    diameter: [50, 120, 80], letter: [20, 60, 40],
    thickness: [2, 6, 3], relief: [1, 5, 3],
    blurb: "A round table marker with one large raised numeral.",
    lede: "A round table number with a single large numeral in relief, sized to be read across a room. The disc sits flat on a table and can be turned to any angle without looking wrong.",
    use: "Numbering tables at a wedding, a conference or a pop-up dining room.",
    notesTitle: "How the numeral is centred",
    notes: [
      "The numeral is centred on the disc and its height is limited to a fraction of the diameter, so a two-digit number still clears the rim. The disc has no hole, which keeps the face clean from any angle.",
      "Finish the underside flat and add a felt pad if the table is polished. A numeral that is only raised slightly is easier to dust than a deep relief.",
    ],
  },
  {
    id: "seat-card", name: "Seat card", eyebrow: "Place card", shape: "rect", hole: "none",
    text: "GUEST", fonts: ["serif", "sans", "sans-bold"],
    width: [60, 140, 90], height: [40, 90, 60], letter: [10, 30, 16],
    thickness: [2, 6, 3], relief: [1, 4, 2],
    blurb: "A flat place card with a guest's name standing in relief.",
    lede: "A seat card made as a rigid plate with raised lettering, for a table setting that should not flop over. The plate is wide enough for a full name and can be propped in a simple holder or stand.",
    use: "Marking a seat at a wedding, a dinner or a workshop with a guest's name.",
    notesTitle: "How the name reads across a table",
    notes: [
      "The letter height is set against the plate height, and the rendered width is checked against the plate so a long surname does not run to the edge. The plate has no holes to break up the face.",
      "Fit the card at a slight angle rather than flat, and keep the lettering on the upper half. A card that lies flat is readable only to the person already seated.",
    ],
  },
  {
    id: "locker-plate", name: "Locker plate", eyebrow: "Locker label", shape: "rect", hole: "corners",
    text: "LOCK 12", fonts: ["sans-bold", "mono", "sans"],
    width: [60, 160, 100], height: [25, 60, 40], letter: [8, 24, 12],
    thickness: [2, 5, 3], relief: [1, 4, 2], holeDia: [3, 8, 4],
    blurb: "A screw-on plate that identifies a locker or a bay.",
    lede: "A locker plate with a short identifier in raised letters and a screw hole in each top corner. The plate is wide and shallow, so it fits the flat face above a locker door without overlapping the latch.",
    use: "Numbering lockers, bays, cages or staff cubbies in a changing room.",
    notesTitle: "How the label fits a locker face",
    notes: [
      "The two fixing holes sit above the lettering line, leaving the whole width free for the identifier. The rounded corners keep the plate from catching on a bag pulled out of the next locker.",
      "Fit security screws if the plate is in a public changing room, and check the plate clears the door swing. A label that stands proud of the latch will be knocked off.",
    ],
  },
  {
    id: "tool-label", name: "Tool label", eyebrow: "Tool tag", shape: "rect", hole: "corners",
    text: "10MM", fonts: ["sans-bold", "mono", "sans"],
    width: [40, 100, 60], height: [20, 50, 30], letter: [6, 16, 8],
    thickness: [1.5, 4, 2], relief: [0.8, 3, 1.2], holeDia: [3, 6, 4],
    blurb: "A small punched plate that marks a tool or a drawer.",
    lede: "A tool label with a compact plate, two fixing holes and lettering sized for a drawer front or a tool board. The short identifier is centred and checked against the plate width in the chosen font.",
    use: "Marking a spanner size, a bit type or a tool drawer on a shadow board.",
    notesTitle: "How the identifier stays readable",
    notes: [
      "The text width is measured from the font's own advances before the plate is built, so a long identifier is rejected rather than clipped. The corner holes leave the centre free for the letters.",
      "Fix the label with small screws rather than adhesive if the tool board is in a workshop, and counterbore the heads if they sit proud. Keep the lettering shallow so a tool can slide past.",
    ],
  },
  {
    id: "cable-label", name: "Cable label", eyebrow: "Cable tag", shape: "rect", hole: "corners",
    text: "LAN", fonts: ["mono", "sans-bold", "sans"],
    width: [30, 80, 50], height: [12, 30, 18], letter: [4, 10, 6],
    thickness: [1, 3, 1.5], relief: [0.6, 2, 1], holeDia: [2, 5, 3],
    blurb: "A tiny tie-on plate that names a cable at each end.",
    lede: "A cable label made as a small plate with two fixing holes for a tie or a screw. The lettering is compact and the plate is thin, so it can be fixed to a cable tray or a rack without fouling neighbouring cables.",
    use: "Naming network, audio or power cables at a rack or a patch panel.",
    notesTitle: "How the label attaches",
    notes: [
      "The two holes are sized for a small tie or a screw, and the text is kept short so it stays legible at this scale. The plate is thin enough to bend slightly around a bundle without cracking.",
      "Mark the identifier before fitting, and leave a little slack in the tie so the label can be read. A label tied tight to a warm cable can distort over time.",
    ],
  },
  {
    id: "bin-label", name: "Bin label", eyebrow: "Storage label", shape: "rect", hole: "corners",
    text: "RECYCLE", fonts: ["sans-bold", "sans", "mono"],
    width: [70, 170, 120], height: [30, 70, 45], letter: [10, 28, 14],
    thickness: [2, 5, 3], relief: [1, 4, 2], holeDia: [4, 10, 5],
    blurb: "A bold plate that names the contents of a storage bin.",
    lede: "A bin label with large raised lettering and two corner fixings, made to be read from standing height. The plate is wide enough for a full word and the lettering is checked against that width in the chosen font.",
    use: "Labelling recycling, parts or storage bins in a workshop or a stockroom.",
    notesTitle: "How the word fills the plate",
    notes: [
      "The identifier is centred, and the design checks the rendered width against the plate before allowing the build. Corner holes are kept outside the text band so a screw cannot split a letter.",
      "Fit the label where the bin is read, not where it is stacked, and leave the top edge clear if bins slide under a shelf. Large lettering is worth more than a decorative font here.",
    ],
  },
  {
    id: "drawer-label", name: "Drawer label", eyebrow: "Drawer plate", shape: "rect", hole: "none",
    text: "SOCKS", fonts: ["sans", "serif", "sans-bold"],
    width: [40, 100, 65], height: [18, 40, 25], letter: [6, 16, 10],
    thickness: [1.5, 4, 2], relief: [0.8, 3, 1.2],
    blurb: "A plain plate that names what a drawer holds.",
    lede: "A drawer label with a single word in relief and no fixing holes, intended to be set into a recess or fixed with adhesive. The plate is shallow so it does not catch on clothes or nearby drawers.",
    use: "Marking the contents of a drawer in a dresser, a kitchen or a parts cabinet.",
    notesTitle: "How the word is centred",
    notes: [
      "The word is centred with equal margins and the letter height is limited by the plate height, so a short drawer front still gets a balanced label. No holes means the whole face is available for text.",
      "Fit the plate into a shallow recess if the drawer is handled roughly, or use a removable adhesive so the label can move when the contents do. Keep the relief low so it does not rub.",
    ],
  },
  {
    id: "mailbox-plate", name: "Mailbox plate", eyebrow: "Post plate", shape: "rect", hole: "corners",
    text: "NO 8", fonts: ["sans-bold", "serif", "sans"],
    width: [70, 160, 110], height: [30, 70, 40], letter: [8, 24, 16],
    thickness: [2, 6, 3], relief: [1, 5, 3], holeDia: [4, 10, 5],
    blurb: "An outdoor plate that puts a house number on a mailbox.",
    lede: "A mailbox plate with a short address line in raised lettering and two corner fixings. The plate is proportioned for the flat face of a mailbox, and the lettering is sized to be read from the path.",
    use: "Marking a mailbox, a gate post or a door with a street number.",
    notesTitle: "How the plate handles weather",
    notes: [
      "The fixings sit in the corners with a solid land around them, so a wet screw does not split the plate. Lettering is kept clear of the holes and the outline is rounded to shed water.",
      "Use stainless screws and a material that tolerates sunlight if the plate is outdoors, and seal the screw heads. A plate that traps water against a steel mailbox will stain it.",
    ],
  },
  {
    id: "trophy-plate", name: "Trophy plate", eyebrow: "Award tag", shape: "rect", hole: "corners",
    text: "1ST", fonts: ["serif", "sans-bold", "sans"],
    width: [40, 100, 65], height: [30, 70, 45], letter: [12, 34, 18],
    thickness: [1.5, 4, 2], relief: [1, 4, 2], holeDia: [3, 8, 4],
    blurb: "A small engraved-style plate for a trophy or a medal base.",
    lede: "A trophy plate with a short result or name in relief and two fixing holes for a base or a shield. The plate is compact and the lettering is limited so even a short word leaves a solid border.",
    use: "Marking a place, a class or a winner on a trophy, a medal or a shield.",
    notesTitle: "How the plate reads at a distance",
    notes: [
      "The letters are large relative to the plate, and the design caps the height so the text cannot touch the edges. Corner holes are placed outside the letter band, keeping the result unobstructed.",
      "Polish the plate before fitting and use small countersunk screws so the heads disappear. A trophy plate that is proud of its base catches on ribbons and dust.",
    ],
  },
  {
    id: "award-plaque", name: "Award plaque", eyebrow: "Plaque", shape: "rect", hole: "corners",
    text: "BEST", fonts: ["serif", "sans", "sans-bold"],
    width: [80, 200, 140], height: [50, 120, 80], letter: [12, 34, 22],
    thickness: [3, 8, 5], relief: [1, 6, 3], holeDia: [4, 10, 5],
    blurb: "A larger wall plaque with a short award line in relief.",
    lede: "An award plaque with a thick plate, a generous border and raised lettering for a short citation or title. The extra thickness gives the plate presence on a wall and lets the lettering stand well proud of the face.",
    use: "Presenting a team award, a competition result or a retirement keepsake.",
    notesTitle: "How the border is kept even",
    notes: [
      "The text is centred in both directions and the design checks the rendered width, so the border stays even on all four sides. Thick plates hide the fixing holes better than thin ones.",
      "Fit a French cleat or two keyhole slots if the plaque is heavy, and check the wall fixing for the loaded weight. A plaque hung on one screw will twist out of level.",
    ],
  },
  {
    id: "coaster-text", name: "Coaster text", eyebrow: "Drink coaster", shape: "round", hole: "none",
    text: "CHEERS", fonts: ["serif", "sans", "sans-bold"],
    diameter: [60, 120, 90], letter: [10, 30, 13],
    thickness: [3, 8, 5], relief: [1, 4, 2],
    blurb: "A round coaster with a word in relief and a raised rim.",
    lede: "A coaster disc with a short word standing proud in the centre, thick enough to lift a glass off the table. The lettering is kept inside the rim area so condensation runs around it rather than into the letters.",
    use: "Protecting a table from a cold drink while putting a word or a name on the coaster.",
    notesTitle: "How the word clears the rim",
    notes: [
      "The usable width is a fraction of the disc, and the text is centred with a margin that keeps it away from the rim. The plate is thick, so it can take a shallow relief without becoming fragile.",
      "Finish the top face with a sealant if the coaster will see condensation, and add a cork or felt pad underneath. A coaster that rocks spills the ring it was meant to catch.",
    ],
  },
  {
    id: "wine-tag", name: "Wine tag", eyebrow: "Bottle tag", shape: "tag", hole: "top",
    text: "RED", fonts: ["serif", "sans", "mono"],
    width: [40, 80, 55], height: [25, 55, 35], letter: [6, 16, 11],
    thickness: [1.5, 4, 2], relief: [0.8, 3, 1.2], holeDia: [3, 6, 4],
    blurb: "A small tag that hangs from a bottle neck with a wine note.",
    lede: "A bottle tag with a ring hole at the top and a short word or name in relief. The plate is light so it hangs against the bottle without pulling the neck ring down, and the hole suits a string or a small ring.",
    use: "Tagging a bottle of wine, oil or syrup with a variety or a name.",
    notesTitle: "How the tag hangs on a bottle",
    notes: [
      "The hole is placed near the top with a land that survives a taut string, and the lettering stays below it. The plate is thin enough to hang flat against a curved bottle.",
      "Fit a soft string rather than wire so the tag does not scratch the label, and tie it loosely around the neck. A heavy tag will swing and chip the bottle when it is set down.",
    ],
  },
  {
    id: "menu-board", name: "Menu board", eyebrow: "Menu plate", shape: "rect", hole: "corners",
    text: "MENU", fonts: ["serif", "sans-bold", "sans"],
    width: [100, 220, 160], height: [60, 140, 90], letter: [12, 34, 22],
    thickness: [2, 6, 4], relief: [1, 5, 3], holeDia: [4, 10, 6],
    blurb: "A wall board that titles a menu or a price list.",
    lede: "A menu board with a large centred title in relief and two corner fixings. The plate is sized for a wall or an easel, and the lettering is checked against the width so a long title still leaves a border.",
    use: "Titling a menu, a price list or a daily specials board in a cafe.",
    notesTitle: "How the title is balanced",
    notes: [
      "The title is centred and the design measures the actual font advances, so the margins stay equal. Fixing holes sit outside the title band, which keeps the lettering intact.",
      "Fit the board at reading height and keep the lettering on the upper half if a chalk area sits below. A dark plate with light lettering reads better across a room.",
    ],
  },
  {
    id: "parking-sign", name: "Parking sign", eyebrow: "Bay sign", shape: "rect", hole: "corners",
    text: "P", fonts: ["sans-bold", "sans", "serif"],
    width: [60, 140, 100], height: [60, 140, 100], letter: [30, 80, 55],
    thickness: [2, 6, 3], relief: [1, 5, 3], holeDia: [4, 10, 6],
    blurb: "A square sign with a single large letter for a parking bay.",
    lede: "A square parking sign with one bold letter in deep relief and four corner holes. The single character can be very large, which makes the sign readable from a car while still leaving a margin to the edge.",
    use: "Marking a reserved parking bay, a loading zone or a numbered space.",
    notesTitle: "How the letter fills the square",
    notes: [
      "The letter height is capped against the plate size, and the rendered width of the character is checked before the build. Corner fixings sit outside the letter's footprint.",
      "Fit tamper-resistant fixings outdoors and mount the sign square to the post. A single letter that is slightly off-centre is much more noticeable than small text would be.",
    ],
  },
  {
    id: "gate-sign", name: "Gate sign", eyebrow: "Gate plate", shape: "rect", hole: "corners",
    text: "PRIVATE", fonts: ["sans-bold", "serif", "sans"],
    width: [100, 240, 170], height: [40, 100, 60], letter: [12, 34, 22],
    thickness: [2, 6, 3], relief: [1, 5, 3], holeDia: [4, 10, 6],
    blurb: "A long outdoor plate that carries a short warning word.",
    lede: "A gate sign with a single word in relief across a long plate and a fixing hole in each top corner. The proportions suit a gate rail or a fence panel, and the lettering clears the fixings on both sides.",
    use: "Marking a private gate, a farm track or a restricted access point.",
    notesTitle: "How the word spans the gate",
    notes: [
      "The word is centred along the plate and its rendered width is checked against the available span, so it cannot run into the corner holes. The rounded corners reduce snagging on clothing and animals.",
      "Fix the plate with the screws in line and check the gate still closes without the plate fouling the post. Outdoors, use a material that does not splinter when it weathers.",
    ],
  },
  {
    id: "room-sign", name: "Room sign", eyebrow: "Room plate", shape: "rect", hole: "corners",
    text: "ROOM 3", fonts: ["sans", "sans-bold", "serif"],
    width: [70, 170, 110], height: [30, 70, 45], letter: [10, 28, 16],
    thickness: [2, 5, 3], relief: [1, 4, 2], holeDia: [4, 10, 5],
    blurb: "A compact plate that names a room or a treatment space.",
    lede: "A room sign with a short identifier in relief and two top-corner fixings. The plate is sized for a door frame or a wall beside a door, with enough border to read as a sign rather than a label.",
    use: "Naming a meeting room, a treatment room or a guest bedroom.",
    notesTitle: "How the identifier is placed",
    notes: [
      "The identifier is centred below the fixing line, and the text width is measured in the chosen font. A room number with a space is handled as one string, so the gap is preserved.",
      "Fit the sign at eye level beside the door rather than on it, and check the plate clears the frame. A sign that sits proud of the architrave catches on coats.",
    ],
  },
  {
    id: "letter-tile", name: "Letter tile", eyebrow: "Letter block", shape: "square", hole: "none",
    text: "A", fonts: ["sans-bold", "serif", "sans"],
    size: [30, 70, 45], letter: [18, 48, 26],
    thickness: [2, 6, 4], relief: [1, 5, 3],
    blurb: "A square tile with one large raised letter for a display.",
    lede: "A square letter tile with a single character in high relief, made for spelling out names or messages on a shelf. The square footprint keeps the tiles aligned when they are set side by side.",
    use: "Spelling a name or a short message on a shelf, a mantel or a photo wall.",
    notesTitle: "How the letter fills the tile",
    notes: [
      "The letter height is limited by the tile size and the glyph's rendered width is checked, so a wide character such as M still has a border. The tile has no holes so its edges stay clean in a row.",
      "Finish all four edges square so the tiles line up, and keep the relief consistent across a set. A tile that is slightly thicker than its neighbours breaks the row.",
    ],
  },
  {
    id: "scrabble-tile", name: "Scrabble tile", eyebrow: "Game tile", shape: "square", hole: "none",
    text: "Q", fonts: ["serif", "sans-bold", "sans"],
    size: [25, 60, 40], letter: [14, 36, 21],
    thickness: [2, 6, 4], relief: [1, 4, 2],
    blurb: "A game-style square tile with a raised letter and score space.",
    lede: "A square game tile with a large raised letter and room at the bottom for a score mark. The letter is centred high so the lower band stays flat for a painted or engraved number.",
    use: "Making a letter tile for a word game, a display or a personalised gift.",
    notesTitle: "How the tile leaves a score band",
    notes: [
      "The letter is positioned above centre and its height is limited, leaving a clear band along the bottom of the tile. The letter's real width is measured in the chosen face before the build.",
      "Paint the score after the tile is finished so the letter stays crisp, and seal the face if it will be handled. Keep the relief low so tiles stack without rocking.",
    ],
  },
  {
    id: "cookie-plate", name: "Cookie plate", eyebrow: "Biscuit press", shape: "round", hole: "none",
    text: "EAT", fonts: ["serif", "sans-bold", "sans"],
    diameter: [60, 140, 100], letter: [8, 24, 14],
    thickness: [3, 8, 4], relief: [1, 4, 2],
    blurb: "A round plate that presses or stamps a word into a bake.",
    lede: "A round press plate with a word in relief, made to be pressed into a soft dough or a sugar paste. The lettering is shallow and the plate is thick, so the word transfers without cutting through the material.",
    use: "Impressing a word or a name into cookies, pastry or sugar paste.",
    notesTitle: "How the word presses evenly",
    notes: [
      "The relief is kept shallow and the text is centred with a rim of flat plate around it, so the press bears evenly. The word width is checked against the round face before the build.",
      "Dust the plate with flour between presses and press straight down rather than rocking. This is a shaping tool, not a food-certified item; keep bare material out of the dough.",
    ],
  },
  {
    id: "stamp-plate", name: "Stamp plate", eyebrow: "Mirror stamp", shape: "rect", hole: "none",
    text: "PAID", fonts: ["sans-bold", "serif", "mono"], mirror: true,
    width: [50, 120, 80], height: [25, 60, 40], letter: [8, 24, 14],
    thickness: [2, 6, 3], relief: [1, 5, 2],
    blurb: "A mirrored plate that reads correctly when it is stamped.",
    lede: "A stamp plate whose lettering is mirrored left to right, so an impression taken from it reads the right way round. The plate is flat and stiff, with a border that keeps the stamp square to the page.",
    use: "Making a rubber-style stamp or an embossing plate for a short word.",
    notesTitle: "How the mirror is made",
    notes: [
      "The glyphs are extruded normally and then mirrored across the vertical axis before they are seated on the plate. Because the winding is corrected at the same time, the mirrored bodies stay closed.",
      "Check a test impression on scrap before the final stamp is mounted, and keep the relief even so the ink transfers uniformly. A plate that flexes will transfer one edge darker.",
    ],
  },
  {
    id: "embosser-plate", name: "Embosser plate", eyebrow: "Seal plate", shape: "rect", hole: "none",
    text: "SEAL", fonts: ["serif", "sans-bold", "sans"], mirror: true,
    width: [40, 100, 65], height: [20, 50, 32], letter: [6, 18, 11],
    thickness: [2, 6, 3], relief: [1, 4, 2],
    blurb: "A small mirrored plate for an embosser or a book press.",
    lede: "An embosser plate with mirrored lettering and a compact border, sized for a hand press or a book stamp. The relief is uniform so the impression depth does not vary across the word.",
    use: "Marking paper, card or leather with a short name or a seal word.",
    notesTitle: "How the seal reads through paper",
    notes: [
      "The mirrored text is checked for width in the chosen font and kept inside a border that supports the paper around the impression. The plate is thick enough not to flex under a press.",
      "Fit the plate in the press and test the impression on the same paper weight as the final piece, and adjust the press rather than the plate. Too much pressure embrittles the paper and tears at the letters.",
    ],
  },
  {
    id: "bookmark-clip", name: "Bookmark clip", eyebrow: "Page clip", shape: "tag", hole: "top",
    text: "PAGE", fonts: ["sans", "mono", "serif"],
    width: [30, 60, 40], height: [70, 160, 110], letter: [5, 14, 6],
    thickness: [1.5, 4, 2], relief: [0.8, 3, 1.2], holeDia: [2, 5, 3],
    blurb: "A narrow clip-on marker with a name and a small lanyard hole.",
    lede: "A slim bookmark clip with a narrow plate and a small hole at the top for a cord or a clip. The lettering runs down the strip so the marker can be read while the book is closed.",
    use: "Marking a page in a technical manual or a notebook with a clip or cord.",
    notesTitle: "How the strip stays slim",
    notes: [
      "The plate is kept narrow and the letter height is capped against that width, so the strip does not become a paddle. The top hole is sized for a thin cord rather than a keyring.",
      "Finish the long edges round so the strip slides between pages without tearing, and keep the relief shallow. A clip that is too thick dents the page block.",
    ],
  },
  {
    id: "key-rack", name: "Key rack", eyebrow: "Key board", shape: "rect", hole: "corners",
    text: "KEYS", fonts: ["serif", "sans", "sans-bold"],
    width: [80, 200, 120], height: [30, 70, 40], letter: [8, 22, 14],
    thickness: [3, 8, 5], relief: [1, 5, 2], holeDia: [3, 8, 4],
    blurb: "A wall plate that titles a key rack or a hook board.",
    lede: "A key rack plate with a title in relief and a screw hole in each top corner. The plate is thick enough to carry the title above a row of hooks without bowing, and the lettering stays clear of the fixings.",
    use: "Titling a key board by the door, in an office or in a workshop.",
    notesTitle: "How the title sits above the hooks",
    notes: [
      "The title band is kept on the upper half of the plate, leaving the lower edge free for the hook row or a mounting rail. Corner holes sit outside the lettering.",
      "Fit the plate into a stud or a plug, not just plasterboard, because a loaded key rack pulls outward. Check the hooks clear the bottom of the plate before drilling.",
    ],
  },
  {
    id: "leash-tag", name: "Leash tag", eyebrow: "Lead tag", shape: "tag", hole: "top",
    text: "REX", fonts: ["sans-bold", "sans", "mono"],
    width: [45, 100, 70], height: [25, 60, 38], letter: [7, 18, 12],
    thickness: [2, 5, 3], relief: [1, 4, 2], holeDia: [4, 10, 5],
    blurb: "A robust tag for a leash or a harness with a wide ring hole.",
    lede: "A leash tag with a thicker plate and a larger ring hole than a collar tag, made to hang from a lead clip. The lettering is short and centred so it stays readable when the tag swings.",
    use: "Marking a dog lead, a harness or a pet carrier with a name.",
    notesTitle: "How the tag takes a lead clip",
    notes: [
      "The ring hole is sized for a lead clip rather than a split ring, and the plate around it is left solid. The text band sits below the hole with a clear gap.",
      "Fit the tag to the clip, checking it opens wide enough for the plate thickness, and use a ring that will not wear through the hole. A tag on a lead takes far more shock than one on a collar.",
    ],
  },
  {
    id: "bike-tag", name: "Bike tag", eyebrow: "Cycle tag", shape: "tag", hole: "top",
    text: "BIKE", fonts: ["sans", "sans-bold", "mono"],
    width: [40, 90, 60], height: [20, 50, 32], letter: [6, 16, 10],
    thickness: [1.5, 4, 2.5], relief: [0.8, 3, 1.2], holeDia: [3, 8, 4],
    blurb: "A small tag that identifies a bike or a piece of riding kit.",
    lede: "A bike tag with a short label in relief and a ring hole for a cable tie or a small ring. The plate is compact and light so it does not rattle against a frame or a bag.",
    use: "Tagging a bike, a helmet bag or a piece of riding equipment.",
    notesTitle: "How the tag attaches to a frame",
    notes: [
      "The hole takes a small cable tie or a ring, and the plate is kept narrow so it can sit against a tube. The text is measured in the chosen font so it stays inside the outline.",
      "Use a soft tie or a rubber-backed ring so the finish on the frame is not rubbed, and keep the tag from hanging where it can catch a spoke. A loose tag is worse than none.",
    ],
  },
  {
    id: "school-name-tag", name: "School name tag", eyebrow: "Name badge", shape: "rect", hole: "corners",
    text: "SAM", fonts: ["sans", "sans-bold", "serif"],
    width: [60, 140, 90], height: [20, 45, 28], letter: [6, 16, 11],
    thickness: [1.5, 4, 2], relief: [0.8, 3, 1.2], holeDia: [3, 6, 4],
    blurb: "A pin-on or sew-on badge with a child's name in relief.",
    lede: "A school name tag with a wide plate, a name in relief and two small holes for a pin or a stitch. The plate is thin and light so it sits flat on a uniform without pulling the fabric.",
    use: "Naming a school uniform, a gym kit or a nursery bag.",
    notesTitle: "How the badge sits on fabric",
    notes: [
      "The two holes are small and placed in the top corners, so a pin or a few stitches hold the badge without crossing the name. The lettering is kept clear of both holes.",
      "Sew through the holes rather than relying on a pin for a child's uniform, and round the corners so the badge does not fray the fabric. Keep the relief low so it does not press into the wearer.",
    ],
  },
  {
    id: "uniform-label", name: "Uniform label", eyebrow: "Kit label", shape: "rect", hole: "none",
    text: "KIT", fonts: ["mono", "sans", "sans-bold"],
    width: [40, 100, 60], height: [15, 35, 22], letter: [4, 12, 7],
    thickness: [1, 3, 1.5], relief: [0.6, 2, 1],
    blurb: "A tiny flat label for kit, cases and personal equipment.",
    lede: "A uniform label with a short identifier in low relief and no holes, made to be stitched into a garment or set into a case. The plate is thin enough to sew through or trap under a strap.",
    use: "Marking sports kit, instrument cases or personal equipment with initials.",
    notesTitle: "How the label is attached",
    notes: [
      "With no fixing holes, the plate relies on stitching around its edge or a pocket, so the corners are rounded to avoid cutting thread. The lettering is kept small and centred.",
      "Stitch around the outline rather than through the lettering, and choose a material that survives repeated washing. A label that is too thick will show through the garment.",
    ],
  },
  {
    id: "jar-label", name: "Jar label", eyebrow: "Preserve label", shape: "round", hole: "none",
    text: "JAM", fonts: ["serif", "sans", "mono"],
    diameter: [50, 120, 85], letter: [8, 24, 14],
    thickness: [2, 6, 3], relief: [1, 4, 2],
    blurb: "A round lid label that names a preserve or a batch.",
    lede: "A jar label cut as a disc with a short word in relief, sized for a jam jar lid or a storage jar front. The flat face takes paint or ink well, and the raised word stays legible under a shelf light.",
    use: "Labelling jam, pickles, spices or a batch of preserves on a jar.",
    notesTitle: "How the disc sits on a lid",
    notes: [
      "The word is centred within a fraction of the diameter and the disc has no holes, so it can be glued flat to a lid. The lettering is shallow enough that a stacked jar does not catch on it.",
      "Fit a label adhesive that releases cleanly if the jar will be reused, and write the date around the rim. A label that traps moisture under it will lift at the edge.",
    ],
  },
  {
    id: "spice-label", name: "Spice label", eyebrow: "Spice plate", shape: "rect", hole: "none",
    text: "SALT", fonts: ["sans", "serif", "mono"],
    width: [35, 70, 50], height: [20, 45, 30], letter: [5, 14, 8],
    thickness: [1, 3, 1.5], relief: [0.6, 2, 1],
    blurb: "A small flat plate that names a spice jar on a rack.",
    lede: "A spice label with a short name in relief and a compact flat plate, made to sit on a jar front or a rack rail. The low relief means jars can slide past each other without catching.",
    use: "Naming spice jars on a rack, a shelf or a pantry door.",
    notesTitle: "How the name fits a small jar",
    notes: [
      "The plate is small, so the design checks the name's rendered width against the face before building. A short word leaves a generous border at this scale.",
      "Fit the label to the jar front rather than the lid if the jars are stacked, and keep the lettering upright when the jar is in its rack. Use a washable adhesive so the label can move.",
    ],
  },
  {
    id: "tap-badge", name: "Tap badge", eyebrow: "Tap handle", shape: "round", hole: "none",
    text: "IPA", fonts: ["sans-bold", "serif", "sans"],
    diameter: [30, 80, 50], letter: [8, 22, 12],
    thickness: [2, 6, 3], relief: [1, 4, 2],
    blurb: "A round badge that names the beer on a tap handle.",
    lede: "A tap badge made as a small disc with a short beer name in relief. The disc is light enough for a tap handle face and thick enough that the lettering survives handling at a busy bar.",
    use: "Naming a beer, a cider or a kombucha on a tap handle or a font.",
    notesTitle: "How the badge reads on a tap",
    notes: [
      "The name is centred and its height is capped against the disc so three letters still leave a rim. The flat back can be bonded to a handle face without a recess.",
      "Wipe the badge clean rather than soaking it, and fit an adhesive that tolerates condensation. A badge that stands proud of the handle catches glasses.",
    ],
  },
  {
    id: "cafe-sign", name: "Cafe sign", eyebrow: "Shop sign", shape: "rect", hole: "corners",
    text: "OPEN", fonts: ["serif", "sans-bold", "sans"],
    width: [90, 220, 150], height: [40, 100, 60], letter: [12, 34, 22],
    thickness: [2, 6, 4], relief: [1, 5, 3], holeDia: [4, 10, 6],
    blurb: "A hanging-style plate that announces a shop is open.",
    lede: "A cafe sign with a large word in relief and a fixing hole in each top corner, sized for a door or a window. The plate is wide enough that the word reads from the pavement without crowding the fixings.",
    use: "Announcing opening hours or a welcome on a cafe, a shop or a studio door.",
    notesTitle: "How the word reads from outside",
    notes: [
      "The word is centred with a generous border, and the rendered width is checked against the plate before it is built. Corner holes sit outside the letter band so nothing interrupts the word.",
      "Fit the sign where it is lit, with fixings that suit glass or timber rather than one universal screw. A sign that swings in the wind needs a ring, not a single hook.",
    ],
  },
  {
    id: "restroom-sign", name: "Restroom sign", eyebrow: "WC plate", shape: "rect", hole: "corners",
    text: "WC", fonts: ["sans-bold", "sans", "serif"],
    width: [80, 170, 120], height: [40, 90, 60], letter: [14, 38, 24],
    thickness: [2, 6, 3], relief: [1, 5, 3], holeDia: [4, 10, 5],
    blurb: "A small door plate with a short washroom identifier.",
    lede: "A restroom sign with a compact identifier in relief and two top-corner fixings. The plate is deliberately plain so it can sit beside a pictogram or a room number without competing.",
    use: "Marking a washroom, a changing room or a utility room door.",
    notesTitle: "How the short text is balanced",
    notes: [
      "Two letters leave a lot of border, so the design centres them and caps the height against the plate. The corner holes are clear of the glyphs even at the maximum letter height.",
      "Fit the plate at a consistent height with the other room signs, and align the top edges. A plain sign looks wrong when it is the only one out of line.",
    ],
  },
  {
    id: "exit-sign", name: "Exit sign", eyebrow: "Way out", shape: "rect", hole: "corners",
    text: "EXIT", fonts: ["sans-bold", "sans", "mono"],
    width: [100, 240, 160], height: [40, 100, 60], letter: [16, 44, 28],
    thickness: [2, 6, 3], relief: [1, 5, 3], holeDia: [4, 10, 6],
    blurb: "A bold plate that marks a way out of a room or a yard.",
    lede: "An exit sign with a short word in high relief and a corner fixing at each end. The lettering is large relative to the plate so the sign reads at a distance, while a border keeps the word from the edge.",
    use: "Marking a doorway, a fire exit route or a yard gate for visitors.",
    notesTitle: "How the word stays legible",
    notes: [
      "The letter height is capped by the plate height and the rendered width is measured against the plate, so the word cannot touch the corners. Fixing holes are outside the text.",
      "This is a wayfinding plate, not a certified emergency sign; check local requirements if the building needs compliant signage. Fit it at a height and angle that is visible from the room.",
    ],
  },
  {
    id: "wedding-place-card", name: "Wedding place card", eyebrow: "Place name", shape: "rect", hole: "none",
    text: "EMMA", fonts: ["serif", "sans", "sans-bold"],
    width: [60, 140, 90], height: [30, 70, 45], letter: [8, 22, 14],
    thickness: [2, 5, 3], relief: [1, 4, 2],
    blurb: "A rigid place card with a guest's name in raised serif letters.",
    lede: "A wedding place card made as a solid plate with the guest's name standing proud. It replaces a folded card that falls over, and the name stays readable while the plate sits in a holder.",
    use: "Setting a named place at a wedding breakfast, a dinner or a banquet.",
    notesTitle: "How the name is centred for a holder",
    notes: [
      "The name is centred and the plate has no holes, so it can sit in a slot holder without a fixing showing. The letter height is limited by the plate height so a long name stays balanced.",
      "Choose a holder that grips the lower third, and keep the name in the upper half. A plate that is loose in its holder turns away from the guest.",
    ],
  },
  {
    id: "birthday-topper", name: "Birthday topper", eyebrow: "Party sign", shape: "rect", hole: "none",
    text: "HBD", fonts: ["sans-bold", "sans", "serif"],
    width: [50, 140, 100], height: [35, 80, 55], letter: [12, 34, 20],
    thickness: [2, 4, 2.5], relief: [1, 4, 2],
    blurb: "A small cake sign with a short birthday greeting in relief.",
    lede: "A birthday topper with a short greeting standing proud of a thin plate, made to sit on a cake or a party table. The compact plate keeps the topper stable and the lettering readable from across a table.",
    use: "Decorating a birthday cake, a party tray or a celebration table.",
    notesTitle: "How the greeting stays upright",
    notes: [
      "The plate is thin and the relief shallow so a pair of spikes can hold it without a heavy base. The text width is checked against the plate before the build.",
      "Keep the spikes out of the eating portion and keep bare material away from the icing. This is a display part, not a certified food-contact item.",
    ],
  },
  {
    id: "anniversary-plate", name: "Anniversary plate", eyebrow: "Keepsake disc", shape: "round", hole: "none",
    text: "10 YRS", fonts: ["serif", "sans", "sans-bold"],
    diameter: [70, 160, 110], letter: [10, 28, 18],
    thickness: [2, 6, 4], relief: [1, 5, 2],
    blurb: "A round keepsake plate with a short anniversary line.",
    lede: "An anniversary plate cut as a disc with a short line in relief, sized for a shelf or a display stand. The round face has no preferred orientation, so the plate can be turned to suit the light.",
    use: "Marking an anniversary, a retirement or a milestone with a keepsake disc.",
    notesTitle: "How the line is set on a disc",
    notes: [
      "The line is centred and its rendered width is checked against the usable width of the disc, so the border stays even. The plate is thick enough to take a stand pin without cracking.",
      "Finish the face before the final assembly, and keep the lettering away from a stand's contact point. A disc that is clamped too tightly will mark at the rim.",
    ],
  },
  {
    id: "keepsake-plate", name: "Keepsake plate", eyebrow: "Memory plate", shape: "rect", hole: "corners",
    text: "HOME", fonts: ["serif", "sans", "sans-bold"],
    width: [60, 160, 110], height: [40, 90, 60], letter: [8, 24, 16],
    thickness: [2, 6, 3], relief: [1, 5, 3], holeDia: [4, 10, 5],
    blurb: "A wall plate that carries a word or a short memory in relief.",
    lede: "A keepsake plate with a single word in relief and a fixing hole in each top corner, sized for a wall or a shelf back. The plate leaves a wide border so the word reads as a framed object rather than a label.",
    use: "Hanging a word, a place name or a short memory on a wall at home.",
    notesTitle: "How the word sits in the frame",
    notes: [
      "The word is centred with equal margins and the letter height is capped against the plate, so the border stays even. The corner fixings are clear of the text at every size.",
      "Use a spirit level for the two fixings; a single word makes any tilt obvious. Keep the plate off a damp wall so moisture does not creep behind it.",
    ],
  },
  {
    id: "bag-tag", name: "Bag tag", eyebrow: "Bag label", shape: "tag", hole: "top",
    text: "FLY", fonts: ["sans", "sans-bold", "mono"],
    width: [45, 100, 70], height: [25, 60, 35], letter: [7, 18, 12],
    thickness: [1.5, 4, 2.5], relief: [0.8, 3, 1.5], holeDia: [3, 8, 4],
    blurb: "A light tag that marks a bag, a case or a camera strap.",
    lede: "A bag tag with a short identifier in relief and a ring hole at the top, made to hang from a handle or a strap. The plate is light enough not to swing, and the hole suits a cord or a small ring.",
    use: "Marking a camera bag, a tool bag or a carry-on with a short name.",
    notesTitle: "How the tag hangs from a handle",
    notes: [
      "The hole sits above the text with a land that survives a cord, and the rounded plate has no corner that can catch on a strap. The rendered width of the text is checked against the plate.",
      "Fit a cord that matches the bag's hardware and tuck the tag inside a pocket when it is checked in. A tag that hangs loose is the first thing to catch on a carousel.",
    ],
  },
  {
    id: "garden-marker", name: "Garden marker", eyebrow: "Bed marker", shape: "tag", hole: "top",
    text: "MINT", fonts: ["sans", "mono", "serif"],
    width: [25, 55, 38], height: [90, 200, 140], letter: [5, 14, 6.5],
    thickness: [1.5, 4, 2], relief: [0.8, 3, 1.2], holeDia: [3, 6, 4],
    blurb: "A tall bed marker with a herb name and a tie hole at the top.",
    lede: "A garden marker with a narrow upright plate, a name in relief and a small hole for a tie at the top. The long lower section is left plain so it can be pushed into a bed or tied to a cane.",
    use: "Marking a herb bed, a row of seedlings or a climbing plant on a cane.",
    notesTitle: "How the marker is held",
    notes: [
      "The name sits on the upper part of the plate and the hole is placed above it, leaving a long plain stem. The narrow width is checked against the rendered text so the letters cannot run off.",
      "Fit the marker to a cane rather than pushing it into hard ground, and leave the hole free so the tie can slide. A marker that is forced into clay will snap at the lettering.",
    ],
  },
  {
    id: "wine-cellar-label", name: "Wine cellar label", eyebrow: "Cellar plate", shape: "rect", hole: "none",
    text: "2019", fonts: ["serif", "mono", "sans"],
    width: [50, 120, 80], height: [30, 60, 40], letter: [6, 16, 11],
    thickness: [1.5, 4, 2.5], relief: [0.8, 3, 1.5],
    blurb: "A flat bin label that records a vintage or a rack position.",
    lede: "A wine cellar label with a short code in relief and no fixing holes, made to sit against a bottle or a rack front. The plate is thin so it can be set into a rack slot without changing the fit.",
    use: "Recording a vintage, a bin number or a tasting note on a wine rack.",
    notesTitle: "How the code fits the rack",
    notes: [
      "The short code is centred and measured in the chosen font, and the plate is kept thin enough to slide into a rack slot. No holes means the face stays clear for the code.",
      "Write on the back rather than the lettered face if the label may be reused, and fit it clear of direct sunlight. A label that swells in a damp cellar will jam in its slot.",
    ],
  },
];

export const textProducts: AnyDesign[] = CONFIGS.map(defineTextProduct);
