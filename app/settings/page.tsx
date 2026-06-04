import { prisma } from "@/lib/prisma";
import SettingsForm from "../components/SettingsForm";
import PageHeader from "../components/PageHeader";
import { getSlackChannelDisplay } from "@/lib/slack";
import { currentMonthWorkingDays, type UserProfile, type CommissionModel } from "@/lib/profile";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const row = await prisma.userProfile.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });

  const profile: UserProfile = {
    name: row.name,
    role: row.role as UserProfile["role"],
    quota: row.quota,
    tier: row.tier as UserProfile["tier"],
    workingDays: row.workingDays,
    commissionModel: row.commissionModel as CommissionModel,
    commissionRate: row.commissionRate,
    flatBonus: row.flatBonus,
  };

  const { display: slackChannel } = await getSlackChannelDisplay();
  const slackConnected = !!process.env.SLACK_BOT_TOKEN;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-8">
      <PageHeader
        title="Settings"
        subtitle="Your profile, targets, commission rule, and integrations."
      />

      <SettingsForm
        initial={profile}
        defaultWorkingDays={currentMonthWorkingDays()}
        slackChannel={slackChannel}
        slackConnected={slackConnected}
      />
    </main>
  );
}
