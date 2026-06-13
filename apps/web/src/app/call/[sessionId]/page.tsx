import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { SessionModel } from "@/models/Session";
import { CallScreen } from "@/components/video/CallScreen";
import { Logo } from "@/components/ui/Logo";
import { notFound } from "next/navigation";

export default async function CallPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  await connectDB();

  const session = await SessionModel.findById(sessionId).lean();
  if (!session) notFound();
  if (session.status === "ENDED") {
    return (
      <div className="bg-canvas flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-sm animate-fade-up rounded-lg border border-border bg-surface p-8 text-center elevation-2">
          <Logo size="md" className="justify-center" />
          <div className="mx-auto mt-6 flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-foreground">Session ended</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            This support session has been closed. Thanks for using SupportVision.
          </p>
          <a
            href="/"
            className="mt-6 inline-flex items-center justify-center rounded bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Go home
          </a>
        </div>
      </div>
    );
  }

  // Server session determines if user is an agent
  const serverSession = await getServerSession(authOptions);
  const agentSession = serverSession?.user;

  return (
    <CallScreen
      sessionId={sessionId}
      inviteToken={session.inviteToken}
      // Agent data if the user is logged in
      agentData={agentSession ? { name: agentSession.name, id: agentSession.id } : null}
    />
  );
}
