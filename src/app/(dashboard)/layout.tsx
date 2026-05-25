import { AppShell } from "@/components/layout/app-shell";
import { createContainer } from "@/server/container";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await createContainer().authProvider.requireUser();
  return <AppShell>{children}</AppShell>;
}

