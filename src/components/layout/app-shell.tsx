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
  Activity,
  Bot,
  Search,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Table2,
  WalletCards
} from "lucide-react";
import { signOutAction } from "@/server/actions/authActions";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/layout/nav-link";
import { PortfolioAssistantDrawer } from "@/components/assistant/portfolio-assistant-drawer";
import { ETFVisionLogo } from "@/components/brand/etfvision-logo";
import { DisclaimerModal } from "@/components/compliance/DisclaimerModal";

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
      { href: "/recommendations", label: "Insights", icon: Sparkles },
      { href: "/portfolio-review", label: "Portfolio Review", icon: ClipboardCheck },
      { href: "/assistant", label: "Assistant", icon: Bot },
      { href: "/telemetry", label: "Telemetry", icon: Activity }
    ]
  },
  {
    label: "Admin",
    items: [
      { href: "/setup/taxonomy", label: "Taxonomy", icon: Search },
      { href: "/admin/data-sources", label: "Data Sources", icon: Database },
      { href: "/admin/assistant-usage", label: "AI Usage", icon: WalletCards },
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
        <div className="mb-6 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
          <ETFVisionLogo variant="dark" priority className="w-full object-contain" />
          <div className="border-t border-white/10 px-4 py-3">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-teal-200">Portfolio intelligence platform</p>
            <p className="mt-1 text-xs leading-5 text-slate-300">Risk, research, insights and market context.</p>
          </div>
        </div>
        <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="px-3 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-teal-200">{group.label}</p>
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
            <ETFVisionLogo variant="light" priority className="h-12 w-32 object-contain object-left" />
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
        <PortfolioAssistantDrawer />
      </div>
      <DisclaimerModal mode="acknowledgement" />
    </div>
  );
}
