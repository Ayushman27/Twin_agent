import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "secondary" | "destructive" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "md" | "lg" | "icon";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", children, ...props }, ref) => {
    const sizes = {
      default: "px-4 py-2 text-xs",
      sm: "px-3 py-1.5 text-[10px]",
      md: "px-4 py-2 text-xs",
      lg: "px-6 py-3 text-sm",
      icon: "p-2 w-8 h-8",
    };

    const variants = {
      default: "bg-primary-container text-black hover:bg-primary-fixed-dim font-bold shadow-[0_0_10px_rgba(0,255,65,0.2)]",
      primary: "bg-primary-container text-black hover:bg-primary-fixed-dim font-bold shadow-[0_0_10px_rgba(0,255,65,0.2)]",
      secondary: "bg-surface-container-high border border-border-tech text-on-surface hover:bg-surface-container",
      destructive: "bg-error-container text-on-error hover:bg-error-container/80",
      outline: "border border-border-tech bg-transparent text-on-surface hover:border-primary-container hover:text-primary-container",
      ghost: "bg-transparent text-on-surface-variant hover:text-primary-container transition-colors",
      link: "bg-transparent text-primary-container underline hover:text-primary-fixed-dim p-0",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "font-code-sm inline-flex items-center justify-center gap-2 rounded-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed",
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
