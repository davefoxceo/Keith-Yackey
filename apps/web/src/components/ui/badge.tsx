import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
        secondary: "bg-slate-700/50 text-slate-300 border border-slate-600/50",
        success: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
        danger: "bg-rose-500/15 text-rose-400 border border-rose-500/20",
        outline: "border border-slate-600 text-slate-300",
        gold: "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/30",
        tier: "bg-gradient-to-r from-amber-600 to-yellow-500 text-slate-900 font-bold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
