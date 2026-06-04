import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mx-auto w-full max-w-6xl px-6 pb-6">
      <div className="flex items-center gap-3 border-t border-line pt-4 text-[11px] text-muted">
        <span className="font-semibold text-body">SalesBuddy</span>
        <span>v0.1.0</span>
        <span className="text-line">·</span>
        <Link href="/help" className="transition-colors hover:text-coral hover:underline">
          Help
        </Link>
      </div>
    </footer>
  );
}
