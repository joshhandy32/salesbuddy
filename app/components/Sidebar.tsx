"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import DemoSetModal from "./DemoSetModal";
import Smiley from "./Smiley";
import {
  Home,
  FileText,
  History,
  GraduationCap,
  BarChart3,
  Target,
  Settings as SettingsIcon,
  DollarSign,
  Plus,
  LogOut,
  Search,
  Zap,
  BookOpen,
  Users,
  KanbanSquare,
  Building2,
} from "lucide-react";

// ── Tool icons (Lucide) ───────────────────────────────────────────────────
const ICON_MAP = {
  home: Home,
  blitz: Zap,
  brief: FileText,
  playbook: BookOpen,
  history: History,
  leads: Users,
  pipeline: KanbanSquare,
  accounts: Building2,
  coaching: GraduationCap,
  pacing: BarChart3,
  commission: DollarSign,
  icp: Target,
  settings: SettingsIcon,
} as const;
type IconName = keyof typeof ICON_MAP;

// ── Nav definition (icon + label only — no subtitles) ──────────────────────
type NavItem = { name: string; icon: IconName; href?: string; soon?: boolean };
type NavGroup = { label: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    label: "Sales rep tools",
    items: [
      { name: "Today", icon: "home", href: "/" },
      { name: "Call Blitz", icon: "blitz", href: "/blitz" },
      { name: "Brief Engine", icon: "brief", href: "/brief" },
      { name: "Playbook", icon: "playbook", href: "/playbook" },
      { name: "Brief History", icon: "history", href: "/history" },
    ],
  },
  {
    label: "CRM",
    items: [
      { name: "Leads & Prospecting", icon: "leads", href: "/leads" },
      { name: "Pipeline", icon: "pipeline", href: "/pipeline" },
      { name: "Accounts", icon: "accounts", href: "/accounts" },
    ],
  },
  {
    label: "Manager",
    items: [{ name: "Coaching Digest", icon: "coaching", href: "/digest" }],
  },
  {
    label: "Performance",
    items: [
      { name: "Pacing Calculator", icon: "pacing", href: "/pacing" },
      { name: "Commission Tracker", icon: "commission", href: "/commission" },
    ],
  },
  {
    label: "Intelligence",
    items: [{ name: "ICP Analyzer", icon: "icp", href: "/icp" }],
  },
  {
    label: "Settings",
    items: [{ name: "Settings", icon: "settings", href: "/settings" }],
  },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SB";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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
  const C = ICON_MAP[item.icon];
  const iconColor = active ? "#eb7360" : item.soon ? "#a7a7a7" : "#6a7282";

  const content = (
    <>
      {/* Signature active bar — sits on the sidebar's left outer edge. */}
      {active && <span className="absolute left-0 top-0 h-full w-[3px] bg-[#eb7360]" />}
      <span
        className={`relative mx-2 flex h-9 flex-1 items-center rounded-[4px] transition-colors duration-150 ${
          collapsed ? "justify-center px-0" : "gap-2.5 px-3"
        } ${active ? "bg-[#fff3f0]" : item.soon ? "" : "hover:bg-[#f9fafb]"}`}
      >
        <span className="shrink-0" style={{ color: iconColor }}>
          <C size={18} strokeWidth={1.5} />
        </span>
        {!collapsed && (
          <>
            <span
              className="min-w-0 flex-1 truncate text-[14px]"
              style={{
                color: active ? "#10171c" : item.soon ? "#a7a7a7" : "#505050",
                fontWeight: active ? 600 : 500,
              }}
            >
              {item.name}
            </span>
            {item.soon && (
              <span className="shrink-0 rounded-[4px] bg-[#f3f4f6] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-[#9ca3af]">
                Soon
              </span>
            )}
          </>
        )}
        {/* Collapsed tooltip — escapes to the right (nav overflow is visible when collapsed). */}
        {collapsed && (
          <span className="pointer-events-none absolute left-full top-1/2 z-[60] ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-[#10171c] px-2 py-1 text-[12px] font-medium text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100">
            {item.name}
            {item.soon ? " — Soon" : ""}
          </span>
        )}
      </span>
    </>
  );

  const base = "group relative flex w-full items-stretch";

  if (item.soon || !item.href) {
    return (
      <div className={`${base} cursor-default`} aria-disabled="true">
        {content}
      </div>
    );
  }

  return (
    <Link href={item.href} onClick={onNavigate} className={base}>
      {content}
    </Link>
  );
}

// ── Sidebar shell ───────────────────────────────────────────────────────────
export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [profile, setProfile] = useState<{ name: string; role: string }>({ name: "", role: "" });

  // Restore the persisted collapse preference after hydration. Reading
  // localStorage in a lazy initializer would diverge from the server render
  // (no localStorage on the server) and cause a hydration mismatch, so this
  // external-store sync legitimately belongs in an effect.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(localStorage.getItem("sb-sidebar-collapsed") === "true");
  }, []);

  useEffect(() => {
    const open = () => setDemoOpen(true);
    window.addEventListener("sb:open-demo", open);
    return () => window.removeEventListener("sb:open-demo", open);
  }, []);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((p) => p && setProfile({ name: p.name || "", role: p.role || "" }))
      .catch(() => {});
  }, []);

  const toggle = () =>
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("sb-sidebar-collapsed", String(next));
      return next;
    });

  const width = collapsed ? 56 : 280;
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-3 z-30 rounded-lg border border-[#e5e7eb] bg-white p-2 text-[#10171c] shadow-sm md:hidden"
        aria-label="Open menu"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        style={{ width, minWidth: width }}
        className={`fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-[#e5e7eb] bg-white transition-transform duration-200 md:static md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Logo / header */}
        <div
          className={`flex shrink-0 items-center px-3.5 pb-3 pt-4 ${
            collapsed ? "flex-col gap-3" : "gap-2.5"
          }`}
        >
          <Smiley size={32} className="shrink-0" />
          {!collapsed && (
            <span className="flex-1 truncate text-[16px] font-bold tracking-[-0.2px] text-[#101828]">
              SalesBuddy
            </span>
          )}
          <button
            onClick={toggle}
            className="hidden h-8 w-8 items-center justify-center rounded-md text-[#6a7282] transition-colors hover:bg-[#f9fafb] md:flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {collapsed ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
            </svg>
          </button>
          <button onClick={() => setMobileOpen(false)} className="text-[#99a1af] md:hidden" aria-label="Close menu">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search / command palette (⌘K) */}
        <div className="shrink-0 px-2 pb-1.5">
          <button
            onClick={() => window.dispatchEvent(new Event("sb:open-palette"))}
            className={`flex h-9 items-center rounded-[6px] border border-[#e5e7eb] text-[13px] text-[#6a7282] transition-colors duration-150 hover:bg-[#f9fafb] hover:text-[#10171c] ${
              collapsed ? "mx-auto w-9 justify-center px-0" : "w-full justify-between px-3"
            }`}
            title="Search (⌘K)"
            aria-label="Search"
          >
            <span className="flex items-center gap-2">
              <Search size={15} strokeWidth={1.8} />
              {!collapsed && <span>Search…</span>}
            </span>
            {!collapsed && (
              <kbd className="rounded-[4px] border border-[#e5e7eb] bg-[#f9fafb] px-1.5 py-0.5 text-[10px] font-semibold text-[#99a1af]">
                ⌘K
              </kbd>
            )}
          </button>
        </div>

        {/* Log Demo Set */}
        <div className="shrink-0 px-2 pb-2">
          <button
            onClick={() => setDemoOpen(true)}
            className={`flex h-9 items-center justify-center gap-2 rounded-[6px] bg-[#eb7360] text-[14px] font-semibold text-white transition-colors duration-150 hover:bg-[#e7604b] ${
              collapsed ? "mx-auto w-9 px-0" : "w-full"
            }`}
            title="Log Demo Set"
            aria-label="Log Demo Set"
          >
            <Plus size={16} strokeWidth={2.4} />
            {!collapsed && <span>Log Demo Set</span>}
          </button>
        </div>

        {/* Grouped nav */}
        <nav
          className={`flex-1 px-0 pb-3 ${
            collapsed ? "overflow-visible" : "overflow-y-auto overflow-x-hidden"
          }`}
        >
          {GROUPS.map((group) => (
            <div key={group.label} className="mb-0.5">
              {collapsed ? (
                <div className="mx-3 my-2 border-t border-[#f3f4f6]" />
              ) : (
                <p className="px-3 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#99a1af]">
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

        {/* User row */}
        <div className="shrink-0 border-t border-[#f3f4f6] px-2 pb-3 pt-2">
          <button
            className={`mb-1 flex items-center gap-1.5 rounded-[4px] px-2 py-1 text-[12px] text-[#99a1af] transition-colors duration-150 hover:text-[#10171c] ${
              collapsed ? "w-full justify-center" : ""
            }`}
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={14} strokeWidth={1.7} />
            {!collapsed && <span>Sign out</span>}
          </button>
          <div className={`flex items-center gap-2.5 px-1 ${collapsed ? "justify-center" : ""}`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eb7360] text-[12px] font-bold text-white">
              {initials(profile.name)}
            </span>
            {!collapsed && (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold capitalize text-[#101828]">
                  {profile.name?.trim() ? profile.name : "Your name"}
                </span>
                <span className="block truncate text-[12px] text-[#99a1af]">
                  {profile.role || "BDR"}
                </span>
              </span>
            )}
          </div>
        </div>
      </aside>

      {demoOpen && <DemoSetModal onClose={() => setDemoOpen(false)} />}
    </>
  );
}
