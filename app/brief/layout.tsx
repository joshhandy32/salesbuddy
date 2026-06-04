import type { Metadata } from "next";

export const metadata: Metadata = { title: "Brief Engine" };

export default function BriefLayout({ children }: { children: React.ReactNode }) {
  return children;
}
