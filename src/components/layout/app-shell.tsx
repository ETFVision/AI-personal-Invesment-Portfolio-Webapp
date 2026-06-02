import Link from "next/link";
import {
  Banknote,
  Bookmark,
  BriefcaseBusiness,
  Database,
  Globe2,
  HeartPulse,
  Home,
  Landmark,
  Layers3,
  LogOut,
  Newspaper,
  PlusCircle,
  Search,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Table2
} from "lucide-react";
import { signOutAction } from "@/server/actions/authActions";
import { Button } from "@/components/ui/button";

const navGroups = [
  {
    label: "Dashboard",
    items: [{ href: "/portfolio", label: "Dashboard", icon: Home }]
  },
  {
    label: "Portfolio",
    items: [
      { href: "/holdings", label: "Holdings", icon: Table2 },
      { href: "/transactions", label: "Transactions", icon: PlusCircle },
      { href: "/cash", label: "Cash", icon: Banknote }
    ]
  },
  {
    label: "Instruments",
    items: [
      { href: "/instruments/universe", label: "Universe", icon: Layers3 },
      { href: "/instruments/watchlist", label: "Watchlist", icon: Bookmark }
    ]
  },
  {
    label: "Research",
    items: [
      { href: "/market-vision", label: "Market Vision", icon: Globe2 },
      { href: "/news", label: "News & Themes", icon: Newspaper },
      { href: "/risk", label: "Risk", icon: ShieldCheck },
      { href: "/bonds", label: "Fixed Income", icon: Landmark },
      { href: "/portfolio#benchmarks", label: "Benchmarks", icon: BriefcaseBusiness },
      { href: "/recommendations", label: "Recommendations", icon: Sparkles }
    ]
  },
  {
    label: "Admin",
    items: [
      { href: "/setup/taxonomy", label: "Taxonomy", icon: Search },
      { href: "/admin/data-sources", label: "Data Sources", icon: Database },
      { href: "/admin/jobs", label: "Jobs", icon: ServerCog },
      { href: "/admin/system-health", label: "System Health", icon: HeartPulse }
    ]
  }
];

const mobileNavItems = navGroups.flatMap((group) => group.items);

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r bg-card p-4 md:flex">
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">AI Portfolio</p>
          <h1 className="text-lg font-semibold">Investment cockpit</h1>
        </div>
        <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="px-3 text-xs font-medium uppercase text-muted-foreground">{group.label}</p>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <form action={signOutAction} className="pt-4">
          <Button type="submit" variant="outline" className="w-full">
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </form>
      </aside>
      <div className="md:pl-64">
        <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center justify-between">
            <span className="font-semibold">AI Portfolio</span>
            <form action={signOutAction}>
              <Button type="submit" variant="ghost" size="icon" aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {mobileNavItems.map((item) => (
              <Link key={item.href} href={item.href} className="whitespace-nowrap rounded-md bg-muted px-3 py-1.5 text-xs">
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
