import { connectDB } from "@/lib/db";
import { SessionModel } from "@/models/Session";
import { JoinClient } from "@/components/session/JoinClient";
import { notFound } from "next/navigation";

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await connectDB();

  const session = await SessionModel.findOne({ inviteToken: token }).lean();
  if (!session || session.status === "ENDED") notFound();

  return (
    <JoinClient
      sessionId={session._id.toString()}
      inviteToken={token}
      agentName={session.agentName}
      prefillName={session.customerName ?? ""}
    />
  );
}
