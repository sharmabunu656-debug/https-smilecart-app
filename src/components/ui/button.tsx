import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Hi-tech button: mono uppercase labels, neon focus ring, glitch hover,
 * sliced corner accent. All colors via semantic tokens.
 */
const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-sm font-mono uppercase tracking-[0.14em] text-xs font-medium",
    "transition-[transform,box-shadow,background-color,color] duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "focus-visible:shadow-[0_0_0_1px_var(--ring),0_0_16px_color-mix(in_oklab,var(--ring)_60%,transparent)]",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    "hover:animate-[glitch-shift_320ms_steps(2,end)_1]",
    "active:translate-y-[1px]",
    "before:absolute before:top-0 before:left-0 before:w-2 before:h-px before:bg-current before:opacity-60",
    "after:absolute after:bottom-0 after:right-0 after:w-2 after:h-px after:bg-current after:opacity-60",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border border-primary/60 shadow-[0_0_0_1px_var(--primary),0_0_18px_color-mix(in_oklab,var(--primary)_45%,transparent)] hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground border border-destructive/60 shadow-[0_0_18px_color-mix(in_oklab,var(--destructive)_45%,transparent)] hover:bg-destructive/90",
        outline:
          "border border-primary/60 bg-transparent text-primary hover:bg-primary/10 hover:shadow-[0_0_18px_color-mix(in_oklab,var(--primary)_35%,transparent)]",
        secondary:
          "border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:border-primary/40",
        ghost:
          "before:hidden after:hidden text-foreground hover:bg-accent/15 hover:text-accent",
        link:
          "before:hidden after:hidden text-primary underline-offset-4 hover:underline hover:text-primary",
        neon:
          "bg-neon text-neon-foreground border border-neon/60 shadow-[0_0_0_1px_var(--neon),0_0_18px_color-mix(in_oklab,var(--neon)_45%,transparent)] hover:bg-neon/90",
        accent:
          "bg-accent text-accent-foreground border border-accent/60 shadow-[0_0_0_1px_var(--accent),0_0_18px_color-mix(in_oklab,var(--accent)_45%,transparent)] hover:bg-accent/90",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-sm px-3 text-[10px]",
        lg: "h-11 rounded-sm px-6 text-sm",
        icon: "h-9 w-9 before:hidden after:hidden",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
