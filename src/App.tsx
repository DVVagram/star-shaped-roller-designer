import { useEffect, useState, type ReactNode } from "react";

import Catalog, { type CatalogEntry } from "@/components/Catalog";
import DesignMark from "@/components/DesignMark";
import DesignerPage, {
  type DesignerPageProps,
  type RelatedDesign,
} from "@/components/DesignerPage";
import DesignerSearch from "@/components/DesignerSearch";
import FanBuilder from "@/components/FanBuilder";
import GenericDesigner from "@/components/GenericDesigner";
import PropellerBuilder from "@/components/PropellerBuilder";
import SprocketBuilder from "@/components/SprocketBuilder";
import StarBuilder from "@/components/StarBuilder";
import { DESIGNS, designById } from "@/lib/designs";
import { LEGACY_CONTRACTS } from "@/lib/designs/legacy";
import type { AnyDesign } from "@/lib/designs/types";
import { USE_CASES } from "@/lib/designs/use-cases";

/* ------------------------------------------------------------------- marks */

const STAR_PATH = (() => {
  const tips = 8;
  const outer = 15;
  const inner = 6.2;
  let path = "";
  for (let i = 0; i < tips * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI * i) / tips - Math.PI / 2;
    const x = (16 + radius * Math.cos(angle)).toFixed(2);
    const y = (16 + radius * Math.sin(angle)).toFixed(2);
    path += `${i === 0 ? "M" : "L"}${x} ${y}`;
  }
  return `${path}Z`;
})();

function StarMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <path d={STAR_PATH} fill="currentColor" />
    </svg>
  );
}

function SprocketMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <circle
        cx="16"
        cy="16"
        r="10"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeDasharray="3.2 3.4"
      />
      <circle cx="16" cy="16" r="5" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

function ImpellerMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <ellipse
          key={angle}
          cx="16"
          cy="9"
          rx="3.4"
          ry="7"
          fill="currentColor"
          transform={`rotate(${angle} 16 16)`}
        />
      ))}
      <circle cx="16" cy="16" r="3.4" fill="currentColor" />
    </svg>
  );
}

function PropellerMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      {[0, 120, 240].map((angle) => (
        <path
          key={angle}
          d="M16 16 C 20 10, 21 4, 16 2.2 C 12 4, 12.6 10, 16 16 Z"
          fill="currentColor"
          transform={`rotate(${angle} 16 16)`}
        />
      ))}
      <circle cx="16" cy="16" r="2.2" fill="currentColor" />
    </svg>
  );
}

/* ---------------------------------------------------------------- routing */

const ROUTE_IDS = ["star", "sprocket", "impeller", "propeller"] as const;
type RouteId = (typeof ROUTE_IDS)[number];

const LEGACY_CATALOG: CatalogEntry[] = [
  {
    id: "star",
    name: "Star roller",
    family: "wheels",
    eyebrow: "Fully parametric",
    blurb: "A star-spiked wheel by diameter, spike shape and centre hole.",
    use: USE_CASES.star,
    isNew: false,
    contract: LEGACY_CONTRACTS.star,
  },
  {
    id: "sprocket",
    name: "Chain sprocket",
    family: "drives",
    eyebrow: "Chain driven",
    blurb: "Roller-chain seats cut to a real pitch and roller.",
    use: USE_CASES.sprocket,
    isNew: false,
    contract: LEGACY_CONTRACTS.sprocket,
  },
  {
    id: "impeller",
    name: "Axial impeller",
    family: "wheels",
    eyebrow: "Air moving",
    blurb: "Swept, leaned blades on a solid hub.",
    use: USE_CASES.impeller,
    isNew: false,
    contract: LEGACY_CONTRACTS.impeller,
  },
  {
    id: "propeller",
    name: "Propeller",
    family: "wheels",
    eyebrow: "Pitch and thrust",
    blurb: "Pitch-driven blades with a tapered chord.",
    use: USE_CASES.propeller,
    isNew: false,
    contract: LEGACY_CONTRACTS.propeller,
  },
];

const ALL_ENTRIES: CatalogEntry[] = [
  ...LEGACY_CATALOG,
  ...DESIGNS.map((design) => ({
    id: design.id,
    name: design.name,
    family: design.family,
    eyebrow: design.eyebrow,
    blurb: design.blurb,
    use: design.use,
    isNew: true,
    contract: design.contract,
  })),
];

function routeFromHash(): string {
  if (typeof window === "undefined") return "home";
  const raw = window.location.hash.replace(/^#\/?/, "").toLowerCase();
  return raw === "" ? "home" : raw;
}

/** Hash routing, so the whole suite stays a static site. */
function useRoute(): string {
  const [route, setRoute] = useState<string>(() => routeFromHash());

  useEffect(() => {
    const onHashChange = () => {
      setRoute(routeFromHash());
      window.scrollTo({ top: 0, behavior: "auto" });
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return route;
}

function DesignerNav({ route }: { route: string }) {
  return (
    <nav
      aria-label="Designers"
      className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none"
    >
      <a
        href="#/"
        aria-current={route === "home" ? "page" : undefined}
        className={
          route === "home"
            ? "hidden shrink-0 rounded-md bg-card px-2.5 py-1 text-[11px] font-semibold text-ink ring-1 ring-line sm:block"
            : "hidden shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium text-muted transition hover:bg-card hover:text-ink sm:block"
        }
      >
        All designers
      </a>
      <DesignerSearch entries={ALL_ENTRIES} route={route} />
    </nav>
  );
}

const PAIRINGS: Record<string, string[]> = {
  star: ["sprocket", "impeller", "propeller"],
  sprocket: ["chain-link", "star"],
  impeller: ["propeller", "fan-mount", "star"],
  propeller: ["impeller", "fan-mount"],
  "fan-mount": ["fan-grille", "impeller"],
  "fan-grille": ["fan-mount", "impeller"],
  "chain-link": ["sprocket"],
  "timing-pulley": ["v-belt-pulley", "round-belt-pulley"],
  "v-belt-pulley": ["timing-pulley", "round-belt-pulley"],
  "round-belt-pulley": ["timing-pulley", "v-belt-pulley"],
  "bearing-cap": ["bearing-plate", "flanged-bushing"],
  "bearing-plate": ["bearing-cap", "flanged-bushing"],
};

function relatedFor(route: string): RelatedDesign[] {
  const current = ALL_ENTRIES.find((entry) => entry.id === route);
  if (!current) return [];
  const paired = (PAIRINGS[route] ?? [])
    .map((id) => ALL_ENTRIES.find((entry) => entry.id === id))
    .filter((entry): entry is CatalogEntry => Boolean(entry));
  const pairedIds = new Set(paired.map((entry) => entry.id));
  const familyMatches = ALL_ENTRIES.filter(
    (entry) =>
      entry.family === current.family &&
      entry.id !== current.id &&
      !pairedIds.has(entry.id),
  );
  return [...paired, ...familyMatches].slice(0, 3).map((entry) => ({
    id: entry.id,
    name: entry.name,
    family: entry.family,
    blurb: entry.blurb,
  }));
}

function genericPage(design: AnyDesign): PageConfig {
  return {
    mark: <DesignMark family={design.family} className="size-3.5" />,
    eyebrow: design.eyebrow,
    title: design.name,
    lede: design.lede,
    useCase: design.use,
    contract: design.contract,
    chips: design.chips,
    builderNote:
      "Dimensions are checked for a valid, finite overall size. Export unlocks only for a mesh that passes the topology checks; that is not a fit or safety test.",
    steps: [
      {
        number: "01",
        title: "Set the dimensions",
        body: "Every field is live. Lengths convert between millimetres and inches without changing the underlying part, and the readout updates as you type.",
      },
      {
        number: "02",
        title: "Read the numbers",
        body: "The derived pitch, volume, angle or capacity is calculated from the same parameters that build the mesh — not typed in a second time.",
      },
      {
        number: "03",
        title: "Export and record",
        body: "The preview draws the indexed mesh the exporter writes. Download the STL and the specification: the STL carries no units, material or capability data, so check scale and orientation in your software.",
      },
    ],
    checklist: [
      `A closed indexed mesh measured before export: one shell, every edge shared by two consistently wound triangles.`,
      `A binary STL built from the same vertices the preview renders — no bounding box, no repair pass.`,
      `Derived measurements from the entered dimensions, so the drawing, the volume and the file agree.`,
      `A capabilities and limitations statement beside the export and in the downloadable specification.`,
    ],
    notesTitle: design.notesTitle,
    notes: design.notes,
    // Remount per designer so the form state cannot leak across routes.
    builder: <GenericDesigner key={design.id} design={design} />,
  };
}

/* ------------------------------------------------------------------ pages */

type PageConfig = Omit<DesignerPageProps, "children"> & { builder: ReactNode };

const PAGES: Record<RouteId, PageConfig> = {
  star: {
    mark: <StarMark className="size-3.5" />,
    eyebrow: "Fully parametric",
    title: (
      <>
        Star rollers,
        <br />
        made to spec.
      </>
    ),
    lede: "Design a star-spiked wheel by diameter, spike shape and centre hole. The point count fits itself to the room you give it, the solid updates as you type, and the STL comes out watertight.",
    chips: [
      { label: "Spikes", value: "3 – 96" },
      { label: "Wheel Ø", value: "20 – 1000 mm" },
      { label: "Spike depth", value: "0.5 – 80 mm" },
    ],
    useCase: USE_CASES.star,
    contract: LEGACY_CATALOG[0].contract,
    builderNote:
      "Spike range: 3–96. Auto-fit reports the largest count that fits your wheel; a count whose lands or flanks collide is blocked before export.",
    steps: [
      {
        number: "01",
        title: "Set the wheel",
        body: "Enter the wheel diameter, thickness and how deep the spikes bite. Leave auto-fit on and the spike count follows the dimensions you choose.",
      },
      {
        number: "02",
        title: "Shape the points",
        body: "Pick rounded, truncated, sharp or swept claws — or rectangles, which replace the points with rectangular flaps on a round core. Then tune tip width, valley width and a taper that narrows every point towards the top face.",
      },
      {
        number: "03",
        title: "Export the STL",
        body: "The 3D view renders the same mesh the volume readout measures, so the file you download is the solid you have been looking at.",
      },
    ],
    checklist: [
      "A closed indexed mesh: every edge is shared by exactly two consistently wound triangles, so the exported STL is watertight by construction rather than by repair.",
      "A binary STL in millimetres with the real spike profile, valley, centre hole and hub — not a bounding box or an approximation.",
      "A measured solid volume, so you can size the part before you make it.",
    ],
    notesTitle: "How the points fit",
    notes: [
      "Each spike owns one pitch of 2π / N. Inside that pitch it spends angular room on its tip land, its valley land and a usable flank. Auto-fit takes the largest count whose lands and flanks still fit at your diameter and depth — so widening the wheel adds points and deepening the spikes takes them away.",
      "Keep the tips substantial: tall, thin points are the first thing to chip or bend in handling.",
    ],
    builder: <StarBuilder />,
  },

  sprocket: {
    mark: <SprocketMark className="size-3.5" />,
    eyebrow: "Chain driven",
    title: (
      <>
        Sprockets,
        <br />
        cut for the chain.
      </>
    ),
    lede: "Pick a roller chain, set the tooth count and the bore. The seats are modelled from the entered pitch and roller, so the pitch circle, seat depth and tooth spacing follow your chain — engagement still depends on the actual chain and fit clearance.",
    chips: [
      { label: "Teeth", value: "6 – 72" },
      { label: "Chain", value: "#25 – #50" },
      { label: "Seat", value: "roller + gap" },
    ],
    useCase: USE_CASES.sprocket,
    contract: LEGACY_CATALOG[1].contract,
    builderNote:
      "Tooth range: 6–72. Teeth that collide with the seats are blocked before export.",
    steps: [
      {
        number: "01",
        title: "Pick the chain",
        body: "The #25 to #50 presets set the pitch and the roller diameter. Override either one when you are matching a measured chain.",
      },
      {
        number: "02",
        title: "Set the teeth",
        body: "The pitch circle follows p / sin(π / N), the seats are cut to the roller plus your clearance, and the flanks carry the tooth height you choose.",
      },
      {
        number: "03",
        title: "Export the STL",
        body: "One closed shell with the bore and the optional hub. The file is the same solid the preview draws and the volume readout measures.",
      },
    ],
    checklist: [
      "A closed indexed mesh with one shell and one through-hole, verified before the download button unlocks.",
      "Roller seats cut to the entered roller diameter plus the clearance you set, on the pitch circle for your tooth count.",
      "A measured solid volume and tooth depth, so you can check the part against the chain before making it.",
    ],
    notesTitle: "How the seat is cut",
    notes: [
      "A chain roller sits in a circular seat whose centre is on the pitch circle. The profile follows the part of that circle facing the axis, so the seat floor is the root radius and the seat edges meet the flanks tangentially. Because the pitch circle grows as the tooth count rises, a given roller takes up less of each pitch — which is why small sprockets need more clearance.",
      "Too tight and the chain binds; too loose and it skips a tooth. Start with 0.15 mm of clearance per side, make one link pair to test, then adjust.",
    ],
    builder: <SprocketBuilder />,
  },

  impeller: {
    mark: <ImpellerMark className="size-3.5" />,
          eyebrow: "Blade geometry",
      title: (
        <>
          Impellers,
          <br />
          twisted and measured.
        </>
      ),
    lede: "An axial impeller rotor: blades swept around a solid hub, leaned to the blade angle you choose. Diameter, blade count, chord, height and lean are all live, and the passage between blades is checked as you type.",
    chips: [
      { label: "Blades", value: "2 – 24" },
      { label: "Tip Ø", value: "20 – 1000 mm" },
      { label: "Blade angle", value: "0 – 70°" },
    ],
    useCase: USE_CASES.impeller,
    contract: LEGACY_CATALOG[2].contract,
    builderNote:
      "Blade range: 2–24. Blades that overlap or lean into a neighbour are blocked before export.",
    steps: [
      {
        number: "01",
        title: "Size the rotor",
        body: "Set the tip diameter and the hub. The blades span whatever radial length is left between them.",
      },
      {
        number: "02",
        title: "Set the blades",
        body: "Blade count, chord at the root and at the tip, sweep and lean. The designer measures the narrowest passage between neighbouring blades.",
      },
      {
        number: "03",
        title: "Export the STL",
        body: "The leaned walls are one closed shell, so the rotor needs no repair — and the hub bore is part of the same solid.",
      },
    ],
    checklist: [
      "One watertight shell: hub, blades and bore are built together, with no booleans or mesh repair.",
      "The blades are a leaned extrusion of the plan — the top face is sheared by the blade angle, so the wall twists from root to tip.",
      "A measured solid volume and the narrowest passage, so you know the geometry is sound before you commit to a process.",
    ],
    notesTitle: "How the blades are made",
    notes: [
      "Each blade is a band of constant chord wrapped along a swept centre line, so the passages between blades stay open all the way to the rim. The top face is displaced tangentially in proportion to the radius, which tilts each blade without moving the hub — the twist you see is that displacement, not a texture.",
      "Lean is limited by the gap between blades: lean far enough and the top of a blade would run into its neighbour. The designer blocks that rather than export a self-intersecting solid.",
    ],
    builder: <FanBuilder />,
  },

  propeller: {
    mark: <PropellerMark className="size-3.5" />,
    eyebrow: "Pitch and thrust",
    title: (
      <>
        Propellers,
        <br />
        pitched to bite.
      </>
    ),
    lede: "Set the advance you want per revolution and the blade angle follows at 70 % of the tip radius, tapering from the root chord to the tip. Three blades by default, two to eight if you want them.",
    chips: [
      { label: "Blades", value: "2 – 8" },
      { label: "Pitch", value: "mm / rev" },
      { label: "Tip Ø", value: "20 – 1000 mm" },
    ],
    useCase: USE_CASES.propeller,
    contract: LEGACY_CATALOG[3].contract,
    builderNote:
      "Blade range: 2–8. A pitch that would lean a blade into its neighbour is blocked before export.",
    steps: [
      {
        number: "01",
        title: "Set the disc",
        body: "Tip diameter, hub diameter and the blade drop. The hub carries the shaft bore and the blades grow out of it.",
      },
      {
        number: "02",
        title: "Set the pitch",
        body: "Pitch is the distance the prop would advance in one turn. The blade angle at 70 % radius follows from it, and the chords taper to the tip.",
      },
      {
        number: "03",
        title: "Export the STL",
        body: "The blades, hub and bore come out as one closed shell. Balance, safe speed and airflow are not verified; review orientation and scale in your software.",
      },
    ],
    checklist: [
      "One closed shell built from two corresponding outlines, so there is nothing to stitch or repair before slicing.",
      "A real pitch: the blade angle is derived from the advance per revolution at 70 % radius, not typed in twice.",
      "A measured volume, blade area and narrowest passage — enough to compare two props before making either.",
    ],
    notesTitle: "How the pitch works",
    notes: [
      "Pitch is the distance a prop would travel forward in one revolution if nothing slipped. At any radius r the blade sits at an angle of atan(pitch / 2πr) to the disc, so the same pitch means a steeper angle near the hub and a shallower one at the tip. The designer evaluates that angle at 70 % radius — the station that does most of the work.",
      "Props need balancing: finish the leading blade until the tip rests level, and use a material that survives the rpm you intend to run.",
    ],
    builder: <PropellerBuilder />,
  },
};

/* -------------------------------------------------------------------- app */

function NotFound({ route }: { route: string }) {
  const needle = route.replace(/[^a-z0-9-]/g, "").slice(0, 40);
  const suggestions = ALL_ENTRIES.filter(
    (entry) =>
      (needle && (entry.id.includes(needle) || entry.name.toLowerCase().includes(needle))) ||
      entry.family === "fixings",
  ).slice(0, 4);

  return (
    <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
        Route not found
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        No designer called “{route}”.
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
        The link may be mistyped or the designer may have been renamed. The full catalogue is
        still available; direct routes keep the form <code>#/designer-id</code>.
      </p>
      <a
        href="#/"
        className="mt-6 inline-flex rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong"
      >
        Back to all {ALL_ENTRIES.length} designers
      </a>
      {suggestions.length > 0 && (
        <div className="mt-8 border-t border-line pt-5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            Maybe you meant
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {suggestions.map((entry) => (
              <li key={entry.id}>
                <a
                  href={`#/${entry.id}`}
                  className="block rounded-xl border border-line bg-card px-3 py-2 text-sm transition hover:border-accent/50"
                >
                  {entry.name}
                  <span className="mt-0.5 block font-mono text-[10px] text-muted">
                    #/{entry.id}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default function App() {
  const route = useRoute();
  const legacy = (ROUTE_IDS as readonly string[]).includes(route)
    ? PAGES[route as RouteId]
    : null;
  const design = legacy ? null : designById(route);
  const page = legacy ?? (design ? genericPage(design) : null);

  useEffect(() => {
    const heading = document.querySelector("main h1") as HTMLElement | null;
    if (!heading) return;
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }, [route]);

  const renderPage = () => {
    if (!page) {
      return route === "home" ? (
        <Catalog entries={ALL_ENTRIES} />
      ) : (
        <NotFound route={route} />
      );
    }
    const { builder, ...content } = page;
    return (
      <DesignerPage {...content} related={relatedFor(route)}>
        {builder}
      </DesignerPage>
    );
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <button
        type="button"
        onClick={() => {
          const main = document.getElementById("main");
          main?.focus({ preventScroll: true });
          main?.scrollIntoView({ block: "start" });
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-3 focus:py-2 focus:text-xs focus:font-semibold focus:text-white"
      >
        Skip to content
      </button>
      <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex h-14 items-center justify-between gap-4">
            <a
              href="#/"
              className="flex min-w-0 items-center gap-2 text-sm font-semibold tracking-tight whitespace-nowrap"
            >
              <StarMark className="size-5 shrink-0 text-accent sm:size-6" />
              <span className="truncate">Parametric Wheel Works</span>
            </a>
            <DesignerNav route={route} />
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {renderPage()}
      </main>

      <footer className="bg-paper">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <StarMark className="size-5 text-accent" />
              <span className="text-sm font-semibold tracking-tight">
                Parametric Wheel Works
              </span>
            </div>
            <p className="mt-3 max-w-sm text-xs leading-relaxed text-muted">
              {ALL_ENTRIES.length} parametric designers in one static site: gears, pulleys,
              fixings, vessels, springs, labware, workshop fixtures and household parts,
              plus the original star rollers, sprockets, impellers and propellers.
              Everything is generated locally in the browser — no accounts, no uploads,
              no CAD kernel. Capability labels state what has and has not been checked.
            </p>
          </div>
          <div className="text-xs leading-relaxed text-muted sm:text-right">
            <p>
              Every model is generated from the fields you enter and checked as a single
              closed shell before an STL is offered. That is a topology check, not a fit,
              strength or safety certification; read the capability label before making.
            </p>
            <p className="mt-2">© {new Date().getFullYear()} Parametric Wheel Works</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
