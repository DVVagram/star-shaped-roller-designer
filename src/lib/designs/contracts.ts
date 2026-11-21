/**
 * Capability and validation contracts.
 *
 * A closed mesh proves topology, not fitness. Every designer therefore carries
 * an explicit capability category, the standard (if any) it actually follows,
 * the mating dimensions it needs, and the properties nobody has checked. The
 * catalogue, the designer page, the export panel and the downloadable
 * specification all read this one table, so the label cannot drift from the
 * work that was actually done.
 */

export type CapabilityId = "shape" | "fit" | "functional" | "unsafe";

export interface CapabilityMeta {
  label: string;
  short: string;
  description: string;
  /** Tailwind classes for the badge. */
  tone: string;
}

export const CAPABILITIES: Record<CapabilityId, CapabilityMeta> = {
  shape: {
    label: "Shape / display model",
    short: "Shape model",
    description:
      "The geometry is editable and its mesh is checked, but no fit, load, flow or safety behaviour has been verified.",
    tone: "border-slate-300 bg-slate-50 text-slate-700",
  },
  fit: {
    label: "Fit prototype",
    short: "Fit prototype",
    description:
      "Intended for dimensional trial fits. Measure the mating part, calibrate your printer and test-print before relying on it.",
    tone: "border-amber-300 bg-amber-50 text-amber-900",
  },
  functional: {
    label: "Functional candidate",
    short: "Functional candidate",
    description:
      "Only functional after the specified fit, load and material checks have been made and recorded for your process.",
    tone: "border-emerald-300 bg-emerald-50 text-emerald-900",
  },
  unsafe: {
    label: "Not suitable for the named high-risk use",
    short: "High-risk use excluded",
    description:
      "The shape can be printed and measured, but it must not be used for the named high-risk duty (pressure, flame, cutting, braking, torque, clinical or centrifugation).",
    tone: "border-red-300 bg-red-50 text-red-900",
  },
};

export interface DesignContract {
  capability: CapabilityId;
  /** What the part is for, copied from the designer's use case. */
  intendedUse: string;
  /** Named standard actually implemented, or an explicit "none claimed". */
  standard: string;
  /** Mating part whose real dimensions must be measured. */
  mating: string;
  /** How clearance is handled. */
  fitAllowance: string;
  /** Unverified or excluded properties, shown before and beside export. */
  limitations: string[];
  /** Checks deliberately not performed by this app. */
  notChecked: string[];
}

/** Checks the shared mesh inspector and build-volume test actually perform. */
export const VALIDATION_CHECKS = [
  "Every edge is shared by exactly two consistently wound triangles",
  "One connected shell (no loose islands)",
  "No repeated faces or faces with repeated vertex indices",
  "Zero-area cap slivers are counted and reported",
  "Euler characteristic is that of a closed orientable surface",
  "Signed volume is positive and finite",
  "Overall envelope is compared with the 180 mm build cube",
] as const;

const NOT_CHECKED = [
  "Triangle self-intersection and overlapping shells",
  "Minimum wall thickness over the whole surface",
  "Print orientation, overhangs, supports and warping",
  "Material strength, stiffness, fatigue, creep and wear",
  "Fit, clearance and tolerance on real printed parts",
  "Chemical, heat, flame, food-contact or sterilisation safety",
  "Compliance with any published standard",
];

const BASE_LIMITS = [
  "Only the mesh topology and overall envelope are checked; fit, strength and safety are not verified.",
  "Use the specification and a test print; do not treat the STL as a certified part.",
];

const BASE_MATING = "Measure the actual mating part; no mate is included with this designer.";
const BASE_FIT = "Nominal geometry only. No printer, material or tolerance calibration is applied.";
const BASE_STANDARD = "No standard compliance is claimed or tested.";

const ids = (list: string) => new Set(list.split(/\s+/).filter(Boolean));

const GEARS = ids(`spur-gear internal-gear helical-gear rack ratchet-wheel geneva-wheel
  disc-cam eccentric-wheel splined-hub`);
const PULLEYS = ids(`timing-pulley v-belt-pulley round-belt-pulley stepped-pulley`);
const THREADS = ids(`hex-nut square-nut coupling-nut wing-nut t-slot-nut thumb-nut dome-nut
  thumb-screw cross-knob pointer-knob star-knob knurled-knob hex-standoff`);
const PRESSURE = ids(`pipe-reducer pipe-cap pipe-elbow hose-adapter hose-barb barbed-reducer
  bulkhead-fitting tube-adapter oring-plug gasket de-laval-nozzle caulking-nozzle`);
const LAB = ids(`test-tube centrifuge-tube erlenmeyer-flask pipette-tip`);
const FOOD = ids(`cup bowl bottle egg-cup honey-dipper pet-bowl wine-glass goblet
  funnel portafilter-funnel biscuit-cutter plant-saucer jar-lid`);
const HEAT = ids(`candlestick tea-light-cup lamp-shade incense-holder trivet`);
const TORQUE = ids(`open-end-wrench box-wrench`);
const HIGH_RISK = ids(`brake-rotor saw-blade flywheel piston centrifuge-tube`);
const DECORATIVE = ids(`vase bell parabolic-dish spinning-top yo-yo torus
  hemisphere-shell nose-cone chain-link keytag plant-label index-plate vent-grille
  fan-grille perforated-plate baffle-plate`);
const LOAD = ids(`wall-hook pegboard-hook door-strike hinge-leaf mounting-plate
  bearing-plate nema-plate pivot-bracket slot-bracket link-plate gusset-plate
  switch-plate tensioner-plate keyhole-plate drill-guide cable-mount corner-bracket
  flat-brace t-bracket cross-brace french-cleat door-wedge saddle-clamp pipe-saddle
  featherboard hold-down-clamp eccentric-clamp hinge-leaf zero-clearance-insert
  router-template fan-mount bell-crank bearing-cap`);
const SHAFT = ids(`flanged-bushing bearing-cap bearing-plate caster-wheel handwheel
  eccentric-wheel splined-hub flywheel sprocket chain-link`);
const CUTTING = ids(`biscuit-cutter router-template drill-guide zero-clearance-insert
  sanding-drum saw-blade`);

interface Override {
  capability?: CapabilityId;
  standard?: string;
  mating?: string;
  fitAllowance?: string;
  limitations?: string[];
}

function extraFor(id: string): Override {
  const override: Override = {};
  const add = (...items: string[]) => {
    override.limitations = [...(override.limitations ?? []), ...items];
  };

  if (GEARS.has(id)) {
    override.capability = "fit";
    override.standard =
      "Tooth outline is generated from module and pressure angle, but no standard tooth system, backlash class or profile shift is enforced or claimed.";
    override.mating =
      "A mating gear or rack with matching module and pressure angle, at the centre distance shown; the mate is not included.";
    add(
      "Contact ratio, undercut, interference, backlash and tooth strength are not calculated.",
      id === "internal-gear"
        ? "Internal-gear interference limits and the compatible pinion range are not validated."
        : "A successful mesh does not prove that a printed pair will run quietly or carry load.",
    );
    if (id === "helical-gear") {
      add("Handedness and axial thrust are not checked; a mating helical gear must be the opposite hand.");
    }
    if (id === "splined-hub") {
      add("The straight-sided spline is a custom visual form, not an interchangeable standard spline.");
    }
  }

  if (PULLEYS.has(id)) {
    override.capability = "fit";
    override.standard =
      "The groove is a generic belt profile. No named timing-belt or V-belt standard, pitch-line or flank geometry is implemented.";
    override.mating =
      "The actual belt, its pitch and its tooth or flank section must be measured; no belt is included.";
    add("Belt engagement, tooth clearance, tension and slip are not validated.");
  }

  if (id === "sprocket") {
    override.capability = "fit";
    override.standard =
      "Roller seats use the entered pitch and roller only; ANSI/ISO flank radii and tooth thickness are not implemented.";
    override.mating = "The actual chain, with its measured pitch, roller diameter and width; no chain is included.";
    add("Chain engagement, seat clearance, tooth strength and wear are not demonstrated — test-fit a short chain run.");
  }

  if (id === "chain-link") {
    override.capability = "shape";
    override.standard = "No chain standard or load rating is claimed.";
    add("This is a link-shaped plate, not a load-rated chain component.");
  }

  if (THREADS.has(id)) {
    override.capability = "fit";
    override.standard =
      "Bores are plain clearance holes. No thread form, pitch, fit class or printed-thread allowance is implemented.";
    override.mating =
      "The actual screw, insert or shaft. Measure it and test the bore; no hardware is included.";
    add("These are unthreaded bodies or plain-bore knobs, not working threaded fasteners.");
  }

  if (PRESSURE.has(id)) {
    override.capability = "unsafe";
    override.standard = "No pipe, hose, thread or pressure standard is implemented or claimed.";
    override.mating =
      "The actual hose, pipe, O-ring or mating fitting, measured with callipers; no seal or clamp is included.";
    add(
      "Not pressure-rated and not suitable for gas, potable water, heating or any pressurised system.",
      "No leak, burst, chemical-compatibility or seal-squeeze test is performed.",
    );
  }

  if (id === "oring-plug" || id === "gasket") {
    add("O-ring size, groove squeeze, stretch and material are not validated; no seal is claimed.");
  }

  if (LAB.has(id)) {
    override.capability = "unsafe";
    add(
      "Not for centrifugation, clinical, diagnostic, chemical-storage or sterilisation use.",
      "Printed polymer is porous and cannot be assumed cleanable, sterile or chemically inert.",
    );
    if (id === "centrifuge-tube") {
      override.standard = "No centrifuge tube standard, wall strength or rotor fit is implemented.";
      add("Do not spin this part in a centrifuge under any circumstances.");
    }
  }

  if (FOOD.has(id)) {
    add(
      "Not food-contact rated: layer lines harbour residue and no material migration, cleaning or heat test has been made.",
    );
  }

  if (HEAT.has(id)) {
    add("Printed polymer may soften, deform or burn near a flame or hot bulb; never leave a flame unattended.");
  }

  if (TORQUE.has(id)) {
    override.capability = "unsafe";
    override.standard = "No wrench standard, torque rating or material specification is implemented.";
    add("Not a torque tool: do not use it to turn or loosen a fastener.");
  }

  if (HIGH_RISK.has(id)) {
    override.capability = "unsafe";
    add(
      id === "brake-rotor"
        ? "Not for braking: no friction, heat, burst-speed or containment validation."
        : id === "saw-blade"
          ? "Not for cutting: no tooth strength, kickback, heat or guard validation."
          : id === "flywheel"
            ? "Not rated for stored energy or rotational speed; containment is not provided."
            : id === "piston"
              ? "Does not seal or handle pressure; rings, lubrication and thermal clearance are absent."
              : "High-risk use is excluded.",
    );
  }

  if (id === "compression-spring") {
    override.capability = "shape";
    override.standard =
      "Rate uses the helical-spring formula with an assumed shear modulus; the material is not characterised.";
    override.mating = "The spring seats and the actual load train; no mating hardware is included.";
    add(
      "Rate is an illustrative estimate, not a measured or rated spring constant.",
      "Buckling, fatigue, creep, solid-height clash and operating deflection are not validated.",
    );
  }

  if (DECORATIVE.has(id)) {
    override.capability = "shape";
    add("Intended as a shape or display model; no optical, flow, guarding or mechanical duty is verified.");
  }

  if (LOAD.has(id)) {
    add("No load rating, fastener pull-out, fatigue or safety factor is provided; do not use overhead or for people.");
  }

  if (SHAFT.has(id)) {
    add("Shaft and bearing seats are nominal; measure the real bearing or shaft and test the fit.");
  }

  if (CUTTING.has(id)) {
    add("Cutting edges and guides are not sharpened, hardened or guarded; use eye protection and a test coupon.");
  }

  if (id === "nema-plate") {
    add("The NEMA 17 pattern is nominal; verify the 31 mm hole square against your motor datasheet.");
  }

  if (id === "t-slot-nut" || id === "dovetail-rail") {
    add("The rail profile is nominal; measure your extrusion or rail and print a short test section.");
  }

  if (id === "caster-wheel" || id === "dowel-pin" || id === "taper-pin" || id === "rivet") {
    override.capability = "fit";
    add("No standard pin, axle or load rating is claimed; fit and wear must be tested.");
  }

  if (id === "suction-cup" || id === "bellows-boot") {
    add("No suction force, seal life or flex-fatigue result is claimed; test on the real surface.");
  }

  if (id === "pipette-tip") {
    add("Not for accurate volume transfer, aerosol containment or sterile work.");
  }

  return override;
}

const DEFAULTS_BY_CAPABILITY: Record<CapabilityId, string[]> = {
  shape: [],
  fit: [],
  functional: ["Functional only for the exact checked configuration; re-verify after any edit."],
  unsafe: [],
};

export function contractFor(id: string, intendedUse: string): DesignContract {
  const override = extraFor(id);
  const capability =
    override.capability ??
    (HIGH_RISK.has(id) || PRESSURE.has(id) || LAB.has(id) || TORQUE.has(id)
      ? "unsafe"
      : "fit");
  const limitations = Array.from(
    new Set([...(override.limitations ?? []), ...BASE_LIMITS, ...DEFAULTS_BY_CAPABILITY[capability]]),
  );

  return {
    capability,
    intendedUse,
    standard: override.standard ?? BASE_STANDARD,
    mating: override.mating ?? BASE_MATING,
    fitAllowance: override.fitAllowance ?? BASE_FIT,
    limitations,
    notChecked: [...NOT_CHECKED],
  };
}

export function capabilityMeta(id: CapabilityId): CapabilityMeta {
  return CAPABILITIES[id];
}
