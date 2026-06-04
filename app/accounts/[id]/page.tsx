import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DEAL_STAGE_LABEL, LEAD_STATUS_LABEL, isWon, isOpenStage, money } from "@/lib/crm";
import { ArrowLeft, Building2, Globe, Users, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await prisma.account.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: { createdAt: "desc" } },
      deals: { orderBy: { updatedAt: "desc" } },
    },
  });
  if (!account) notFound();

  const openValue = account.deals
    .filter((d) => isOpenStage(d.stage))
    .reduce((s, d) => s + d.amount, 0);
  const wonValue = account.deals.filter((d) => isWon(d.stage)).reduce((s, d) => s + d.amount, 0);

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-8">
      <Link href="/accounts" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft size={15} /> All accounts
      </Link>

      <header className="card mb-5 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] bg-coral-bg text-coral">
            <Building2 size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-ink">{account.name}</h1>
            <p className="mt-0.5 text-[13px] text-muted">
              {[account.industry, account.size && `${account.size} employees`, account.ownerName && `Owner: ${account.ownerName}`]
                .filter(Boolean)
                .join(" · ") || "No details yet"}
            </p>
            {account.website && (
              <a
                href={account.website.startsWith("http") ? account.website : `https://${account.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-medium text-link hover:underline"
              >
                <Globe size={13} /> {account.website}
              </a>
            )}
          </div>
          <div className="hidden gap-5 sm:flex">
            <Metric label="Open value" value={money(openValue)} />
            <Metric label="Won" value={money(wonValue)} />
          </div>
        </div>
        {account.notes && (
          <p className="mt-4 rounded-input bg-page/60 px-3.5 py-2.5 text-[13px] leading-relaxed text-body">
            {account.notes}
          </p>
        )}
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Contacts */}
        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-ink">
            <Users size={16} className="text-muted" /> Contacts ({account.contacts.length})
          </h2>
          {account.contacts.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-muted">No contacts on this account yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {account.contacts.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/contacts/${c.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:bg-page/60"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-medium text-ink">{c.name}</div>
                      {c.title && <div className="text-[12px] text-muted">{c.title}</div>}
                    </div>
                    <span className="pill shrink-0">{LEAD_STATUS_LABEL[c.status] ?? c.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Deals */}
        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-ink">
            <TrendingUp size={16} className="text-muted" /> Deals ({account.deals.length})
          </h2>
          {account.deals.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-muted">No deals on this account yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {account.deals.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-medium text-ink">{d.name}</div>
                    <div className="text-[12px] text-muted">{money(d.amount)}</div>
                  </div>
                  <span
                    className={`pill shrink-0 ${
                      isWon(d.stage) ? "pill-teal" : d.stage === "CLOSED_LOST" ? "pill-coral" : ""
                    }`}
                  >
                    {DEAL_STAGE_LABEL[d.stage] ?? d.stage}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <div className="label-caps">{label}</div>
      <div className="text-[18px] font-bold text-ink">{value}</div>
    </div>
  );
}
