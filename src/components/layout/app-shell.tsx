import Link from "next/link";
import { Activity, BarChart3, Banknote, Bookmark, Globe2, Home, Landmark, Layers3, LogOut, Newspaper, PlusCircle, Settings, ShieldCheck, Table2 } from "lucide-react";
import { signOutAction } from "@/server/actions/authActions";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/portfolio", label: "Dashboard", icon: Home },
  { href: "/market-vision", label: "Market Vision", icon: Globe2 },
  { href: "/macro", label: "Macro", icon: Activity },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/cash", label: "Cash", icon: Banknote },
  { href: "/holdings", label: "Holdings", icon: Table2 },
  { href: "/transactions", label: "Transactions", icon: PlusCircle },
  { href: "/portfolio#allocation", label: "Allocation", icon: BarChart3 },
  { href: "/risk", label: "Risk", icon: ShieldCheck },
  { href: "/bonds", label: "Bonds", icon: Landmark },
  { href: "/universe", label: "Universe", icon: Layers3 },
  { href: "/watchlists", label: "Watchlists", icon: Bookmark },
  { href: "/setup", label: "Settings", icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-card p-4 md:block">
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">AI Portfolio</p>
          <h1 className="text-lg font-semibold">Investment cockpit</h1>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={signOutAction} className="absolute bottom-4 left-4 right-4">
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
            {navItems.map((item) => (
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
