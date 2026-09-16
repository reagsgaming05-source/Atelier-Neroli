import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-forest-500/20 disabled:cursor-not-allowed disabled:opacity-60";

const variants = {
  primary: "bg-forest-800 text-cream-50 hover:bg-forest-700",
  secondary: "border border-ink-900/15 bg-transparent text-ink-900 hover:border-ink-900/40 hover:bg-white",
  light: "bg-cream-50 text-forest-900 hover:bg-white",
  outlineLight: "border border-cream-50/40 text-cream-50 hover:bg-cream-50/10",
  ghost: "text-forest-700 hover:bg-forest-50",
  danger: "border border-danger/30 text-danger hover:bg-danger/5",
} as const;

const sizes = {
  sm: "h-10 px-4 text-sm",
  md: "h-12 px-6 text-[15px]",
  lg: "h-14 px-8 text-base",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type StyleProps = { variant?: ButtonVariant; size?: ButtonSize };

export function Button({ variant, size, className, ...props }: ComponentProps<"button"> & StyleProps) {
  return <button className={buttonClasses(variant, size, className)} {...props} />;
}

export function ButtonLink({ variant, size, className, ...props }: ComponentProps<typeof Link> & StyleProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
