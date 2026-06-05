"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type NavLinkProps = {
  href: string;
  label: string;
  icon?: LucideIcon;
  mobile?: boolean;
};

function isActivePath(pathname: string, href: string) {
  if (href === "/portfolio") return pathname === "/portfolio";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLink({ href, label, icon: Icon, mobile = false }: NavLinkProps) {
  const pathname = usePathname();
  const active = isActivePath(pathname, href);

  if (mobile) {
    return (
      <Link
        href={href}
        className={cn(
          "whitespace-nowrap rounded-md border px-3 py-1.5 text-xs transition-colors",
          active ? "border-primary/20 bg-primary/10 text-primary" : "border-transparent bg-muted text-muted-foreground hover:text-foreground"
        )}
      >
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
      aria-current={active ? "page" : undefined}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {label}
    </Link>
  );
}
