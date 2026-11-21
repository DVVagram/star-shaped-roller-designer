import { useMemo, useState } from "react";

import {
  CAPABILITIES,
  type CapabilityId,
  type DesignContract,
} from "@/lib/designs/contracts";
import { FAMILIES, type DesignFamily } from "@/lib/designs/types";

import { CapabilityBadge } from "./CapabilityNotice";
import DesignMark from "./DesignMark";

export interface CatalogEntry {
  id: string;
  name: string;
  family: DesignFamily;
  eyebrow: string;
  blurb: string;
  use: string;
  isNew: boolean;
  contract: DesignContract;
}

const CAPABILITY_ORDER: CapabilityId[] = ["fit", "shape", "unsafe", "functional"];

export default function Catalog({ entries }: { entries: CatalogEntry[] }) {
  const families = Object.keys(FAMILIES) as DesignFamily[];
  const added = entries.filter((entry) => entry.isNew).length;

  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<DesignFamily | "all">("all");
  const [capability, setCapability] = useState<CapabilityId | "all">("all");

  const capabilityCounts = useMemo(() => {
    const counts = new Map<CapabilityId, number>();
    for (const entry of entries) {
      counts.set(entry.contract.capability, (counts.get(entry.contract.capability) ?? 0) + 1);
    }
    return counts;
  }, [entries]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (family !== "all" && entry.family !== family) return false;
      if (capability !== "all" && entry.contract.capability !== capability) return false;
      if (!needle) return true;
      return [entry.name, entry.id, entry.blurb, entry.use, entry.eyebrow]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [entries, query, family, capability]);

  const visibleFamilies = families.filter((item) =>
    filtered.some((entry) => entry.family === item),
  );
  const activeFilter = query.trim() !== "" || family !== "all" || capability !== "all";

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-8 pt-10 sm:px-6 sm:pt-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
              Parametric Wheel Works · the full library
            </p>
            <h1 className="mt-4 max-w-2xl text-[2.6rem] font-semibold leading-[1.03] tracking-tight sm:text-6xl">
              {entries.length} parts,
              <br />
              built to measure.
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted">
              Gears, pulleys, plates, vessels, springs, labware and workshop fixtures — each
              generated from the numbers you type. Every card states its capability: a checked
              shape, a fit prototype or a high-risk use the physical part must not serve.
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

      <section aria-label="Filter designers" className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <div className="grid gap-3 rounded-2xl border border-line bg-card p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-end">
          <div>
            <label
              htmlFor="catalog-search"
              className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted"
            >
              Search
            </label>
            <input
              id="catalog-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, use or id…"
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-accent/60"
            />
          </div>
          <div>
            <label
              htmlFor="catalog-family"
              className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted"
            >
              Family
            </label>
            <select
              id="catalog-family"
              value={family}
              onChange={(event) => setFamily(event.target.value as DesignFamily | "all")}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
            >
              <option value="all">All families</option>
              {families.map((item) => (
                <option key={item} value={item}>
                  {FAMILIES[item].label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="catalog-capability"
              className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted"
            >
              Capability
            </label>
            <select
              id="catalog-capability"
              value={capability}
              onChange={(event) =>
                setCapability(event.target.value as CapabilityId | "all")
              }
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
            >
              <option value="all">All capabilities</option>
              {CAPABILITY_ORDER.filter((item) => (capabilityCounts.get(item) ?? 0) > 0).map(
                (item) => (
                  <option key={item} value={item}>
                    {CAPABILITIES[item].label} ({capabilityCounts.get(item)})
                  </option>
                ),
              )}
            </select>
          </div>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setFamily("all");
              setCapability("all");
            }}
            disabled={!activeFilter}
            className="rounded-lg border border-line bg-white px-3 py-2 text-[11px] font-medium text-muted transition hover:bg-paper-deep hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear
          </button>
        </div>
        <p aria-live="polite" className="mt-2 text-xs text-muted">
          {filtered.length} designer{filtered.length === 1 ? "" : "s"}
          {activeFilter ? " matching" : " in the library"}. Capability labels describe verified
          scope, not formability alone.
        </p>
      </section>

      <section aria-label="All designers" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-line bg-card p-8 text-center">
            <p className="text-sm font-semibold">No designers match those filters.</p>
            <p className="mt-1 text-xs text-muted">
              Try a shorter search or clear the family and capability filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFamily("all");
                setCapability("all");
              }}
              className="mt-4 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white"
            >
              Show all {entries.length}
            </button>
          </div>
        )}

        {visibleFamilies.map((visibleFamily) => {
          const items = filtered.filter((entry) => entry.family === visibleFamily);
          return (
            <div
              key={visibleFamily}
              className="border-t border-line pt-8 pb-10 first:border-t-0 first:pt-0"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                  <DesignMark family={visibleFamily} className="size-4 text-accent" />
                  {FAMILIES[visibleFamily].label}
                </h2>
                <p className="text-xs text-muted">
                  {FAMILIES[visibleFamily].blurb} · {items.length} designer
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
                      <span className="mt-2 flex flex-1 flex-col gap-1.5">
                        <CapabilityBadge capability={entry.contract.capability} compact />
                        <span className="text-[11px] leading-relaxed text-muted/90">
                          <span className="font-semibold uppercase tracking-[0.1em] text-accent/80">
                            Use:{" "}
                          </span>
                          {entry.use}
                        </span>
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
