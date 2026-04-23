import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "../../lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", {
  variants: {
    variant: {
      default: "bg-bg-secondary text-text-primary font-jetbrains-mono",
      secondary: "bg-bg-secondary text-text-secondary font-jetbrains-mono",
      warning: "bg-bg-warning text-text-warning font-jetbrains-mono",
      destructive: "bg-bg-destructive text-text-destructive font-jetbrains-mono",
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
