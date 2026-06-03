"use client";

import { useState } from "react";

export default function StarRating({
  value,
  onChange,
  readOnly = false,
}: {
  value: number | null;
  onChange?: (rating: number) => void;
  readOnly?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => !readOnly && setHover(null)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className={readOnly ? "cursor-default" : "cursor-pointer"}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 20 20"
            fill={n <= shown ? "#EB7360" : "none"}
            stroke={n <= shown ? "#EB7360" : "#d1cec9"}
            strokeWidth="1.5"
          >
            <path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 14.9 4.7 17.6l1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
          </svg>
        </button>
      ))}
    </div>
  );
}
