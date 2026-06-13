"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-200 ease-out-expo focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-primary-hover elevation-primary hover:-translate-y-0.5",
        accent:
          "bg-accent text-accent-foreground hover:bg-accent-hover hover:-translate-y-0.5",
        outline:
          "border border-border-strong bg-surface text-foreground hover:border-primary hover:bg-primary-soft/40",
        ghost:
          "text-muted-foreground hover:bg-muted hover:text-foreground",
        danger:
          "bg-danger text-white hover:bg-danger-hover hover:-translate-y-0.5",
        "danger-soft":
          "bg-danger-soft text-danger border border-danger/20 hover:bg-danger hover:text-white",
        subtle:
          "bg-muted text-foreground hover:bg-secondary",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-sm",
        md: "h-10 px-4 text-sm rounded",
        lg: "h-12 px-6 text-[0.95rem] rounded-md",
        icon: "h-10 w-10 rounded",
        "icon-sm": "h-8 w-8 rounded-sm",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
