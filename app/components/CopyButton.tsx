"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

// Small copy-to-clipboard control used in the brief card headers. Shows a brief
// "Copied" confirmation, falls back gracefully if the clipboard API is blocked.
export default function CopyButton({
  text,
  label = "Copy",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for older / non-secure contexts.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* give up silently */
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex items-center gap-1.5 rounded-[4px] px-2 py-1 text-[12px] font-medium transition-colors ${
        copied ? "text-teal-ink" : "text-muted hover:text-ink"
      }`}
      aria-label={copied ? "Copied" : label}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "Copied" : label}
    </button>
  );
}
