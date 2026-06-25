import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  loading: boolean;
  description?: string;
  variant?: "hero";
}

export function StatCard({
  label,
  value,
  icon,
  loading,
  description,
  variant,
}: StatCardProps): React.JSX.Element {
  const isHero = variant === "hero";
  return (
    <Card className={isHero ? "bg-primary/8 ring-1 ring-primary/20" : undefined}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className={`text-sm font-medium ${isHero ? "text-amber-950" : ""}`}>
          {label}
        </CardTitle>
        <span className={isHero ? "text-primary" : "text-muted-foreground"}>{icon}</span>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className={`text-2xl font-bold ${isHero ? "text-amber-950" : ""}`}>{value}</p>
        )}
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}
