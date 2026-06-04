"use client";

import Link from "next/link";
import { Sparkles, Plus } from "lucide-react";

// The two header actions. Both are coral-outlined; "Generate a brief" carries
// the primary coral tint + hover underglow, "Log a demo set" opens the global
// demo modal (the Sidebar listens for sb:open-demo). Ink text (#101828) keeps
// the labels AA-legible — coral text on these light fills would fail 4.5:1.
const base =
  "home-focus inline-flex h-8 items-center gap-2 rounded-[4px] border border-[#eb7360] px-4 text-[14px] font-semibold text-[#101828] transition-[background-color,box-shadow] duration-150";

export default function HomeActions() {
  return (
    <div className="flex flex-wrap gap-2.5">
      <Link
        href="/brief"
        className={`${base} bg-[#fff3f0] hover:bg-[#ffe7e1] hover:shadow-[0_3px_2px_rgba(235,115,96,0.30)]`}
      >
        <Sparkles size={15} strokeWidth={2.2} className="text-[#eb7360]" />
        Generate a brief
      </Link>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("sb:open-demo"))}
        className={`${base} bg-white hover:bg-[#fff3f0]`}
      >
        <Plus size={15} strokeWidth={2.2} className="text-[#eb7360]" />
        Log a demo set
      </button>
    </div>
  );
}

// Coral text affordance that opens the demo modal (used in the Demo Activity
// card header and its empty state).
export function LogDemoTextLink({ label = "Log a demo →" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("sb:open-demo"))}
      className="home-focus rounded-[4px] text-[14px] font-medium text-[#eb7360] transition-colors duration-150 hover:text-[#d4533f]"
    >
      {label}
    </button>
  );
}
