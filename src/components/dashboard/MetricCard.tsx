import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: number;
  prefix?: string;
  suffix?: string;
}

export function MetricCard({ title, value, icon: Icon, change, prefix = "", suffix = "" }: MetricCardProps) {
  const formattedValue = typeof value === 'number' ? value.toLocaleString() : value;
  
  return (
    <Card className="bg-white border border-border/50 shadow-sm rounded-xl hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold text-foreground">
            {prefix}{formattedValue}{suffix}
          </div>
          {change !== undefined && (
            <span
              className={cn(
                "text-xs font-medium",
                change >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              )}
            >
              {change >= 0 ? "+" : ""}{change.toFixed(1)}%
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {change !== undefined && change >= 0 ? "↗" : change !== undefined && change < 0 ? "↘" : ""}
          {" "}vs período anterior
        </p>
      </CardContent>
    </Card>
  );
}