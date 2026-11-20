import StarBuilder from "@/components/StarBuilder";

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

const specChips = [
  ["Spikes", "3 – 96"],
  ["Wheel Ø", "20 – 180 mm"],
  ["Spike depth", "0.5 – 80 mm"],
] as const;

const steps = [
  {
    number: "01",
    title: "Set the wheel",
    body: "Enter the wheel diameter, thickness and how deep the spikes bite. Leave auto-fit on and the spike count follows the dimensions you choose.",
  },
  {
    number: "02",
    title: "Shape the points",
    body: "Pick rounded, truncated, sharp or swept claws, then tune tip width, valley width and a taper that narrows every point towards the top face.",
  },
  {
    number: "03",
    title: "Export the STL",
    body: "The 3D view renders the same mesh the volume readout measures, so the file you download is the solid you have been looking at.",
  },
];

export default function App() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <a href="/" className="flex min-w-0 items-center gap-2 text-sm font-semibold tracking-tight whitespace-nowrap">
            <StarMark className="size-5 shrink-0 text-accent sm:size-6" />
            <span className="truncate">
              <span className="hidden sm:inline">Star Shaped </span>Roller Designer
            </span>
          </a>
          <nav aria-label="Main" className="flex shrink-0 items-center gap-4 text-xs font-medium">
            <a href="#builder" className="hidden text-muted transition hover:text-ink sm:inline">
              Builder
            </a>
            <a href="#how" className="hidden text-muted transition hover:text-ink sm:inline">
              How it works
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-6 sm:pt-16">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-end">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
                <span aria-hidden="true" className="h-px w-8 bg-accent" />
                Fully parametric
              </p>
              <h1 className="mt-4 max-w-2xl text-[2.6rem] font-semibold leading-[1.03] tracking-tight sm:text-6xl">
                Star rollers,
                <br />
                made to spec.
              </h1>
              <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted">
                Design a 3D-printable star-spiked wheel by diameter, spike shape and
                centre hole. The point count fits itself to the room you give it, the
                solid updates as you type, and the STL comes out watertight.
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line text-xs">
              {specChips.map(([label, value]) => (
                <div key={label} className="bg-card px-4 py-3.5">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                    {label}
                  </dt>
                  <dd className="mt-0.5 font-mono text-[13px] text-ink numeric whitespace-nowrap">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section
          id="builder"
          aria-labelledby="builder-heading"
          className="mx-auto max-w-6xl px-4 pb-16 sm:px-6"
        >
          <div className="mb-5 flex flex-col gap-2 border-t border-line pt-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="builder-heading" className="text-xl font-semibold tracking-tight sm:text-2xl">
                Build your roller
              </h2>
              <p className="mt-1 text-sm text-muted">
                Millimetres or inches — every field is live.
              </p>
            </div>
            <p className="max-w-sm text-xs leading-relaxed text-muted">
              Printable range: 3–96 spikes inside a 180 × 180 × 180 mm build volume.
              Anything outside is blocked before export.
            </p>
          </div>

          <StarBuilder />
        </section>

        <section id="how" aria-labelledby="how-heading" className="border-y border-line bg-paper-deep/50">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <h2 id="how-heading" className="text-xl font-semibold tracking-tight sm:text-2xl">
                How it works
              </h2>
              <p className="text-xs text-muted">
                One geometry engine for the preview, the measurements and the STL.
              </p>
            </div>
            <ol className="mt-8 grid gap-6 sm:grid-cols-3">
              {steps.map((step) => (
                <li key={step.number} className="border-t border-line pt-4">
                  <p className="font-mono text-xs text-accent">{step.number}</p>
                  <h3 className="mt-2 text-sm font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.body}</p>
                </li>
              ))}
            </ol>

            <div className="mt-12 grid gap-6 rounded-2xl border border-line bg-card p-6 sm:grid-cols-2 sm:p-8">
              <div>
                <h3 className="text-sm font-semibold">What you get</h3>
                <ul className="mt-3 space-y-2 text-sm text-muted">
                  <li className="flex gap-2">
                    <span aria-hidden="true" className="text-accent">
                      ✓
                    </span>
                    A closed indexed mesh: every edge is shared by exactly two
                    consistently wound triangles, so the exported STL is watertight by
                    construction rather than by repair.
                  </li>
                  <li className="flex gap-2">
                    <span aria-hidden="true" className="text-accent">
                      ✓
                    </span>
                    A binary STL in millimetres with the real spike profile, valley,
                    centre hole and hub — not a bounding box or an approximation.
                  </li>
                  <li className="flex gap-2">
                    <span aria-hidden="true" className="text-accent">
                      ✓
                    </span>
                    A measured solid volume, so you can size the part before you slice.
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold">How the points fit</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  Each spike owns one pitch of 2π / N. Inside that pitch it spends
                  angular room on its tip land, its valley land and a printable flank.
                  Auto-fit takes the largest count whose lands and flanks still fit at
                  your diameter and depth — so widening the wheel adds points and
                  deepening the spikes takes them away.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  Print spikes with at least three perimeters and a small layer height;
                  tall thin points are the first thing to snap on a printed roller.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-paper">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <StarMark className="size-5 text-accent" />
              <span className="text-sm font-semibold tracking-tight">
                Star Shaped Roller Designer
              </span>
            </div>
            <p className="mt-3 max-w-sm text-xs leading-relaxed text-muted">
              Parametric star-spiked rollers with a live 3D preview and binary STL
              export. Runs entirely in the browser — no accounts, no uploads, no CAD
              kernel.
            </p>
          </div>
          <div className="text-xs leading-relaxed text-muted sm:text-right">
            <p>
              Every model is generated locally from the fields you enter. Geometry is a
              prismatic star with a through-hole and an optional hub.
            </p>
            <p className="mt-2">© {new Date().getFullYear()} Star Shaped Roller Designer</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
