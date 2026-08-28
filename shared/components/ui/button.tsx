import * as React from "react";
import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

const sizes: Record<"sm" | "md" | "lg", string> = {
  sm: "px-3 py-1.5 text-[10px]",
  md: "px-4 py-2",
  lg: "px-8 py-4",
};

const variants: Record<"primary" | "secondary" | "ghost", string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "bg-transparent text-on-surface-variant hover:text-primary-container transition-colors",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", children, ...props }: ButtonProps, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "font-label-caps text-label-caps inline-flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export { Button };
