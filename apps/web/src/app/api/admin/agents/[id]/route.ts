import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/models/User";
import type { ApiResponse } from "@supportvision/types";

type AdminGuard =
  | { ok: true }
  | { ok: false; res: NextResponse<ApiResponse<never>> };

async function requireAdmin(): Promise<AdminGuard> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { ok: false, res: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role !== "ADMIN") {
    return { ok: false, res: NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 }) };
  }
  return { ok: true };
}

// Update an agent: name, password, or active state.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  await connectDB();

  const agent = await UserModel.findById(id);
  if (!agent || agent.role !== "AGENT") {
    return NextResponse.json({ success: false, error: "Agent not found" }, { status: 404 });
  }

  if (typeof body.name === "string" && body.name.trim()) agent.name = body.name.trim();
  if (typeof body.isActive === "boolean") agent.isActive = body.isActive;
  if (typeof body.password === "string" && body.password.length >= 8) {
    agent.password = await bcrypt.hash(body.password, 12);
  }

  await agent.save();
  return NextResponse.json({ success: true, data: null });
}

// Remove an agent.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;

  const { id } = await params;
  await connectDB();

  const agent = await UserModel.findById(id);
  if (!agent || agent.role !== "AGENT") {
    return NextResponse.json({ success: false, error: "Agent not found" }, { status: 404 });
  }

  await UserModel.findByIdAndDelete(id);
  return NextResponse.json({ success: true, data: null });
}
