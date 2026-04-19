import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Hi-tech input: mono font, neon focus ring + glow, prompt-style left caret.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <span
          aria-hidden
          className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 font-mono text-xs text-primary/70 select-none"
        >
          &gt;
        </span>
        <input
          type={type}
          ref={ref}
          className={cn(
            "flex h-9 w-full rounded-sm border border-border bg-input pl-6 pr-3 py-1",
            "font-mono text-sm text-foreground caret-primary",
            "placeholder:text-muted-foreground/70 placeholder:font-mono placeholder:text-xs placeholder:uppercase placeholder:tracking-widest",
            "transition-[box-shadow,border-color] duration-150",
            "focus-visible:outline-none focus-visible:border-primary",
            "focus-visible:shadow-[0_0_0_1px_var(--primary),0_0_16px_color-mix(in_oklab,var(--primary)_45%,transparent)]",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
