import Link from "next/link";

// Default icon (inbox) — callers can override via the `icon` prop.
function InboxIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

export default function EmptyState({
  title,
  message,
  actionLabel,
  actionHref,
  icon,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-coral-bg text-coral">
        {icon ?? <InboxIcon />}
      </div>
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      <p className="max-w-sm text-[13px] leading-relaxed text-muted">{message}</p>
      {actionHref && actionLabel && (
        <Link href={actionHref} className="btn-primary mt-1">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
