import type { ReactNode } from "react";

export interface PageStep {
  number: string;
  title: string;
  body: string;
}

export interface DesignerPageProps {
  mark: ReactNode;
  eyebrow: string;
  title: ReactNode;
  lede: string;
  useCase: string;
  chips: readonly { label: string; value: string }[];
  builderTitle: string;
  builderLede: string;
  builderNote: string;
  steps: readonly PageStep[];
  checklist: readonly string[];
  notesTitle: string;
  notes: readonly string[];
  children: ReactNode;
}

/** The shared page shell: hero, builder slot, explainer and notes. */
export default function DesignerPage({
  mark,
  eyebrow,
  title,
  lede,
  useCase,
  chips,
  builderTitle,
  builderLede,
  builderNote,
  steps,
  checklist,
  notesTitle,
  notes,
  children,
}: DesignerPageProps) {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-6 sm:pt-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-end">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
              <span aria-hidden="true" className="text-accent">
                {mark}
              </span>
              {eyebrow}
            </p>
            <h1 className="mt-4 max-w-2xl text-[2.6rem] font-semibold leading-[1.03] tracking-tight sm:text-6xl">
              {title}
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted">{lede}</p>
            <p className="mt-4 flex max-w-xl gap-2 border-l-2 border-accent/60 pl-3 text-sm leading-relaxed text-ink">
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
                Use case
              </span>
              <span className="-ml-1">{useCase}</span>
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
      </section>

      <section
        id="builder"
        aria-label={builderTitle}
        className="mx-auto max-w-6xl px-4 pb-16 sm:px-6"
      >
        <div className="mb-5 flex flex-col gap-2 border-t border-line pt-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{builderTitle}</h2>
            <p className="mt-1 text-sm text-muted">{builderLede}</p>
          </div>
          <p className="max-w-sm text-xs leading-relaxed text-muted">{builderNote}</p>
        </div>

        {children}
      </section>

      <section
        id="how"
        aria-label="How it works"
        className="border-y border-line bg-paper-deep/50"
      >
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
    </>
  );
}
