import { Card } from "@/components/ui/card";

interface OTBMetric {
  label: string;
  value: string | number;
  unit?: string;
}

interface OTBMetricsProps {
  metrics: OTBMetric[];
}

export default function OTBMetrics({ metrics }: OTBMetricsProps) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">OTB Metrics</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {metrics.map((metric, index) => (
          <div key={index} className="space-y-1" data-testid={`metric-${metric.label.toLowerCase().replace(/\s+/g, "-")}`}>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {metric.label}
            </p>
            <p className="text-2xl font-bold font-mono">
              {typeof metric.value === "number"
                ? metric.value.toLocaleString()
                : metric.value}
              {metric.unit && (
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  {metric.unit}
                </span>
              )}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
