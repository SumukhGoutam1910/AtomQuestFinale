"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Mail, Lock, ArrowRight, Video, MessageSquare, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Logo } from "@/components/ui/Logo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) toast.error("Invalid email or password");
    else {
      toast.success("Welcome back");
      router.push("/dashboard");
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* ── Left: brand panel ─────────────────────────────────────────── */}
      <aside className="relative hidden overflow-hidden bg-foreground lg:flex lg:flex-col lg:justify-between">
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(to right, hsl(0 0% 100% / 0.6) 1px, transparent 1px), linear-gradient(to bottom, hsl(0 0% 100% / 0.6) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 80% 80% at 50% 40%, black, transparent)",
          }}
        />
        <div className="absolute -left-24 top-1/3 h-96 w-96 rounded-full bg-primary/30 blur-[120px]" />
        <div className="absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-accent/30 blur-[120px]" />

        <div className="relative z-10 p-10">
          <Logo size="md" className="[&_span]:text-white" />
        </div>

        <div className="relative z-10 p-10">
          <h1 className="max-w-md text-4xl font-semibold leading-[1.1] tracking-tighter text-white">
            See the problem.
            <br />
            <span className="text-gradient">Solve it live.</span>
          </h1>
          <p className="mt-4 max-w-sm text-[0.95rem] leading-relaxed text-white/60">
            Self-hosted video support that puts your agents in the room — face to face,
            screen to screen, in real time.
          </p>

          <div className="mt-10 flex flex-col gap-3">
            {[
              { icon: Video, label: "HD video routed through your own SFU" },
              { icon: MessageSquare, label: "Live chat, file sharing & recording" },
              { icon: ShieldCheck, label: "Role-based access — agent & customer" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 text-sm text-white/80">
                <span className="flex h-9 w-9 items-center justify-center rounded border border-white/10 bg-white/5">
                  <Icon className="h-4 w-4 text-primary" />
                </span>
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 p-10 text-xs text-white/40">
          AtomQuest Hackathon 1.0 · Grand Finale
        </div>
      </aside>

      {/* ── Right: form ───────────────────────────────────────────────── */}
      <main className="bg-canvas flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-8 lg:hidden">
            <Logo size="md" />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Agent sign in
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Access your support dashboard and start sessions.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="agent@company.com"
                icon={<Mail />}
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                icon={<Lock />}
              />
            </div>

            <Button type="submit" size="lg" loading={loading} className="w-full group">
              Sign in
              {!loading && (
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              )}
            </Button>
          </form>

          <div className="mt-6 rounded-md border border-dashed border-border-strong bg-surface-2 p-3.5 text-center">
            <p className="text-xs font-medium text-muted-foreground">Demo credentials · password123</p>
            <p className="mt-1 font-mono text-xs text-foreground">
              admin@atomberg.com · priya@atomberg.com
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
