import Link from "next/link";
import { Inbox } from "lucide-react";

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
      <div className="text-[#c4bdb8]">{icon ?? <Inbox size={46} strokeWidth={1.4} />}</div>
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
