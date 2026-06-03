import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-coral-bg text-coral">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
        <p className="text-[15px] font-semibold text-ink">Not found</p>
        <p className="max-w-md text-[13px] leading-relaxed text-muted">
          That page or brief doesn&apos;t exist.
        </p>
        <Link href="/" className="btn-primary mt-1">
          Back to Brief Engine
        </Link>
      </div>
    </div>
  );
}
