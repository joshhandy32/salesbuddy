"use client";

import { useState } from "react";
import type { UserProfile, CommissionModel } from "@/lib/profile";
import Spinner from "./Spinner";

const money = (v: number) =>
  v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="mb-4 text-[15px] font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export default function SettingsForm({
  initial,
  defaultWorkingDays,
  slackChannel,
  slackConnected,
}: {
  initial: UserProfile;
  defaultWorkingDays: number;
  slackChannel: string | null;
  slackConnected: boolean;
}) {
  const [form, setForm] = useState<UserProfile>({
    ...initial,
    workingDays: initial.workingDays ?? defaultWorkingDays,
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const [leaving, setLeaving] = useState(false);

  const set = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Bottom-right toast that fades out before unmounting (success ~2s total).
  function showToast(t: { text: string; ok: boolean }) {
    setToast(t);
    setLeaving(false);
    const hold = t.ok ? 1700 : 2600;
    window.setTimeout(() => setLeaving(true), hold);
    window.setTimeout(() => setToast(null), hold + 300);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      showToast({ text: "Settings saved ✓", ok: true });
    } catch {
      showToast({ text: "Couldn't save — try again.", ok: false });
    } finally {
      setSaving(false);
    }
  }

  const commissionPreview =
    form.commissionModel === "percent"
      ? `A ${money(10000)} deal = ${money((10000 * form.commissionRate) / 100)} commission (${form.commissionRate}%).`
      : `Each closed deal = ${money(form.flatBonus)} commission.`;

  return (
    <div className="space-y-6">
      {/* Profile */}
      <Section title="Your profile">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label-caps mb-1.5 block">Name</span>
            <input
              className="field"
              placeholder="e.g. Josh Handy"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </label>
          <label className="block">
            <span className="label-caps mb-1.5 block">Role</span>
            <select
              className="field"
              value={form.role}
              onChange={(e) => set("role", e.target.value as UserProfile["role"])}
            >
              <option value="BDR">BDR</option>
              <option value="AE">AE</option>
              <option value="Manager">Manager</option>
            </select>
          </label>
        </div>
      </Section>

      {/* Quota & tier */}
      <Section title="Quota & tier">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="label-caps mb-1.5 block">Monthly quota (completes)</span>
            <input
              type="number"
              min={0}
              className="field"
              value={form.quota}
              onChange={(e) => set("quota", Number(e.target.value) || 0)}
            />
          </label>
          <label className="block">
            <span className="label-caps mb-1.5 block">BDR tier</span>
            <select
              className="field"
              value={form.tier}
              onChange={(e) => set("tier", e.target.value as UserProfile["tier"])}
            >
              <option value="BDR1">BDR1</option>
              <option value="BDR2">BDR2</option>
              <option value="BDR3">BDR3</option>
              <option value="AE">AE</option>
            </select>
          </label>
          <label className="block">
            <span className="label-caps mb-1.5 block">Working days this month</span>
            <input
              type="number"
              min={0}
              className="field"
              value={form.workingDays ?? defaultWorkingDays}
              onChange={(e) => set("workingDays", Number(e.target.value) || 0)}
            />
            <button
              type="button"
              className="mt-1 text-[11px] text-link hover:underline"
              onClick={() => set("workingDays", defaultWorkingDays)}
            >
              Reset to auto ({defaultWorkingDays} weekdays)
            </button>
          </label>
        </div>
      </Section>

      {/* Commission rule */}
      <Section title="Commission rule">
        <div className="mb-4 inline-flex rounded-btn border border-line p-0.5">
          {(["percent", "flat"] as CommissionModel[]).map((m) => (
            <button
              key={m}
              onClick={() => set("commissionModel", m)}
              className={`rounded-btn px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                form.commissionModel === m ? "bg-coral text-white" : "text-body hover:bg-coral-bg/60"
              }`}
            >
              {m === "percent" ? "% of deal revenue" : "Flat bonus per deal"}
            </button>
          ))}
        </div>
        <div className="grid max-w-xs gap-4">
          {form.commissionModel === "percent" ? (
            <label className="block">
              <span className="label-caps mb-1.5 block">Commission rate</span>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  className="field"
                  value={form.commissionRate}
                  onChange={(e) => set("commissionRate", Number(e.target.value) || 0)}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted">
                  %
                </span>
              </div>
            </label>
          ) : (
            <label className="block">
              <span className="label-caps mb-1.5 block">Flat bonus per deal</span>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  step="50"
                  className="field"
                  value={form.flatBonus}
                  onChange={(e) => set("flatBonus", Number(e.target.value) || 0)}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted">
                  $
                </span>
              </div>
            </label>
          )}
        </div>
        <p className="mt-3 rounded-input bg-coral-bg px-3.5 py-2.5 text-[13px] font-medium text-coral-dark">
          {commissionPreview}
        </p>
      </Section>

      {/* Integrations */}
      <Section title="Integrations">
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-input border border-line px-4 py-3">
            <div>
              <p className="text-[13px] font-semibold text-ink">Slack</p>
              <p className="text-[12px] text-muted">
                Channel: <span className="font-mono">{slackChannel ?? "not set"}</span>
              </p>
            </div>
            <span className={`pill ${slackConnected ? "pill-success" : "pill-coral"}`}>
              {slackConnected ? "Connected" : "Not connected"}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-input border border-line px-4 py-3 opacity-70">
            <div>
              <p className="text-[13px] font-semibold text-ink">HubSpot</p>
              <p className="text-[12px] text-muted">Sync deals and contacts.</p>
            </div>
            <span className="pill">Coming soon</span>
          </div>
        </div>
      </Section>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? (
            <>
              <Spinner className="text-white" /> Saving…
            </>
          ) : (
            "Save settings"
          )}
        </button>
      </div>

      {toast && (
        <div
          className={`animate-toast fixed bottom-5 right-5 z-[70] rounded-input px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg transition-opacity duration-300 ${
            leaving ? "opacity-0" : "opacity-100"
          } ${toast.ok ? "bg-success" : "bg-coral-dark"}`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
