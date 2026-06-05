"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type NavLinkProps = {
  href: string;
  label: string;
  children?: ReactNode;
  mobile?: boolean;
};

function isActivePath(pathname: string, href: string) {
  if (href === "/portfolio") return pathname === "/portfolio";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLink({ href, label, children, mobile = false }: NavLinkProps) {
  const pathname = usePathname();
  const active = isActivePath(pathname, href);

  if (mobile) {
    return (
      <Link
        href={href}
        className={cn(
          "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
          active ? "border-teal-200 bg-teal-50 text-teal-900" : "border-slate-200 bg-white text-slate-600 hover:text-slate-950"
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
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        active ? "bg-white/12 font-semibold text-white shadow-inner" : "text-slate-300 hover:bg-white/8 hover:text-white"
      )}
      aria-current={active ? "page" : undefined}
    >
      {children ?? label}
    </Link>
  );
}
