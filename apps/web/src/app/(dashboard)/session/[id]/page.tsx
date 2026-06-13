import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { SessionModel } from "@/models/Session";
import { ParticipantModel } from "@/models/Participant";
import { MessageModel } from "@/models/Message";
import { RecordingModel } from "@/models/Recording";
import { formatDuration } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import Link from "next/link";
import {
  ArrowLeft, Clock, PlayCircle, StopCircle, Download, FileText,
  Users, MessagesSquare, Disc, Paperclip,
  User as UserIcon, Phone as PhoneIcon,
} from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const serverSession = await getServerSession(authOptions);
  if (!serverSession?.user) redirect("/login");

  await connectDB();

  const session = await SessionModel.findById(id).lean();
  if (!session || session.agentId !== serverSession.user.id) notFound();

  const [participants, messages, recording] = await Promise.all([
    ParticipantModel.find({ sessionId: id }).sort({ joinedAt: 1 }).lean(),
    MessageModel.find({ sessionId: id }).sort({ createdAt: 1 }).limit(100).lean(),
    RecordingModel.findOne({ sessionId: id }).lean(),
  ]);

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const inviteUrl = `${baseUrl}/join/${session.inviteToken}`;
  const statusTone = session.status === "ACTIVE" ? "success" : session.status === "CREATED" ? "warning" : "neutral";

  return (
    <div className="bg-canvas min-h-screen">
      <AppNav agentName={serverSession.user.name} />

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sessions
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tighter text-foreground">
            {session.name ?? "Untitled session"}
          </h1>
          <Badge tone={statusTone as any} dot>{session.status}</Badge>
        </div>
        <p className="mt-1 font-mono text-xs text-subtle">{session._id.toString()}</p>

        {(session.customerName || session.customerPhone) && (
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {session.customerName && (
              <span className="flex items-center gap-1.5">
                <UserIcon className="h-4 w-4 text-accent" />
                {session.customerName}
              </span>
            )}
            {session.customerPhone && (
              <a
                href={`tel:${session.customerPhone}`}
                className="flex items-center gap-1.5 transition-colors hover:text-foreground"
              >
                <PhoneIcon className="h-4 w-4 text-accent" />
                {session.customerPhone}
              </a>
            )}
          </div>
        )}

        {/* Overview */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat icon={Clock} label="Duration" value={session.duration ? formatDuration(session.duration) : "—"} />
          <Stat icon={PlayCircle} label="Started" value={session.startedAt ? format(session.startedAt, "MMM d, h:mm a") : "—"} />
          <Stat icon={StopCircle} label="Ended" value={session.endedAt ? format(session.endedAt, "MMM d, h:mm a") : "—"} />
          <Stat icon={Users} label="Participants" value={String(participants.length)} />
        </div>

        {session.status !== "ENDED" && (
          <div className="mt-4 flex flex-col gap-3 rounded-lg border border-primary/25 bg-primary-soft/50 p-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-primary">Invite link</p>
              <p className="mt-0.5 truncate font-mono text-xs text-foreground">{inviteUrl}</p>
            </div>
            <Link
              href={`/call/${session._id.toString()}`}
              className="inline-flex items-center justify-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Rejoin call
            </Link>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Participants */}
          <section className="rounded-lg border border-border bg-surface p-5 elevation-1">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-foreground">
                Participants <span className="text-subtle">({participants.length})</span>
              </h2>
            </div>
            <div className="space-y-1">
              {participants.map((p) => (
                <div key={p._id.toString()} className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-surface-2">
                  <Avatar name={p.userName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{p.userName}</p>
                    <p className="text-[0.7rem] text-subtle">
                      joined {p.joinedAt ? format(p.joinedAt, "h:mm a") : "—"}
                    </p>
                  </div>
                  <Badge tone={p.role === "AGENT" ? "primary" : "accent"}>{p.role}</Badge>
                  {p.leftAt ? (
                    <span className="text-[0.7rem] text-subtle">
                      left {formatDistanceToNow(p.leftAt, { addSuffix: true })}
                    </span>
                  ) : (
                    <Badge tone="success" dot>Active</Badge>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Recording */}
          <section className="rounded-lg border border-border bg-surface p-5 elevation-1">
            <div className="mb-4 flex items-center gap-2">
              <Disc className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Recording</h2>
            </div>
            {!recording ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Disc className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm text-muted-foreground">No recording for this session</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge
                    tone={
                      recording.status === "READY" ? "success" :
                      recording.status === "PROCESSING" ? "warning" : "danger"
                    }
                    dot
                  >
                    {recording.status}
                  </Badge>
                  {recording.duration && (
                    <span className="text-sm text-muted-foreground">
                      {formatDuration(recording.duration)}
                    </span>
                  )}
                </div>
                {recording.status === "READY" && recording.recordingUrl && (
                  <a
                    href={recording.recordingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded border border-success/30 bg-success-soft px-4 py-2.5 text-sm font-medium text-success transition-colors hover:bg-success hover:text-white"
                  >
                    <Download className="h-4 w-4" />
                    Download recording
                  </a>
                )}
                {recording.status === "PROCESSING" && (
                  <p className="text-sm text-muted-foreground">
                    The recording is being processed and will be available shortly.
                  </p>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Chat transcript */}
        <section className="mt-5 rounded-lg border border-border bg-surface p-5 elevation-1">
          <div className="mb-4 flex items-center gap-2">
            <MessagesSquare className="h-4 w-4 text-[hsl(265_60%_55%)]" />
            <h2 className="text-sm font-semibold text-foreground">
              Chat transcript <span className="text-subtle">({messages.length})</span>
            </h2>
          </div>

          {messages.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No chat messages</p>
          ) : (
            <div className="max-h-96 space-y-4 overflow-y-auto pr-1">
              {messages.map((m) => (
                <div key={m._id.toString()} className="flex gap-3">
                  <Avatar name={m.sender} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{m.sender}</span>
                      <Badge tone={m.senderRole === "AGENT" ? "primary" : "accent"}>{m.senderRole}</Badge>
                      <span className="text-[0.7rem] text-subtle">
                        {m.createdAt ? format(new Date(m.createdAt), "h:mm a") : ""}
                      </span>
                    </div>
                    {m.type === "TEXT" ? (
                      <p className="mt-0.5 text-sm text-muted-foreground">{m.content}</p>
                    ) : (
                      <a
                        href={m.fileUrl ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
                      >
                        {m.type === "IMAGE" ? <FileText className="h-3.5 w-3.5" /> : <Paperclip className="h-3.5 w-3.5" />}
                        {m.fileName ?? "File"}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 elevation-1">
      <Icon className="mb-2 h-4 w-4 text-muted-foreground" />
      <p className="text-[0.7rem] font-medium uppercase tracking-wide text-subtle">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  );
}
