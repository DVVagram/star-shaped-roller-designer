import type { DesignFamily } from "@/lib/designs/types";

/** One glyph per family, so a card can be recognised before it is read. */
export default function DesignMark({
  family,
  className = "",
}: {
  family: DesignFamily;
  className?: string;
}) {
  if (family === "drives") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
        <path
          d="M13 3h6l.8 3.2 3 1.7 3.1-1 3 5.2-2.4 2.2v3.4l2.4 2.2-3 5.2-3.1-1-3 1.7L19 29h-6l-.8-3.2-3-1.7-3.1 1-3-5.2 2.4-2.2v-3.4l-2.4-2.2 3-5.2 3.1 1 3-1.7Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="16" r="3.4" fill="none" stroke="currentColor" strokeWidth="2.4" />
      </svg>
    );
  }

  if (family === "wheels") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
        <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="2.4" />
        {[0, 72, 144, 216, 288].map((angle) => (
          <path
            key={angle}
            d="M16 16 L16 4.6"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            transform={`rotate(${angle} 16 16)`}
          />
        ))}
      </svg>
    );
  }

  if (family === "fixings") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
        <rect
          x="4"
          y="7"
          width="24"
          height="18"
          rx="3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
        />
        {[
          [10, 13],
          [22, 13],
          [10, 19],
          [22, 19],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.7" fill="currentColor" />
        ))}
      </svg>
    );
  }

  if (family === "vessels") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
        <path
          d="M7 5h18l-3 12a6 6 0 0 1-6 5 6 6 0 0 1-6-5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path d="M16 22v5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M11 27h10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <path
        d="M6 8c3.3 0 3.3 16 6.7 16S16 8 19.3 8s3.4 16 6.7 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path d="M6 8v-3M26 24v3" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
