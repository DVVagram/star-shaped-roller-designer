import type { ReactNode } from "react";

import type { DesignContract } from "@/lib/designs/contracts";
import { FAMILIES, type DesignFamily } from "@/lib/designs/types";

import CapabilityNotice from "./CapabilityNotice";

export interface PageStep {
  number: string;
  title: string;
  body: string;
}

export interface RelatedDesign {
  id: string;
  name: string;
  family: DesignFamily;
  blurb: string;
}

export interface DesignerPageProps {
  mark: ReactNode;
  eyebrow: string;
  title: ReactNode;
  lede: string;
  useCase: string;
  /** Capability label and limitations shown below the builder. */
  contract?: DesignContract;
  chips: readonly { label: string; value: string }[];
  builderNote: string;
  steps: readonly PageStep[];
  checklist: readonly string[];
  notesTitle: string;
  notes: readonly string[];
  related?: readonly RelatedDesign[];
  children: ReactNode;
}

/** The shared page shell: compact title, builder first, explanation below. */
export default function DesignerPage({
  mark,
  eyebrow,
  title,
  lede,
  useCase,
  contract,
  chips,
  builderNote,
  steps,
  checklist,
  notesTitle,
  notes,
  related = [],
  children,
}: DesignerPageProps) {
  return (
    <>
      <section
        id="builder"
        aria-label="Designer"
        className="mx-auto max-w-6xl px-4 pb-14 pt-7 sm:px-6 sm:pt-9"
      >
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
          <span aria-hidden="true" className="text-accent">
            {mark}
          </span>
          {eyebrow}
        </p>
        <h1 className="mt-2 max-w-3xl text-3xl font-semibold leading-[1.08] tracking-tight sm:text-4xl">
          {title}
        </h1>

        <div className="mt-6">{children}</div>
      </section>

      <section id="about" className="border-t border-line bg-paper-deep/50">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
            <div>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                About this designer
              </h2>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">{lede}</p>
              <div className="mt-4 max-w-xl border-l-2 border-accent/60 pl-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
                  Use case
                </p>
                <p id="use-case" className="mt-1 text-sm leading-relaxed text-ink">
                  {useCase}
                </p>
              </div>
              <p className="mt-4 max-w-xl text-xs leading-relaxed text-muted">
                <span className="font-semibold text-ink">Build notes: </span>
                {builderNote}
              </p>
            </div>

            <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-line bg-line text-xs">
              {chips.map((chip) => (
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
        </div>
      </section>

      <section id="how" className="border-y border-line bg-paper-deep/50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">How it works</h2>
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
              <h3 className="text-sm font-semibold">{notesTitle}</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                {checklist.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden="true" className="text-accent">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              {notes.map((paragraph, index) => (
                <p key={paragraph} className={index === 0 ? "text-sm leading-relaxed text-muted" : "mt-3 text-sm leading-relaxed text-muted"}>
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {contract && (
        <div className="pt-10">
          <CapabilityNotice contract={contract} />
        </div>
      )}

      {related.length > 0 && (
        <section className="border-t border-line bg-paper">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
                  Keep designing
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
                  Related designers
                </h2>
              </div>
              <a
                href="#/"
                className="text-xs font-medium text-muted underline decoration-line underline-offset-2 hover:text-ink"
              >
                All designers
              </a>
            </div>
            <ul className="mt-6 grid gap-3 sm:grid-cols-3">
              {related.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#/${item.id}`}
                    className="flex h-full flex-col rounded-2xl border border-line bg-card p-4 transition hover:border-accent/50 hover:bg-paper-deep/40"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                      {FAMILIES[item.family].label}
                    </span>
                    <span className="mt-1.5 text-sm font-semibold tracking-tight">
                      {item.name}
                    </span>
                    <span className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted">
                      {item.blurb}
                    </span>
                    <span className="mt-auto pt-3 text-[11px] font-semibold text-accent-strong">
                      Open designer →
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
