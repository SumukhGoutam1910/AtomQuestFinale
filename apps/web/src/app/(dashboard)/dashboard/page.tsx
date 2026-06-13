import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { SessionModel } from "@/models/Session";
import { DashboardClient } from "@/components/session/DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  await connectDB();

  const sessions = await SessionModel.find({ agentId: session.user.id })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const serialized = sessions.map((s) => ({
    _id: s._id.toString(),
    name: s.name ?? "Untitled session",
    customerName: s.customerName ?? "",
    customerPhone: s.customerPhone ?? "",
    agentId: s.agentId,
    agentName: s.agentName,
    inviteToken: s.inviteToken,
    status: s.status,
    startedAt: s.startedAt?.toISOString() ?? null,
    endedAt: s.endedAt?.toISOString() ?? null,
    duration: s.duration ?? null,
    createdAt: (s as any).createdAt?.toISOString(),
  }));

  return (
    <DashboardClient
      agentName={session.user.name}
      agentId={session.user.id}
      initialSessions={serialized}
    />
  );
}
