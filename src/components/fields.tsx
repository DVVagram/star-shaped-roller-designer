export const inputBase =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 pr-16 text-[15px] text-ink shadow-[inset_0_1px_0_rgba(0,0,0,0.02)] outline-none transition focus:border-accent/60 aria-[invalid=true]:border-red-400 read-only:bg-paper-deep/50 read-only:text-muted";

export function NumberField({
  id,
  label,
  value,
  onChange,
  unit,
  hint,
  error,
  badge,
  readOnly,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange?: (value: string) => void;
  unit?: string;
  hint?: string;
  error?: string;
  badge?: string;
  readOnly?: boolean;
  disabled?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label
          htmlFor={id}
          className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted"
        >
          {label}
        </label>
        {badge && (
          <span className="rounded bg-accent-soft px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-accent-strong">
            {badge}
          </span>
        )}
      </div>
      <div className="relative">
        <input
          id={id}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          className={inputBase}
          inputMode="decimal"
          autoComplete="off"
          readOnly={readOnly}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        />
        {unit && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-muted">
            {unit}
          </span>
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-[11px] leading-snug text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-[11px] leading-snug text-muted/80">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; title?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex shrink-0 rounded-md border border-line bg-paper p-0.5"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={
              active
                ? "rounded bg-ink px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white"
                : "rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted transition hover:bg-paper-deep hover:text-ink"
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function OptionCards<T extends string>({
  label,
  value,
  options,
  columns = 2,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; description: string }[];
  columns?: 2 | 3;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={columns === 3 ? "grid gap-2 sm:grid-cols-3" : "grid gap-2 sm:grid-cols-2"}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={
              active
                ? "rounded-xl border border-accent/60 bg-accent-soft/70 px-3 py-2 text-left transition"
                : "rounded-xl border border-line bg-white px-3 py-2 text-left transition hover:border-line hover:bg-paper-deep/40"
            }
          >
            <span className="block text-[12px] font-semibold text-ink">
              {option.label}
            </span>
            <span className="mt-0.5 block text-[10px] leading-snug text-muted">
              {option.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function PresetButtons<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={
              active
                ? "rounded-lg border border-accent/60 bg-accent-soft/70 px-2 py-1.5 text-[11px] font-semibold text-accent-strong transition"
                : "rounded-lg border border-line bg-white px-2 py-1.5 text-[11px] font-medium text-muted transition hover:bg-paper-deep/40 hover:text-ink"
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <label
          htmlFor={id}
          className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted"
        >
          {label}
        </label>
        {hint && <p className="mt-0.5 text-[11px] leading-snug text-muted/80">{hint}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={
          checked
            ? "relative h-6 w-11 shrink-0 rounded-full bg-accent transition"
            : "relative h-6 w-11 shrink-0 rounded-full bg-line transition"
        }
      >
        <span
          aria-hidden="true"
          className={
            checked
              ? "absolute top-0.5 left-[1.4rem] size-5 rounded-full bg-white shadow transition"
              : "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition"
          }
        />
      </button>
    </div>
  );
}
