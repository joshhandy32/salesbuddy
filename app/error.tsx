"use client";

// Page-level error boundary. The root layout (sidebar) stays mounted, so a crash
// on one page shows this instead of taking down the whole app.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-coral-bg text-coral">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
        </div>
        <p className="text-[15px] font-semibold text-ink">Something went wrong</p>
        <p className="max-w-md text-[13px] leading-relaxed text-muted">
          This page hit an unexpected error. Your data is safe — try again.
        </p>
        <button className="btn-primary mt-1" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
