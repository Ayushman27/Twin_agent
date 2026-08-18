import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
}

export function Button({ className, variant = "default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "px-3 py-1.5 rounded-md text-sm transition-colors",
        variant === "default" && "bg-primary text-white hover:opacity-90",
        variant === "outline" && "border border-border hover:bg-muted",
        variant === "ghost" && "hover:bg-muted",
        className,
      )}
      {...props}
    />
  );
}
