"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Brief Engine" },
  { href: "/history", label: "History" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 flex h-[52px] shrink-0 items-center gap-6 border-b border-line bg-card px-6">
      {/* Wordmark */}
      <Link href="/" className="flex items-center gap-2">
        <span className="h-3.5 w-3.5 rounded-full bg-coral" />
        <span className="text-[15px] font-bold text-ink">SalesBuddy</span>
      </Link>

      <nav className="flex items-center gap-1">
        {LINKS.map(({ href, label }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`rounded-btn px-3 py-1.5 text-[13px] font-medium transition-colors ${
                active
                  ? "bg-coral-bg text-navy"
                  : "text-body hover:bg-page"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
