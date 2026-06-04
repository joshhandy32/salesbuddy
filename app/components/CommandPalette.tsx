"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  FileText,
  Plus,
  Home,
  History,
  GraduationCap,
  BarChart3,
  DollarSign,
  Target,
  Settings as SettingsIcon,
  CornerDownLeft,
  CalendarCheck2,
  Zap,
  BookOpen,
  Users,
  KanbanSquare,
  Building2,
  Send,
  LineChart,
  CheckSquare,
} from "lucide-react";

// ── Item model ───────────────────────────────────────────────────────────────
type Item = {
  id: string;
  label: string;
  sub?: string;
  group: string;
  Icon: typeof Home;
  /** Extra text folded into search matching. */
  haystack?: string;
  run: () => void;
};

type SearchPayload = {
  briefs: { id: string; title: string; subtitle: string; haystack: string }[];
  demos: { id: string; title: string; subtitle: string; haystack: string }[];
};

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [data, setData] = useState<SearchPayload | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  // ── Global ⌘K / Ctrl+K toggle ──────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("sb:open-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("sb:open-palette", onOpen);
    };
  }, []);

  // Fetch the lightweight index the first time the palette opens, and refresh
  // each open so newly created briefs/demos show up.
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    fetch("/api/search")
      .then((r) => r.json())
      .then((d: SearchPayload) => setData(d))
      .catch(() => {});
  }, [open]);

  // ── Static navigation + quick actions ──────────────────────────────────────
  const navItems = useMemo<Item[]>(() => {
    const go = (href: string) => () => {
      router.push(href);
      close();
    };
    return [
      {
        id: "act-brief",
        label: "New brief",
        sub: "Generate an AE brief",
        group: "Actions",
        Icon: Plus,
        run: go("/brief"),
      },
      {
        id: "act-demo",
        label: "Log demo set",
        sub: "Open the log demo modal",
        group: "Actions",
        Icon: CalendarCheck2,
        run: () => {
          window.dispatchEvent(new Event("sb:open-demo"));
          close();
        },
      },
      { id: "nav-home", label: "Today", group: "Go to", Icon: Home, run: go("/") },
      { id: "nav-tasks", label: "Tasks & Follow-ups", group: "Go to", Icon: CheckSquare, run: go("/tasks") },
      { id: "nav-blitz", label: "Call Blitz", group: "Go to", Icon: Zap, run: go("/blitz") },
      { id: "nav-brief", label: "Brief Engine", group: "Go to", Icon: FileText, run: go("/brief") },
      { id: "nav-playbook", label: "Playbook", group: "Go to", Icon: BookOpen, run: go("/playbook") },
      { id: "nav-leads", label: "Leads & Prospecting", group: "Go to", Icon: Users, run: go("/leads") },
      { id: "nav-pipeline", label: "Pipeline", group: "Go to", Icon: KanbanSquare, run: go("/pipeline") },
      { id: "nav-forecast", label: "Forecast", group: "Go to", Icon: LineChart, run: go("/forecast") },
      { id: "nav-accounts", label: "Accounts", group: "Go to", Icon: Building2, run: go("/accounts") },
      { id: "nav-outreach", label: "Email Outreach", group: "Go to", Icon: Send, run: go("/outreach") },
      { id: "nav-history", label: "Brief History", group: "Go to", Icon: History, run: go("/history") },
      { id: "nav-digest", label: "Coaching Digest", group: "Go to", Icon: GraduationCap, run: go("/digest") },
      { id: "nav-pacing", label: "Pacing Calculator", group: "Go to", Icon: BarChart3, run: go("/pacing") },
      { id: "nav-commission", label: "Commission Tracker", group: "Go to", Icon: DollarSign, run: go("/commission") },
      { id: "nav-icp", label: "ICP Analyzer", group: "Go to", Icon: Target, run: go("/icp") },
      { id: "nav-settings", label: "Settings", group: "Go to", Icon: SettingsIcon, run: go("/settings") },
    ];
  }, [router, close]);

  // ── Search results from the index ──────────────────────────────────────────
  const resultItems = useMemo<Item[]>(() => {
    if (!data) return [];
    const briefs: Item[] = data.briefs.map((b) => ({
      id: `brief-${b.id}`,
      label: b.title,
      sub: b.subtitle,
      group: "Briefs",
      Icon: FileText,
      haystack: b.haystack,
      run: () => {
        router.push(`/history/${b.id}`);
        close();
      },
    }));
    const demos: Item[] = data.demos.map((d) => ({
      id: `demo-${d.id}`,
      label: d.title,
      sub: d.subtitle,
      group: "Demos",
      Icon: CalendarCheck2,
      haystack: d.haystack,
      run: () => {
        router.push("/commission");
        close();
      },
    }));
    return [...briefs, ...demos];
  }, [data, router, close]);

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
    const all = [...navItems, ...resultItems];
    if (!q) {
      // No query: show actions + nav, plus a few recent briefs/demos for context.
      return [...navItems, ...resultItems.slice(0, 5)];
    }
    const match = (it: Item) =>
      (it.label + " " + (it.sub ?? "") + " " + (it.haystack ?? "")).toLowerCase().includes(q);
    return all.filter(match).slice(0, 40);
  }, [query, navItems, resultItems]);

  // Derive a safe, in-range active index instead of clamping via an effect, so
  // the highlight stays valid even as the result list grows or shrinks.
  const activeIdx = filtered.length === 0 ? 0 : Math.min(active, filtered.length - 1);

  // ── Grouping for display ───────────────────────────────────────────────────
  const groups = useMemo(() => {
    const order = ["Actions", "Go to", "Briefs", "Demos"];
    const byGroup = new Map<string, { item: Item; index: number }[]>();
    filtered.forEach((item, index) => {
      if (!byGroup.has(item.group)) byGroup.set(item.group, []);
      byGroup.get(item.group)!.push({ item, index });
    });
    return order
      .filter((g) => byGroup.has(g))
      .map((g) => ({ group: g, items: byGroup.get(g)! }));
  }, [filtered]);

  // ── Keyboard nav within the palette ────────────────────────────────────────
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((activeIdx + 1) % Math.max(filtered.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((activeIdx - 1 + filtered.length) % Math.max(filtered.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[activeIdx]?.run();
    }
  }

  // Scroll the active row into view.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-black/30 p-4 pt-[12vh]"
      onClick={close}
    >
      <div
        className="card w-full max-w-xl overflow-hidden p-0 animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <Search size={17} className="shrink-0 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search briefs, demos, or jump to a page…"
            className="h-12 w-full border-0 bg-transparent text-[14px] text-ink outline-none placeholder:text-muted"
            style={{ boxShadow: "none" }}
          />
          <kbd className="hidden shrink-0 rounded-[4px] border border-line bg-page px-1.5 py-0.5 text-[10px] font-semibold text-muted sm:block">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px] text-muted">
              No matches for “{query}”.
            </p>
          ) : (
            groups.map(({ group, items }) => (
              <div key={group} className="mb-1">
                <div className="label-caps px-4 pb-1 pt-2">{group}</div>
                {items.map(({ item, index }) => {
                  const isActive = index === activeIdx;
                  const I = item.Icon;
                  return (
                    <button
                      key={item.id}
                      data-idx={index}
                      onMouseMove={() => setActive(index)}
                      onClick={item.run}
                      className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors ${
                        isActive ? "bg-coral-bg" : "hover:bg-page"
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] ${
                          isActive ? "bg-white text-coral" : "bg-page text-muted"
                        }`}
                      >
                        <I size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium text-ink">
                          {item.label}
                        </span>
                        {item.sub && (
                          <span className="block truncate text-[12px] capitalize text-muted">
                            {item.sub}
                          </span>
                        )}
                      </span>
                      {isActive && (
                        <CornerDownLeft size={14} className="shrink-0 text-muted" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[11px] text-muted">
          <span className="flex items-center gap-1.5">
            <kbd className="rounded-[3px] border border-line bg-page px-1">↑</kbd>
            <kbd className="rounded-[3px] border border-line bg-page px-1">↓</kbd>
            to navigate
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded-[3px] border border-line bg-page px-1">↵</kbd>
            to select
          </span>
        </div>
      </div>
    </div>
  );
}
