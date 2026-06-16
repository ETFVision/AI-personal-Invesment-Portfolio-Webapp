import { createContainer } from "@/server/container";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await createContainer().authProvider.requireAdmin();
  return children;
}
