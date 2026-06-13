import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/models/User";
import { SessionModel } from "@/models/Session";
import { getKpisByAgent } from "@/lib/kpi";
import type { ApiResponse, TeamMember } from "@supportvision/types";

type AdminGuard =
  | { ok: true; session: { user: { id: string; name: string; role: string } } }
  | { ok: false; res: NextResponse<ApiResponse<never>> };

async function requireAdmin(): Promise<AdminGuard> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { ok: false, res: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role !== "ADMIN") {
    return { ok: false, res: NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 }) };
  }
  return { ok: true, session };
}

// List all agents (captains) with their session counts.
export async function GET(): Promise<NextResponse<ApiResponse<TeamMember[]>>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;

  await connectDB();
  const agents = await UserModel.find({ role: "AGENT" }).sort({ createdAt: -1 }).lean();

  const counts = await SessionModel.aggregate([
    { $group: { _id: "$agentId", count: { $sum: 1 } } },
  ]);
  const countMap = new Map<string, number>(counts.map((c: any) => [c._id, c.count]));

  const kpiMap = await getKpisByAgent(agents.map((a) => a._id.toString()));

  return NextResponse.json({
    success: true,
    data: agents.map((a) => ({
      _id: a._id.toString(),
      name: a.name,
      email: a.email,
      role: a.role,
      isActive: a.isActive ?? true,
      createdAt: (a as any).createdAt?.toISOString(),
      sessionCount: countMap.get(a._id.toString()) ?? 0,
      kpi: kpiMap.get(a._id.toString()),
    })),
  });
}

// Create a new agent (captain).
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<TeamMember>>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;

  const { name, email, password } = await req.json().catch(() => ({}));
  if (!name?.trim() || !email?.trim() || !password || password.length < 8) {
    return NextResponse.json(
      { success: false, error: "Name, email, and an 8+ char password are required" },
      { status: 400 }
    );
  }

  await connectDB();

  const existing = await UserModel.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return NextResponse.json({ success: false, error: "Email already in use" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);
  const agent = await UserModel.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: hashed,
    role: "AGENT",
    createdBy: guard.session.user.id,
    isActive: true,
  });

  return NextResponse.json({
    success: true,
    data: {
      _id: agent._id.toString(),
      name: agent.name,
      email: agent.email,
      role: agent.role,
      isActive: agent.isActive,
      createdAt: agent.createdAt.toISOString(),
      sessionCount: 0,
    },
  });
}
