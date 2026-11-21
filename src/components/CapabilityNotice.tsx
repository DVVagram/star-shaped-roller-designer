import { CAPABILITIES, type DesignContract } from "@/lib/designs/contracts";

export function CapabilityBadge({
  capability,
  compact = false,
}: {
  capability: DesignContract["capability"];
  compact?: boolean;
}) {
  const meta = CAPABILITIES[capability];
  return (
    <span
      title={meta.description}
      className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.tone}`}
    >
      <span aria-hidden="true">●</span>
      <span className="truncate">{compact ? meta.short : meta.label}</span>
    </span>
  );
}

/** Capability, required mate and unverified properties, shown below the builder. */
export default function CapabilityNotice({ contract }: { contract: DesignContract }) {
  const meta = CAPABILITIES[contract.capability];
  return (
    <section
      id="capability"
      aria-labelledby="capability-heading"
      className="mx-auto max-w-6xl px-4 pb-10 sm:px-6"
    >
      <div className="rounded-2xl border border-line bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              Capability
            </p>
            <h2
              id="capability-heading"
              tabIndex={-1}
              className="mt-1 text-base font-semibold tracking-tight outline-none"
            >
              {meta.label}
            </h2>
          </div>
          <CapabilityBadge capability={contract.capability} />
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{meta.description}</p>

        <dl className="mt-4 grid gap-x-6 gap-y-3 text-xs sm:grid-cols-3">
          <div>
            <dt className="font-semibold uppercase tracking-[0.1em] text-muted">Standard</dt>
            <dd className="mt-0.5 leading-relaxed text-ink">{contract.standard}</dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-[0.1em] text-muted">Mating dimensions</dt>
            <dd className="mt-0.5 leading-relaxed text-ink">{contract.mating}</dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-[0.1em] text-muted">Fit allowance</dt>
            <dd className="mt-0.5 leading-relaxed text-ink">{contract.fitAllowance}</dd>
          </div>
        </dl>

        <div className="mt-4 grid gap-4 border-t border-line pt-4 text-xs sm:grid-cols-2">
          <div>
            <h3 className="font-semibold uppercase tracking-[0.1em] text-red-800">
              Limitations — read before making
            </h3>
            <ul className="mt-2 space-y-1.5 leading-relaxed text-muted">
              {contract.limitations.map((item) => (
                <li key={item} className="flex gap-1.5">
                  <span aria-hidden="true" className="text-red-700">
                    ▲
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold uppercase tracking-[0.1em] text-muted">
              What is not checked
            </h3>
            <ul className="mt-2 grid gap-1.5 leading-relaxed text-muted sm:grid-cols-2">
              {contract.notChecked.map((item) => (
                <li key={item} className="flex gap-1.5">
                  <span aria-hidden="true" className="text-muted/70">
                    ·
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 leading-relaxed text-muted/80">
              The app checks only mesh topology and overall dimensions. A watertight mesh is not
              a functional, fit or safety test.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
