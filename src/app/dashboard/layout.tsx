import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/server/guards";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <AppShell user={user}>{children}</AppShell>;
}
