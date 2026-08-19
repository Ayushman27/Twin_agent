import { cn } from "../../lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("px-2 py-0.5 rounded-md text-xs bg-muted", className)} {...props} />;
}
