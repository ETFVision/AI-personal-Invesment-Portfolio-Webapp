import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "icon";
};

const variants = {
  default: "bg-slate-950 text-white shadow-sm hover:bg-slate-800",
  secondary: "bg-slate-900 text-white shadow-sm hover:bg-slate-800",
  outline: "border border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-50",
  ghost: "text-slate-700 hover:bg-slate-100",
  destructive: "bg-rose-700 text-white hover:bg-rose-800"
};

const sizes = {
  default: "h-10 px-4 py-2",
  sm: "h-9 px-3",
  icon: "h-10 w-10"
};

export function Button({ className, variant = "default", size = "default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
