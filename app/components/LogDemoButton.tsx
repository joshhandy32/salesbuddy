"use client";

import { Plus } from "lucide-react";

// Opens the global Log Demo Set modal (the Sidebar listens for this event).
export default function LogDemoButton({ className = "btn-secondary" }: { className?: string }) {
  return (
    <button className={className} onClick={() => window.dispatchEvent(new Event("sb:open-demo"))}>
      <Plus size={15} strokeWidth={2.2} /> Log a demo set
    </button>
  );
}
