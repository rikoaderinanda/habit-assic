import { AdminTabs } from "@/components/layout/admin-tabs";
import { AppShell } from "@/components/layout/app-shell";
import { requireAdmin } from "@/server/guards";

/** Every /admin page is ADMIN-only; USER is redirected to /dashboard. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <AppShell user={admin}>
      <AdminTabs />
      {children}
    </AppShell>
  );
}
