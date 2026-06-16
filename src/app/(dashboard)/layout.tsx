import { AppShell } from "@/components/layout/app-shell";
import { createContainer } from "@/server/container";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const container = createContainer();
  const { isAdmin } = await container.authProvider.requireUserWithAdminFlag();
  return <AppShell isAdmin={isAdmin}>{children}</AppShell>;
}
