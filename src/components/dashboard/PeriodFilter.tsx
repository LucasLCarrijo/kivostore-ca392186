import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const periods: Array<{ label: string; value: number | "custom" }> = [
  { label: "7D", value: 7 },
  { label: "14D", value: 14 },
  { label: "30D", value: 30 },
  { label: "Custom", value: "custom" },
];

interface PeriodFilterProps {
  selectedPeriod: number | "custom";
  onPeriodChange: (period: number | "custom") => void;
}

export function PeriodFilter({ selectedPeriod, onPeriodChange }: PeriodFilterProps) {
  return (
    <div className="flex gap-1 p-1 bg-white border border-border/50 rounded-lg shadow-sm">
      {periods.map((period) => (
        <Button
          key={period.label}
          variant="ghost"
          size="sm"
          className={cn(
            "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
            selectedPeriod === period.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
          onClick={() => onPeriodChange(period.value)}
        >
          {period.label}
        </Button>
      ))}
    </div>
  );
}