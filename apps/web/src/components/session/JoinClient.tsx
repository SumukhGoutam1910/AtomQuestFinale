"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Video, Mic, ArrowRight, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";

interface Props {
  sessionId: string;
  inviteToken: string;
  agentName: string;
  prefillName?: string;
}

export function JoinClient({ sessionId, inviteToken, agentName, prefillName }: Props) {
  const [name, setName] = useState(prefillName ?? "");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    sessionStorage.setItem(
      `call-identity-${sessionId}`,
      JSON.stringify({ userName: name.trim(), role: "CUSTOMER", inviteToken })
    );
    router.push(`/call/${sessionId}`);
  }

  return (
    <div className="bg-canvas relative flex min-h-screen flex-col">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />

      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <Logo size="md" />
        <span className="rounded-sm border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground">
          Secure invite
        </span>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md animate-fade-up">
          {/* Agent intro */}
          <div className="mb-6 flex items-center gap-3.5 rounded-lg border border-border bg-surface p-4 elevation-1">
            <Avatar name={agentName} size="lg" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-primary">
                You're invited
              </p>
              <p className="mt-0.5 text-[0.95rem] font-semibold tracking-tight text-foreground">
                {agentName} wants to start a video support call
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-7 elevation-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Join the call
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your name so the agent knows who they're helping.
            </p>

            <form onSubmit={handleJoin} className="mt-6 space-y-5">
              <div>
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={50}
                  autoFocus
                  placeholder="e.g. John Smith"
                  icon={<User />}
                />
              </div>

              <div className="rounded-md border border-success/20 bg-success-soft px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium text-success">
                  <CircleCheck className="h-4 w-4" />
                  Agent is ready and waiting
                </div>
                <div className="mt-2.5 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Video className="h-3.5 w-3.5" /> Camera
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Mic className="h-3.5 w-3.5" /> Microphone
                  </span>
                  <span>— allow access when prompted</span>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                loading={loading}
                disabled={!name.trim()}
                className="w-full group"
              >
                <Video className="h-4 w-4" />
                Join video call
                {!loading && (
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                )}
              </Button>
            </form>
          </div>

          <p className="mt-5 text-center text-xs text-subtle">
            No download needed · Works right in your browser
          </p>
        </div>
      </main>
    </div>
  );
}
