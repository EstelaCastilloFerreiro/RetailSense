import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatNumber, formatCurrency, formatPercentage } from "@/lib/utils";

interface KPICardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  trend?: "up" | "down" | "neutral";
  format?: "currency" | "percentage" | "number";
}

export default function KPICard({
  label,
  value,
  change,
  changeLabel,
  trend,
  format = "number",
}: KPICardProps) {
  const getTrendColor = () => {
    if (!trend) return "text-muted-foreground";
    if (trend === "up") return "text-green-600 dark:text-green-500";
    if (trend === "down") return "text-red-600 dark:text-red-500";
    return "text-muted-foreground";
  };

  const getTrendIcon = () => {
    if (trend === "up") return <TrendingUp className="h-4 w-4" />;
    if (trend === "down") return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const formatValue = (val: string | number) => {
    if (typeof val === "string") return val;
    if (format === "currency") return formatCurrency(val);
    if (format === "percentage") return formatPercentage(val);
    return formatNumber(val);
  };

  return (
    <Card className="p-6" data-testid={`card-kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-2xl font-bold font-mono" data-testid={`text-value-${label.toLowerCase().replace(/\s+/g, "-")}`}>
          {formatValue(value)}
        </p>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="font-medium">
              {change > 0 ? "+" : ""}
              {change}%
            </span>
            {changeLabel && (
              <span className="text-muted-foreground ml-1">{changeLabel}</span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
