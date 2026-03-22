import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: number;
  prefix?: string;
  suffix?: string;
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  change,
  prefix = "",
  suffix = "",
}: MetricCardProps) {
  const formattedValue =
    typeof value === "number" ? value.toLocaleString() : value;

  return (
    <Card className="border-border/40 shadow-none hover:shadow-sm transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-medium text-muted-foreground">
            {title}
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <p className="text-2xl font-semibold tracking-tight text-foreground">
          {prefix}
          {formattedValue}
          {suffix}
        </p>
        {change !== undefined && (
          <div className="mt-2 flex items-center gap-1">
            {change >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
            )}
            <span
              className={cn(
                "text-xs font-medium",
                change >= 0 ? "text-emerald-600" : "text-rose-600",
              )}
            >
              {change >= 0 ? "+" : ""}
              {change.toFixed(1)}%
            </span>
            <span className="text-xs text-muted-foreground">
              vs periodo anterior
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
