import Link from "next/link";
import type { Metadata } from "next";
import { Sparkles, ClipboardList, BarChart3, DollarSign, Settings as SettingsIcon } from "lucide-react";

export const metadata: Metadata = { title: "Help" };

const LINKS = [
  { icon: Sparkles, title: "Brief Engine", desc: "Paste a call to get an AE brief, coaching note, and follow-up email.", href: "/brief" },
  { icon: ClipboardList, title: "Coaching Digest", desc: "Per-rep coaching priorities and objection patterns.", href: "/digest" },
  { icon: BarChart3, title: "Pacing Calculator", desc: "Historicals, conversion rates, and goal pacing.", href: "/pacing" },
  { icon: DollarSign, title: "Commission Tracker", desc: "Commission, monthly recaps, and approvals.", href: "/commission" },
  { icon: SettingsIcon, title: "Settings", desc: "Your profile, quota, commission rule, and integrations.", href: "/settings" },
];

export default function HelpPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Help</h1>
        <p className="mt-1 text-[13px] text-muted">
          A quick orientation to SalesBuddy&apos;s tools. Full docs are on the way.
        </p>
      </header>
      <div className="space-y-3">
        {LINKS.map((l) => {
          const Icon = l.icon;
          return (
            <Link
              key={l.title}
              href={l.href}
              className="card flex items-start gap-3 p-4 transition-colors hover:border-coral/30"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral-bg text-coral">
                <Icon size={17} />
              </span>
              <span>
                <span className="block text-[14px] font-semibold text-ink">{l.title}</span>
                <span className="block text-[12px] text-muted">{l.desc}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
