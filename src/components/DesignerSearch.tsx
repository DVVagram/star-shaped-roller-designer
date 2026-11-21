import { useEffect, useMemo, useRef, useState } from "react";

import { FAMILIES, type DesignFamily } from "@/lib/designs/types";

import type { CatalogEntry } from "./Catalog";

export default function DesignerSearch({
  entries,
  route,
}: {
  entries: readonly CatalogEntry[];
  route: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = entries.find((entry) => entry.id === route);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((entry) =>
      `${entry.name} ${entry.id} ${FAMILIES[entry.family].label} ${entry.blurb}`
        .toLowerCase()
        .includes(needle),
    );
  }, [entries, query]);

  const families = Object.keys(FAMILIES) as DesignFamily[];
  const grouped = families
    .map((family) => ({
      family,
      items: filtered.filter((entry) => entry.family === family),
    }))
    .filter((group) => group.items.length > 0);

  useEffect(() => {
    if (!open) return;
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
    setQuery("");
  }, [route]);

  useEffect(() => {
    if (!open) return;
    optionRefs.current[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function choose(id: string) {
    setOpen(false);
    setQuery("");
    window.location.hash = `#/${id}`;
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      window.setTimeout(() => triggerRef.current?.focus(), 0);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(filtered.length - 1, index + 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const choice = filtered[active];
      if (choice) choose(choice.id);
    }
  }

  let optionIndex = 0;

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1 sm:flex-none">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? "designer-options" : undefined}
        onClick={() => {
          setOpen((value) => !value);
          setQuery("");
          setActive(0);
        }}
        className="flex w-full min-w-0 items-center gap-1.5 rounded-md border border-line bg-card px-2 py-1 text-[11px] font-medium text-ink transition hover:bg-paper-deep sm:w-auto sm:max-w-[14rem]"
      >
        <svg viewBox="0 0 20 20" aria-hidden="true" className="size-3 shrink-0 text-muted">
          <circle cx="8.5" cy="8.5" r="5" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <path d="m12.4 12.4 4 4" fill="none" stroke="currentColor" strokeWidth="1.7" />
        </svg>
        <span className="truncate">{current?.name ?? "Search designers"}</span>
        <svg viewBox="0 0 20 20" aria-hidden="true" className="ml-auto size-3 shrink-0 text-muted">
          <path d="m5 8 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line bg-card shadow-[0_18px_50px_-20px_rgba(21,23,28,0.5)]">
          <div className="border-b border-line p-2">
            <label htmlFor="designer-search" className="sr-only">
              Search designers
            </label>
            <input
              ref={inputRef}
              id="designer-search"
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              aria-controls="designer-options"
              aria-activedescendant={
                filtered[active] ? `designer-option-${filtered[active].id}` : undefined
              }
              aria-autocomplete="list"
              placeholder={`Search ${entries.length} designers`}
              autoComplete="off"
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted focus:border-accent/60"
            />
          </div>
          <div
            id="designer-options"
            role="listbox"
            aria-label="Designers"
            className="max-h-[min(28rem,60vh)] overflow-y-auto p-1.5"
          >
            {filtered.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-muted">
                No designers match “{query.trim()}”.
              </p>
            )}
            {grouped.map((group) => (
              <div key={group.family}>
                <p className="px-2 pb-1 pt-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
                  {FAMILIES[group.family].label}
                </p>
                {group.items.map((entry) => {
                  const index = optionIndex;
                  optionIndex += 1;
                  const selected = index === active;
                  return (
                    <button
                      key={entry.id}
                      id={`designer-option-${entry.id}`}
                      ref={(node) => {
                        optionRefs.current[index] = node;
                      }}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      tabIndex={-1}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => choose(entry.id)}
                      className={
                        selected
                          ? "flex w-full items-baseline justify-between gap-3 rounded-lg bg-accent-soft px-2.5 py-1.5 text-left"
                          : "flex w-full items-baseline justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left hover:bg-paper-deep"
                      }
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-medium text-ink">
                          {entry.name}
                        </span>
                        <span className="block truncate text-[10px] text-muted">
                          {entry.blurb}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-[9px] text-muted">
                        #{entry.id}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
