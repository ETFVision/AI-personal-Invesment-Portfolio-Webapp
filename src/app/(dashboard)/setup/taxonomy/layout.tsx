import { createContainer } from "@/server/container";

export default async function TaxonomySetupLayout({ children }: { children: React.ReactNode }) {
  await createContainer().authProvider.requireAdmin();
  return children;
}
