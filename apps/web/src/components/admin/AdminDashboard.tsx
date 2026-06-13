"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import {
  Radio, Users, CalendarDays, MessageSquare, Disc,
  PhoneOff, RefreshCw, Activity,
} from "lucide-react";
import { formatDuration } from "@/lib/utils";
import { AppNav } from "@/components/AppNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import type { SystemMetrics } from "@supportvision/types";

export function AdminDashboard({ agentName }: { agentName: string }) {
  const queryClient = useQueryClient();

  const { data: metrics } = useQuery<SystemMetrics>({
    queryKey: ["admin-metrics"],
    queryFn: async () => (await axios.get("/api/admin/metrics")).data.data,
    refetchInterval: 10_000,
  });

  const { data: activeSessions = [], isLoading } = useQuery<any[]>({
    queryKey: ["admin-sessions", "active"],
    queryFn: async () =>
      (await axios.get("/api/admin/sessions?status=ACTIVE")).data.data,
    refetchInterval: 5_000,
  });

  const { data: historySessions = [] } = useQuery<any[]>({
    queryKey: ["admin-sessions", "ended"],
    queryFn: async () =>
      (await axios.get("/api/admin/sessions?status=ENDED&limit=20")).data.data,
  });

  const endSession = useMutation({
    mutationFn: async (sessionId: string) => {
      await axios.post(`${process.env.NEXT_PUBLIC_MEDIA_SERVER_URL}/admin/sessions/${sessionId}/end`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sessions"] });
      toast.success("Session ended");
    },
    onError: () => toast.error("Failed to end session"),
  });

  const stats = [
    { label: "Active sessions", value: metrics?.activeSessions ?? 0, icon: Radio, tone: "text-success", soft: "bg-success-soft" },
    { label: "Connected users", value: metrics?.connectedParticipants ?? 0, icon: Users, tone: "text-accent", soft: "bg-accent-soft" },
    { label: "Sessions today", value: metrics?.totalSessionsToday ?? 0, icon: CalendarDays, tone: "text-primary", soft: "bg-primary-soft" },
    { label: "Messages today", value: metrics?.totalMessagesToday ?? 0, icon: MessageSquare, tone: "text-[hsl(265_60%_55%)]", soft: "bg-[hsl(265_100%_97%)]" },
    { label: "Recordings", value: metrics?.totalRecordings ?? 0, icon: Disc, tone: "text-warning", soft: "bg-warning-soft" },
  ];

  return (
    <div className="bg-canvas min-h-screen">
      <AppNav agentName={agentName} role="ADMIN" />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex items-end justify-between">
          <div className="animate-fade-up">
            <h1 className="text-3xl font-semibold tracking-tighter text-foreground">Operations</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Live system health, active calls, and session history.
            </p>
          </div>
          <span className="flex items-center gap-1.5 rounded-sm border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
            <RefreshCw className="h-3 w-3" />
            Live · 10s
          </span>
        </div>

        {/* Metrics */}
        <div className="stagger mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map(({ label, value, icon: Icon, tone, soft }) => (
            <div
              key={label}
              className="rounded-lg border border-border bg-surface p-5 elevation-1 transition-all hover:-translate-y-0.5 hover:elevation-2"
            >
              <span className={`mb-3 flex h-9 w-9 items-center justify-center rounded ${soft} ${tone}`}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="text-3xl font-semibold tracking-tighter tabular-nums text-foreground">
                {value}
              </div>
              <div className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>

        {/* Live sessions */}
        <section className="mt-10">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-success" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-subtle">
              Live sessions
            </h2>
            <Badge tone="success">{activeSessions.length} active</Badge>
          </div>

          {isLoading ? (
            <div className="space-y-2.5">
              {[0, 1].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-surface" />
              ))}
            </div>
          ) : activeSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface/50 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Radio className="h-6 w-6" />
              </span>
              <p className="mt-3 text-sm font-medium text-foreground">No active sessions</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Live calls will appear here.</p>
            </div>
          ) : (
            <div className="stagger space-y-2.5">
              {activeSessions.map((s: any) => (
                <div
                  key={s._id}
                  className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4 elevation-1"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-success-soft text-success live-ring">
                    <Radio className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{s.agentName}</span>
                      <span className="text-xs text-subtle">
                        started{" "}
                        {s.startedAt
                          ? formatDistanceToNow(new Date(s.startedAt), { addSuffix: true })
                          : "—"}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {s.participants?.map((p: any) => (
                        <span
                          key={p._id}
                          className="flex items-center gap-1.5 rounded-sm bg-muted px-1.5 py-0.5 text-[0.7rem] text-foreground"
                        >
                          <Avatar name={p.userName} size="sm" className="!h-4 !w-4 !text-[0.55rem] !rounded-sm" />
                          {p.userName}
                          <span className={p.role === "AGENT" ? "text-primary" : "text-accent"}>
                            {p.role === "AGENT" ? "· agent" : "· customer"}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="danger-soft"
                    size="sm"
                    loading={endSession.isPending}
                    onClick={() => {
                      if (confirm("Force-end this session?")) endSession.mutate(s._id);
                    }}
                  >
                    <PhoneOff className="h-3.5 w-3.5" />
                    End
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* History */}
        <section className="mt-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-subtle">
            Recent history
          </h2>
          <div className="overflow-hidden rounded-lg border border-border bg-surface elevation-1">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-left">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-subtle">Agent</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-subtle">Duration</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-subtle">Participants</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-subtle">Ended</th>
                </tr>
              </thead>
              <tbody>
                {historySessions.map((s: any) => (
                  <tr key={s._id} className="border-b border-border/60 last:border-0 transition-colors hover:bg-surface-2/60">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={s.agentName} size="sm" />
                        <span className="font-medium text-foreground">{s.agentName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 tabular-nums text-muted-foreground">
                      {s.duration ? formatDuration(s.duration) : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{s.participants?.length ?? 0}</td>
                    <td className="px-5 py-3.5 text-xs text-subtle">
                      {s.endedAt ? formatDistanceToNow(new Date(s.endedAt), { addSuffix: true }) : "—"}
                    </td>
                  </tr>
                ))}
                {historySessions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-sm text-muted-foreground">
                      No completed sessions yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
