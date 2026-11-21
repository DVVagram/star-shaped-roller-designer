import DesignMark from "./DesignMark";
import { FAMILIES, type DesignFamily } from "@/lib/designs/types";

export interface CatalogEntry {
  id: string;
  name: string;
  family: DesignFamily;
  eyebrow: string;
  blurb: string;
  use: string;
  isNew: boolean;
}

export default function Catalog({ entries }: { entries: CatalogEntry[] }) {
  const families = Object.keys(FAMILIES) as DesignFamily[];
  const added = entries.filter((entry) => entry.isNew).length;

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-6 sm:pt-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
              Parametric Wheel Works · the full library
            </p>
            <h1 className="mt-4 max-w-2xl text-[2.6rem] font-semibold leading-[1.03] tracking-tight sm:text-6xl">
              Ninety-six parts,
              <br />
              built to measure.
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted">
              Gears, pulleys, plates, vessels, springs, labware and grilles — every one
              generated from the numbers you type, verified as a closed shell, and
              exported as a binary STL in millimetres. Pick a designer to start.
            </p>
          </div>

          <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-line bg-line text-xs">
            {[
              { label: "Designers", value: String(entries.length) },
              { label: "New here", value: String(added) },
              { label: "Uploads", value: "None" },
            ].map((chip) => (
              <div key={chip.label} className="bg-card px-4 py-3.5">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                  {chip.label}
                </dt>
                <dd className="mt-0.5 font-mono text-[13px] text-ink numeric whitespace-nowrap">
                  {chip.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section aria-label="All designers" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        {families.map((family) => {
          const items = entries.filter((entry) => entry.family === family);
          if (items.length === 0) return null;
          return (
            <div key={family} className="border-t border-line pt-8 pb-10 first:border-t-0 first:pt-0">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                  <DesignMark family={family} className="size-4 text-accent" />
                  {FAMILIES[family].label}
                </h2>
                <p className="text-xs text-muted">
                  {FAMILIES[family].blurb} · {items.length} designer
                  {items.length === 1 ? "" : "s"}
                </p>
              </div>

              <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((entry) => (
                  <li key={entry.id}>
                    <a
                      href={`#/${entry.id}`}
                      className="group flex h-full flex-col rounded-2xl border border-line bg-card p-4 transition hover:border-accent/50 hover:bg-accent-soft/25"
                    >
                      <span className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                        <span className="truncate">{entry.eyebrow}</span>
                        {entry.isNew && (
                          <span className="shrink-0 rounded bg-accent-soft px-1.5 py-px text-[9px] text-accent-strong">
                            New
                          </span>
                        )}
                      </span>
                      <span className="mt-2 text-[15px] font-semibold tracking-tight">
                        {entry.name}
                      </span>
                      <span className="mt-1 text-xs leading-relaxed text-muted">
                        {entry.blurb}
                      </span>
                      <span className="mt-2 flex-1 text-[11px] leading-relaxed text-muted/90">
                        <span className="font-semibold uppercase tracking-[0.1em] text-accent/80">
                          Use:{" "}
                        </span>
                        {entry.use}
                      </span>
                      <span className="mt-3 text-[11px] font-medium text-muted transition group-hover:text-accent">
                        Open designer →
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    </>
  );
}
