"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import {
  UserPlus, Users2, Mail, Lock, User, Trash2, KeyRound,
  Power, PowerOff, Hash,
} from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { Input, Label } from "@/components/ui/Input";
import { KpiPanel } from "@/components/KpiPanel";
import type { TeamMember, AgentKpi } from "@supportvision/types";

function kpiFor(a: TeamMember): AgentKpi {
  return (
    a.kpi ?? {
      agentId: a._id,
      agentName: a.name,
      feedbackCount: 0,
      overall: 0,
      averages: { handling: 0, courteousness: 0, promptness: 0 },
    }
  );
}

export function TeamClient({ agentName }: { agentName: string }) {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);

  // form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { data: agents = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ["agents"],
    queryFn: async () => (await axios.get("/api/admin/agents")).data.data,
  });

  const createAgent = useMutation({
    mutationFn: async () =>
      (await axios.post("/api/admin/agents", { name, email, password })).data,
    onSuccess: (res) => {
      if (res.success) {
        qc.invalidateQueries({ queryKey: ["agents"] });
        toast.success("Agent added");
        setAddOpen(false);
        setName(""); setEmail(""); setPassword("");
      } else toast.error(res.error ?? "Failed");
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? "Failed to add"),
  });

  const updateAgent = useMutation({
    mutationFn: async (payload: { id: string; body: Record<string, unknown> }) =>
      (await axios.patch(`/api/admin/agents/${payload.id}`, payload.body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agents"] });
      toast.success("Updated");
      setEditing(null);
      setPassword("");
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? "Failed to update"),
  });

  const deleteAgent = useMutation({
    mutationFn: async (id: string) => (await axios.delete(`/api/admin/agents/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agents"] });
      toast.success("Agent removed");
    },
    onError: () => toast.error("Failed to remove"),
  });

  const activeCount = agents.filter((a) => a.isActive).length;

  return (
    <div className="bg-canvas min-h-screen">
      <AppNav agentName={agentName} role="ADMIN" />

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent-soft px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide text-accent">
              <Users2 className="h-3 w-3" /> Team
            </span>
            <h1 className="mt-3 text-2xl font-semibold tracking-tighter text-foreground sm:text-3xl">
              Atomberg support team
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Add, edit, or remove support agents. Each gets their own login and only sees sessions you assign them.
            </p>
          </div>
          <Button size="lg" className="shrink-0" onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Add agent
          </Button>
        </div>

        {/* Stats */}
        <div className="stagger mt-6 grid grid-cols-2 gap-3 sm:gap-4">
          <StatTile icon={Users2} tone="text-accent" soft="bg-accent-soft" label="Total agents" value={agents.length} />
          <StatTile icon={Power} tone="text-success" soft="bg-success-soft" label="Active" value={activeCount} />
        </div>

        {/* List */}
        <div className="mt-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-subtle">Support agents</h2>

          {isLoading ? (
            <div className="space-y-2.5">
              {[0, 1].map((i) => (
                <div key={i} className="h-[68px] animate-pulse rounded-lg border border-border bg-surface" />
              ))}
            </div>
          ) : agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface/50 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Users2 className="h-6 w-6" />
              </span>
              <p className="mt-3 text-sm font-medium text-foreground">No agents yet</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Add your first support agent to start assigning sessions.</p>
              <Button className="mt-4" onClick={() => setAddOpen(true)}>
                <UserPlus className="h-4 w-4" /> Add agent
              </Button>
            </div>
          ) : (
            <div className="stagger grid grid-cols-1 gap-3 lg:grid-cols-2">
              {agents.map((a) => (
                <div
                  key={a._id}
                  className="rounded-xl border border-border bg-surface p-4 elevation-1 transition-all hover:border-border-strong hover:elevation-2"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={a.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-foreground">{a.name}</h3>
                        {a.isActive ? (
                          <Badge tone="success" dot>Active</Badge>
                        ) : (
                          <Badge tone="neutral">Disabled</Badge>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{a.email}</span>
                        <span className="flex items-center gap-1"><Hash className="h-3 w-3" />{a.sessionCount ?? 0} sessions</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <IconBtn
                        title={a.isActive ? "Disable" : "Enable"}
                        onClick={() => updateAgent.mutate({ id: a._id, body: { isActive: !a.isActive } })}
                      >
                        {a.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      </IconBtn>
                      <IconBtn title="Edit / reset password" onClick={() => { setEditing(a); setName(a.name); setPassword(""); }}>
                        <KeyRound className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn
                        title="Remove"
                        danger
                        onClick={() => {
                          if (confirm(`Remove ${a.name}? Their past sessions stay in history.`))
                            deleteAgent.mutate(a._id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconBtn>
                    </div>
                  </div>

                  {/* KPI */}
                  <div className="mt-3 border-t border-border pt-3">
                    <KpiPanel
                      kpi={kpiFor(a)}
                      title="KPIs"
                      subtitle={`added ${formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}`}
                      bare
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add modal */}
      <Modal
        open={addOpen}
        onClose={() => !createAgent.isPending && setAddOpen(false)}
        title="Add a support agent"
        description="They'll sign in with these credentials and see only their assigned sessions."
      >
        <form onSubmit={(e) => { e.preventDefault(); createAgent.mutate(); }} className="space-y-4">
          <div>
            <Label htmlFor="a-name">Full name</Label>
            <Input id="a-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya Sharma" icon={<User />} autoFocus required />
          </div>
          <div>
            <Label htmlFor="a-email">Email</Label>
            <Input id="a-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="priya@company.com" icon={<Mail />} required />
          </div>
          <div>
            <Label htmlFor="a-pass">Temporary password</Label>
            <Input id="a-pass" type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="min 8 characters" icon={<Lock />} minLength={8} required />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setAddOpen(false)} disabled={createAgent.isPending}>Cancel</Button>
            <Button type="submit" loading={createAgent.isPending}><UserPlus className="h-4 w-4" /> Add agent</Button>
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={!!editing}
        onClose={() => !updateAgent.isPending && setEditing(null)}
        title={`Edit ${editing?.name ?? ""}`}
        description="Update their name or reset their password."
      >
        {editing && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const body: Record<string, unknown> = { name };
              if (password) body.password = password;
              updateAgent.mutate({ id: editing._id, body });
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="e-name">Full name</Label>
              <Input id="e-name" value={name} onChange={(e) => setName(e.target.value)} icon={<User />} required />
            </div>
            <div>
              <Label htmlFor="e-pass">New password</Label>
              <Input id="e-pass" type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="leave blank to keep current" icon={<Lock />} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)} disabled={updateAgent.isPending}>Cancel</Button>
              <Button type="submit" loading={updateAgent.isPending}>Save changes</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function StatTile({
  icon: Icon, tone, soft, label, value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  soft: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 elevation-1 sm:p-5">
      <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${soft} ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="mt-3 text-3xl font-semibold tracking-tighter tabular-nums text-foreground sm:text-4xl">{value}</div>
      <div className="mt-0.5 text-sm font-medium text-muted-foreground">{label}</div>
    </div>
  );
}

function IconBtn({
  children, onClick, title, danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`flex h-9 w-9 items-center justify-center rounded transition-colors ${
        danger
          ? "text-muted-foreground hover:bg-danger-soft hover:text-danger"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
