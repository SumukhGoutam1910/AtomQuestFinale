import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { SessionModel } from "@/models/Session";
import { UserModel } from "@/models/User";
import { getKpisByAgent, emptyKpi } from "@/lib/kpi";
import { DashboardClient } from "@/components/session/DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  await connectDB();

  const isAdmin = session.user.role === "ADMIN";

  // Admins see all sessions; agents see only the ones assigned to them.
  const query = isAdmin ? {} : { agentId: session.user.id };
  const sessions = await SessionModel.find(query)
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const serialized = sessions.map((s) => ({
    _id: s._id.toString(),
    name: s.name ?? "Untitled session",
    customerName: s.customerName ?? "",
    customerPhone: s.customerPhone ?? "",
    agentId: s.agentId,
    agentName: s.agentName,
    createdById: s.createdById ?? "",
    createdByName: s.createdByName ?? "",
    inviteToken: s.inviteToken,
    status: s.status,
    startedAt: s.startedAt?.toISOString() ?? null,
    endedAt: s.endedAt?.toISOString() ?? null,
    duration: s.duration ?? null,
    createdAt: (s as any).createdAt?.toISOString(),
  }));

  // Admins get the roster of agents to assign sessions to.
  const agents = isAdmin
    ? (await UserModel.find({ role: "AGENT" }).sort({ name: 1 }).lean()).map((a) => ({
        _id: a._id.toString(),
        name: a.name,
        email: a.email,
      }))
    : [];

  // Agents see their own KPI on the dashboard.
  const kpi = isAdmin
    ? null
    : (await getKpisByAgent([session.user.id])).get(session.user.id) ??
      emptyKpi(session.user.id, session.user.name);

  return (
    <DashboardClient
      agentName={session.user.name}
      agentId={session.user.id}
      role={session.user.role}
      initialSessions={serialized}
      agents={agents}
      kpi={kpi}
    />
  );
}
