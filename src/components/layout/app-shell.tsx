import {
  Banknote,
  BarChart3,
  Bookmark,
  Database,
  Globe2,
  LineChart,
  HeartPulse,
  Home,
  Landmark,
  Layers3,
  LogOut,
  Newspaper,
  PlusCircle,
  ClipboardCheck,
  Search,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Table2
} from "lucide-react";
import { signOutAction } from "@/server/actions/authActions";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/layout/nav-link";

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
      { href: "/macro", label: "Macro", icon: LineChart },
      { href: "/fundamentals", label: "Fundamentals", icon: BarChart3 },
      { href: "/risk", label: "Risk", icon: ShieldCheck },
      { href: "/bonds", label: "Fixed Income", icon: Landmark },
      { href: "/recommendations", label: "Recommendations", icon: Sparkles },
      { href: "/portfolio-review", label: "Portfolio Review", icon: ClipboardCheck }
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
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col bg-slate-950 p-4 text-white shadow-2xl md:flex">
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-200">AI Portfolio</p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">Investment cockpit</h1>
          <p className="mt-2 text-xs leading-5 text-slate-300">Portfolio intelligence, risk, research and recommendations.</p>
        </div>
        <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="px-3 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-500">{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink key={item.href} href={item.href} label={item.label}>
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
        <form action={signOutAction} className="pt-4">
          <Button type="submit" variant="outline" className="w-full border-white/15 bg-white/[0.04] text-slate-200 hover:bg-white/10 hover:text-white">
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </form>
      </aside>
      <div className="md:pl-72">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur md:hidden">
          <div className="flex items-center justify-between">
            <span className="font-semibold">AI Portfolio</span>
            <form action={signOutAction}>
              <Button type="submit" variant="ghost" size="icon" aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {mobileNavItems.map((item) => <NavLink key={item.href} href={item.href} label={item.label} mobile />)}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 md:px-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
