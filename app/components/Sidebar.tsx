"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import DemoSetModal from "./DemoSetModal";

// ── Tool icons (inline SVG, lucide-style — no extra dependency) ───────────
type IconName =
  | "brief"
  | "history"
  | "coaching"
  | "pacing"
  | "icp"
  | "integrations"
  | "settings";

function Icon({ name, strokeWidth = 1.7 }: { name: IconName; strokeWidth?: number }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "brief":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8M8 17h8M8 9h2" />
        </svg>
      );
    case "history":
      return (
        <svg {...common}>
          <path d="M3 3v5h5" />
          <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
          <path d="M12 7v5l4 2" />
        </svg>
      );
    case "coaching":
      return (
        <svg {...common}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <path d="M8 9h8M8 13h5" />
        </svg>
      );
    case "pacing":
      return (
        <svg {...common}>
          <path d="M3 21h18" />
          <path d="M7 21V11M12 21V4M17 21v-7" />
        </svg>
      );
    case "icp":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.5" />
        </svg>
      );
    case "integrations":
      return (
        <svg {...common}>
          <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5" />
          <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
  }
}

// ── Nav definition ────────────────────────────────────────────────────────
type NavItem = {
  name: string;
  subtitle: string;
  icon: IconName;
  href?: string; // present only for built tools
  soon?: boolean;
};
type NavGroup = { label: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    label: "Sales rep tools",
    items: [
      {
        name: "Brief Engine",
        subtitle: "Paste a call, get the AE brief + BDR coaching note",
        icon: "brief",
        href: "/",
      },
      {
        name: "Brief History",
        subtitle: "Past briefs, ratings, and corrections",
        icon: "history",
        href: "/history",
      },
    ],
  },
  {
    label: "Manager",
    items: [
      {
        name: "Coaching Digest",
        subtitle: "One coaching priority per rep, weekly",
        icon: "coaching",
        href: "/digest",
      },
    ],
  },
  {
    label: "Performance",
    items: [
      {
        name: "Pacing & Commission",
        subtitle: "Quota pacing and commission tracking",
        icon: "pacing",
        href: "/pacing",
      },
    ],
  },
  {
    label: "Intelligence",
    items: [
      {
        name: "ICP Analyzer",
        subtitle: "What's actually converting, by persona and pattern",
        icon: "icp",
        soon: true,
      },
    ],
  },
  {
    label: "Settings",
    items: [
      {
        name: "Settings",
        subtitle: "Profile, quota, commission, integrations",
        icon: "settings",
        href: "/settings",
      },
    ],
  },
];

// ── Single nav row ──────────────────────────────────────────────────────────
function Row({
  item,
  collapsed,
  active,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  onNavigate: () => void;
}) {
  const iconColor = active
    ? "text-coral"
    : item.soon
      ? "text-muted"
      : "text-[#9ca3af]";

  const inner = (
    <>
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-coral" />
      )}
      <span className={`shrink-0 ${iconColor}`}>
        <Icon name={item.icon} strokeWidth={active ? 2.1 : 1.7} />
      </span>
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1">
            <span
              className={`block truncate text-[12.6px] leading-tight ${
                active ? "font-semibold text-ink" : "text-ink/90"
              }`}
            >
              {item.name}
            </span>
            <span className="mt-0.5 block truncate text-[10.5px] leading-tight text-muted">
              {item.subtitle}
            </span>
          </span>
          {item.soon && (
            <span className="shrink-0 self-center rounded-btn bg-line/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted">
              Soon
            </span>
          )}
        </>
      )}
    </>
  );

  const base = `group relative flex items-center gap-2.5 rounded-btn px-2.5 py-2 min-h-[44px] transition-colors ${
    collapsed ? "justify-center" : ""
  }`;

  // Unbuilt tools: not clickable.
  if (item.soon || !item.href) {
    return (
      <div
        className={`${base} cursor-default`}
        aria-disabled="true"
        title={collapsed ? `${item.name} — Soon` : undefined}
      >
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.name : undefined}
      className={`${base} ${active ? "bg-coral-bg" : "hover:bg-coral-bg/60"}`}
    >
      {inner}
    </Link>
  );
}

// ── Sidebar shell ───────────────────────────────────────────────────────────
export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

  // Restore collapse preference (client-only, avoids hydration mismatch).
  useEffect(() => {
    setCollapsed(localStorage.getItem("sb-sidebar-collapsed") === "true");
  }, []);

  const toggle = () =>
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("sb-sidebar-collapsed", String(next));
      return next;
    });

  const width = collapsed ? 64 : 256;
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-3 z-30 rounded-lg border border-line bg-card p-2 text-ink shadow-sm md:hidden"
        aria-label="Open menu"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        style={{ width, minWidth: width }}
        className={`fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-line bg-card transition-transform duration-200 md:static md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Header */}
        <div
          className={`flex shrink-0 items-center gap-2 px-3.5 pb-2.5 pt-3.5 ${
            collapsed ? "flex-col" : ""
          }`}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-coral text-[15px] font-extrabold text-white">
            S
          </div>
          {!collapsed && (
            <span className="flex-1 truncate text-[15px] font-extrabold tracking-[-0.4px] text-ink">
              SalesBuddy
            </span>
          )}
          <button
            onClick={toggle}
            className="hidden h-8 w-8 items-center justify-center rounded-lg text-body transition-colors hover:bg-coral-bg md:flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {collapsed ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
            </svg>
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="text-muted md:hidden"
            aria-label="Close menu"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Log Demo Set — visible on every page */}
        <div className="shrink-0 px-2 pb-2">
          <button
            onClick={() => setDemoOpen(true)}
            className={`btn-primary ${collapsed ? "h-9 w-9 !px-0" : "w-full"}`}
            title="Log Demo Set"
            aria-label="Log Demo Set"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {!collapsed && <span>Log Demo Set</span>}
          </button>
        </div>

        {/* Grouped nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-3">
          {GROUPS.map((group) => (
            <div key={group.label} className="mb-0.5">
              {collapsed ? (
                <div className="mx-2 my-2 border-t border-line/70" />
              ) : (
                <p className="px-2.5 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.09em] text-muted">
                  {group.label}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <Row
                    key={item.name}
                    item={item}
                    collapsed={collapsed}
                    active={!!item.href && isActive(item.href)}
                    onNavigate={() => setMobileOpen(false)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {demoOpen && <DemoSetModal onClose={() => setDemoOpen(false)} />}
    </>
  );
}
