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

export function PeriodFilter({
  selectedPeriod,
  onPeriodChange,
}: PeriodFilterProps) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg bg-secondary p-1">
      {periods.map((period) => (
        <Button
          key={period.label}
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-3 text-xs font-medium rounded-md transition-all",
            selectedPeriod === period.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-transparent",
          )}
          onClick={() => onPeriodChange(period.value)}
        >
          {period.label}
        </Button>
      ))}
    </div>
  );
}
