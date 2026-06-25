import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  className?: string;
  iconClassName?: string;
  children?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  label,
  description,
  className,
  iconClassName,
  children,
}: EmptyStateProps): React.JSX.Element {
  return (
    <div className={cn("flex flex-col items-center gap-2 py-8 text-center", className)}>
      <Icon className={cn("h-8 w-8 text-muted-foreground", iconClassName)} />
      <p className="text-sm text-muted-foreground">{label}</p>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {children}
    </div>
  );
}
