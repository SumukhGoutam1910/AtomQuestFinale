"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, Activity, LogOut, Users2 } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

type Role = "ADMIN" | "AGENT";

const ALL_LINKS = [
  { href: "/dashboard", label: "Sessions", icon: LayoutDashboard, roles: ["ADMIN", "AGENT"] as Role[] },
  { href: "/team", label: "Team", icon: Users2, roles: ["ADMIN"] as Role[] },
  { href: "/admin", label: "Operations", icon: Activity, roles: ["ADMIN"] as Role[] },
];

export function AppNav({ agentName, role = "AGENT" }: { agentName: string; role?: Role }) {
  const pathname = usePathname();
  const links = ALL_LINKS.filter((l) => l.roles.includes(role));

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <Link href="/dashboard" className="shrink-0">
          <Logo size="sm" showWordmark={false} />
        </Link>

        <nav className="flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3",
                  active
                    ? "bg-primary-soft text-primary-hover"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2.5">
            <Avatar name={agentName} size="sm" />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight text-foreground">{agentName}</p>
              <p className="text-[0.7rem] uppercase tracking-wide text-subtle">
                {role === "ADMIN" ? "Admin" : "Support Agent"}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex h-9 w-9 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
