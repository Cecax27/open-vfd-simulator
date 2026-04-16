import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "../../lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", {
  variants: {
    variant: {
      default: "bg-teal-100 text-teal-800",
      secondary: "bg-slate-100 text-slate-700",
      warning: "bg-amber-100 text-amber-800",
      destructive: "bg-red-100 text-red-800",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

type BadgeProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
