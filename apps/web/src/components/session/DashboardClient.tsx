"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import {
  Plus, Copy, Video, ArrowRight, Check, Radio, FileText,
  Clock, Hash, Sparkles, Search, X, User, Phone,
} from "lucide-react";
import { formatDuration } from "@/lib/utils";
import { AppNav } from "@/components/AppNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Label } from "@/components/ui/Input";
import type { Session } from "@supportvision/types";

interface Props {
  agentName: string;
  agentId: string;
  initialSessions: Session[];
}

const STATUS_TONE = {
  CREATED: "warning",
  ACTIVE: "success",
  ENDED: "neutral",
} as const;

export function DashboardClient({ agentName, initialSessions }: Props) {
  const [sessions, setSessions] = useState(initialSessions);
  const [creating, setCreating] = useState(false);
  const [invite, setInvite] = useState<{ url: string; sessionId: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [query, setQuery] = useState("");
  const router = useRouter();

  function resetForm() {
    setNameInput("");
    setCustName("");
    setCustPhone("");
  }

  async function createSession() {
    setCreating(true);
    try {
      const { data } = await axios.post("/api/session/create", {
        name: nameInput.trim(),
        customerName: custName.trim(),
        customerPhone: custPhone.trim(),
      });
      if (data.success) {
        const { session, inviteUrl } = data.data;
        setSessions((prev) => [session, ...prev]);
        setInvite({ url: inviteUrl, sessionId: session._id });
        setModalOpen(false);
        resetForm();
        toast.success("Session created");
      }
    } catch {
      toast.error("Failed to create session");
    } finally {
      setCreating(false);
    }
  }

  function copyInvite() {
    if (!invite) return;
    navigator.clipboard.writeText(invite.url);
    setCopied(true);
    toast.success("Invite link copied");
    setTimeout(() => setCopied(false), 2000);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.customerName?.toLowerCase().includes(q) ||
        s.customerPhone?.toLowerCase().includes(q) ||
        s._id.toLowerCase().includes(q) ||
        s.status.toLowerCase().includes(q)
    );
  }, [sessions, query]);

  const stats = [
    { label: "Total sessions", value: sessions.length, icon: Hash, tone: "text-foreground" },
    { label: "Active now", value: sessions.filter((s) => s.status === "ACTIVE").length, icon: Radio, tone: "text-success" },
    { label: "Completed", value: sessions.filter((s) => s.status === "ENDED").length, icon: Check, tone: "text-accent" },
  ];

  return (
    <div className="bg-canvas min-h-screen">
      <AppNav agentName={agentName} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="animate-fade-up">
            <h1 className="text-2xl font-semibold tracking-tighter text-foreground sm:text-3xl">
              Support sessions
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Create a session, share the invite, and jump on a video call.
            </p>
          </div>
          <Button onClick={() => setModalOpen(true)} size="lg" className="group">
            <Plus className="h-4 w-4" />
            New session
          </Button>
        </div>

        {/* Stats */}
        <div className="stagger mt-6 grid grid-cols-3 gap-3 sm:mt-8 sm:gap-4">
          {stats.map(({ label, value, icon: Icon, tone }) => (
            <div
              key={label}
              className="group relative overflow-hidden rounded-lg border border-border bg-surface p-3.5 elevation-1 transition-all hover:-translate-y-0.5 hover:elevation-2 sm:p-5"
            >
              <Icon className={`mb-2 h-5 w-5 sm:mb-3 ${tone}`} />
              <div className="text-2xl font-semibold tracking-tighter text-foreground tabular-nums sm:text-3xl">
                {value}
              </div>
              <div className="mt-0.5 text-[0.7rem] font-medium text-muted-foreground sm:text-xs">{label}</div>
            </div>
          ))}
        </div>

        {/* Invite banner */}
        {invite && (
          <div className="mt-6 animate-scale-in overflow-hidden rounded-lg border border-primary/25 bg-gradient-to-br from-primary-soft to-surface elevation-2">
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Invite link is ready</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">{invite.url}</p>
                </div>
              </div>
              <div className="flex gap-2 sm:ml-auto">
                <Button variant="outline" size="md" onClick={copyInvite}>
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy link"}
                </Button>
                <Button size="md" onClick={() => router.push(`/call/${invite.sessionId}`)}>
                  <Video className="h-4 w-4" />
                  Join call
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Sessions list + search */}
        <div className="mt-10">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-subtle">
              {query ? `${filtered.length} result${filtered.length === 1 ? "" : "s"}` : "Recent sessions"}
            </h2>
            <div className="w-full sm:w-72">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, customer, phone, status…"
                icon={<Search />}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {sessions.length === 0 ? (
            <EmptyState onCreate={() => setModalOpen(true)} />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface/50 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Search className="h-6 w-6" />
              </span>
              <p className="mt-3 text-sm font-medium text-foreground">No matches for “{query}”</p>
              <button
                onClick={() => setQuery("")}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover"
              >
                <X className="h-3 w-3" /> Clear search
              </button>
            </div>
          ) : (
            <div className="stagger space-y-2.5">
              {filtered.map((s) => (
                <div
                  key={s._id}
                  className="group flex items-center gap-4 rounded-lg border border-border bg-surface p-4 elevation-1 transition-all hover:border-border-strong hover:elevation-2"
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${
                      s.status === "ACTIVE"
                        ? "bg-success-soft text-success live-ring"
                        : s.status === "CREATED"
                        ? "bg-warning-soft text-[hsl(32_80%_40%)]"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s.status === "ENDED" ? <FileText className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="truncate text-sm font-semibold text-foreground">
                        {s.name || "Untitled session"}
                      </h3>
                      <Badge tone={STATUS_TONE[s.status]} dot>
                        {s.status}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-subtle">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}
                      </span>
                      {s.customerName && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <User className="h-3 w-3" />
                          {s.customerName}
                        </span>
                      )}
                      {s.customerPhone && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {s.customerPhone}
                        </span>
                      )}
                      {s.duration != null && <span>· {formatDuration(s.duration)}</span>}
                    </div>
                  </div>

                  {s.status !== "ENDED" ? (
                    <Button
                      size="sm"
                      onClick={() => router.push(`/call/${s._id}`)}
                      className="group/btn"
                    >
                      {s.status === "ACTIVE" ? "Rejoin" : "Start call"}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => router.push(`/session/${s._id}`)}>
                      View details
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* New session modal */}
      <Modal
        open={modalOpen}
        onClose={() => !creating && setModalOpen(false)}
        title="New support session"
        description="Give it a name so you can find it later."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createSession();
          }}
        >
          <Label htmlFor="session-name">Session name</Label>
          <Input
            id="session-name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="e.g. Ceiling fan — install help"
            maxLength={80}
            autoFocus
          />
          <p className="mt-1.5 text-xs text-subtle">
            Optional — defaults to “Untitled session”.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="cust-name">Customer name</Label>
              <Input
                id="cust-name"
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                placeholder="John Smith"
                maxLength={80}
                icon={<User />}
              />
            </div>
            <div>
              <Label htmlFor="cust-phone">Phone number</Label>
              <Input
                id="cust-phone"
                type="tel"
                inputMode="tel"
                value={custPhone}
                onChange={(e) => setCustPhone(e.target.value)}
                placeholder="+91 98765 43210"
                maxLength={30}
                icon={<Phone />}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setModalOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button type="submit" loading={creating}>
              <Plus className="h-4 w-4" />
              Create session
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface/50 py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <Video className="h-7 w-7" />
      </span>
      <p className="mt-4 text-base font-medium text-foreground">No sessions yet</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Create your first session to invite a customer to a video support call.
      </p>
      <Button onClick={onCreate} className="mt-5">
        <Plus className="h-4 w-4" />
        New session
      </Button>
    </div>
  );
}
