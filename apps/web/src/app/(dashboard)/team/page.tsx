import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TeamClient } from "@/components/team/TeamClient";

export default async function TeamPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  // Agents have no business here.
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  return <TeamClient agentName={session.user.name} />;
}
